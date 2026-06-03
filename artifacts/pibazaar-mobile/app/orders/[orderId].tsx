/**
 * Order Detail — PiBazaar Mobile
 *
 * Escrow detail + lifecycle actions over the Express api-server.
 * Lifecycle: pending → funded → shipped → delivered → released/completed
 * (plus auto_released, disputed, cancelled).
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { escrowApi } from "@/lib/api/client";
import { useCreateReview, useEscrow, useEscrowAction } from "@/lib/api/hooks";
import type { Escrow, EscrowStatus } from "@/lib/api/types";
import { createPiPayment, isPiAvailable } from "@/lib/pi";

const STATUS_CONFIG: Record<
  EscrowStatus,
  { label: string; color: string; icon: keyof typeof Feather.glyphMap }
> = {
  pending: { label: "Pending payment", color: "#F59E0B", icon: "clock" },
  funded: { label: "Funded — in escrow", color: "#3B82F6", icon: "shield" },
  shipped: { label: "Shipped", color: "#8B5CF6", icon: "truck" },
  delivered: { label: "Delivered", color: "#06B6D4", icon: "package" },
  released: { label: "Completed", color: "#10B981", icon: "check-circle" },
  completed: { label: "Completed", color: "#10B981", icon: "check-circle" },
  auto_released: { label: "Auto-released", color: "#10B981", icon: "check-circle" },
  disputed: { label: "Disputed", color: "#EF4444", icon: "alert-triangle" },
  cancelled: { label: "Cancelled", color: "#888888", icon: "x-circle" },
};

const TIMELINE: { status: EscrowStatus; label: string }[] = [
  { status: "pending", label: "Order created" },
  { status: "funded", label: "Payment funded" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
  { status: "released", label: "Funds released" },
];

const TIMELINE_ORDER: EscrowStatus[] = [
  "pending",
  "funded",
  "shipped",
  "delivered",
  "released",
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();

  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useEscrow(orderId);
  const escrow = data?.escrow;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Lifecycle action mutations
  const shipAction = useEscrowAction(
    (args: { trackingNumber?: string; shippingCarrier?: string }) =>
      escrowApi.ship(orderId, args)
  );
  const confirmAction = useEscrowAction(() => escrowApi.confirm(orderId));
  const meetupReleaseAction = useEscrowAction((code: string) =>
    escrowApi.meetupRelease(orderId, code)
  );
  const milestoneAction = useEscrowAction((milestoneId: string) =>
    escrowApi.releaseMilestone(orderId, milestoneId)
  );
  const disputeAction = useEscrowAction((reason: string) =>
    escrowApi.dispute(orderId, reason)
  );
  const cancelAction = useEscrowAction(() => escrowApi.cancel(orderId));
  const createReview = useCreateReview();

  // Local form state
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [meetupCode, setMeetupCode] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [sellerMeetupCode, setSellerMeetupCode] = useState<string | null>(null);
  const [funding, setFunding] = useState<
    "idle" | "creating" | "approving" | "completing"
  >("idle");

  const anyPending =
    shipAction.isPending ||
    confirmAction.isPending ||
    meetupReleaseAction.isPending ||
    milestoneAction.isPending ||
    disputeAction.isPending ||
    cancelAction.isPending;

  const handleError = (e: any) =>
    Alert.alert("Action failed", e?.message || "Something went wrong.");

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[styles.centerContainer, { backgroundColor: colors.background }]}
        >
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            Sign in to view orders
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={[
              styles.ctaBtn,
              { backgroundColor: colors.gold, borderRadius: colors.radius },
            ]}
          >
            <Text style={styles.ctaBtnText}>Sign in with Pi</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[styles.centerContainer, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator color={colors.gold} />
        </View>
      </>
    );
  }

  if (error || !escrow) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[styles.centerContainer, { backgroundColor: colors.background }]}
        >
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            Order not found
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: colors.gold }]}>
              Go back
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  const statusCfg = STATUS_CONFIG[escrow.status] ?? {
    label: escrow.status,
    color: colors.mutedForeground,
    icon: "circle" as keyof typeof Feather.glyphMap,
  };

  const isBuyer = escrow.buyerId === user.id;
  const isSeller = escrow.sellerId === user.id;
  const itemPrice = escrow.amountPi - escrow.platformFeePi;
  const currentStep = TIMELINE_ORDER.indexOf(escrow.status);

  // ─── Action handlers ─────────────────────────────────────────────────────

  const onShip = () => {
    if (!tracking.trim() && !carrier.trim()) {
      Alert.alert(
        "Mark as shipped?",
        "No tracking info entered. Continue anyway?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark shipped",
            onPress: () =>
              shipAction.mutate(
                {
                  trackingNumber: tracking.trim() || undefined,
                  shippingCarrier: carrier.trim() || undefined,
                },
                { onError: handleError }
              ),
          },
        ]
      );
      return;
    }
    shipAction.mutate(
      {
        trackingNumber: tracking.trim() || undefined,
        shippingCarrier: carrier.trim() || undefined,
      },
      { onError: handleError }
    );
  };

  const onPayWithPi = () => {
    if (!escrow) return;
    if (!isPiAvailable()) {
      Alert.alert(
        "Pi Browser required",
        "Funding an order with Pi is only available inside the Pi Browser. Open PiBazaar in your Pi Browser to complete this payment."
      );
      return;
    }
    setFunding("creating");
    createPiPayment(
      {
        amount: escrow.amountPi,
        memo: `PiBazaar order ${escrow.id.slice(0, 8).toUpperCase()}`,
        metadata: { escrowId: escrow.id },
      },
      {
        onReadyForServerApproval: (paymentId) => {
          setFunding("approving");
          escrowApi.approve(escrow.id, paymentId).catch((e) => {
            setFunding("idle");
            handleError(e);
          });
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          setFunding("completing");
          escrowApi
            .complete(escrow.id, paymentId, txid)
            .then(() => {
              setFunding("idle");
              qc.invalidateQueries({ queryKey: ["escrows"] });
              qc.invalidateQueries({ queryKey: ["dashboard"] });
              void refetch();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Alert.alert(
                "Payment confirmed",
                "Your Pi is held securely in escrow until you confirm receipt."
              );
            })
            .catch((e) => {
              setFunding("idle");
              handleError(e);
            });
        },
        onCancel: () => setFunding("idle"),
        onError: (err) => {
          setFunding("idle");
          handleError(err);
        },
      }
    );
  };

  const onConfirm = () => {
    Alert.alert(
      "Confirm delivery",
      "This releases the escrowed funds to the seller. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release funds",
          onPress: () => confirmAction.mutate(undefined, { onError: handleError }),
        },
      ]
    );
  };

  const onShowMeetupCode = async () => {
    try {
      const res = await escrowApi.meetupCode(orderId);
      setSellerMeetupCode(res.code);
    } catch (e) {
      handleError(e);
    }
  };

  const onMeetupRelease = () => {
    if (!meetupCode.trim()) {
      Alert.alert("Code required", "Enter the meetup code from the buyer.");
      return;
    }
    meetupReleaseAction.mutate(meetupCode.trim(), { onError: handleError });
  };

  const onReleaseMilestone = (milestoneId: string) => {
    Alert.alert("Release milestone", "Release funds for this milestone?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Release",
        onPress: () =>
          milestoneAction.mutate(milestoneId, { onError: handleError }),
      },
    ]);
  };

  const onDispute = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Open dispute",
        "Describe the issue:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit",
            style: "destructive",
            onPress: (reason?: string) =>
              disputeAction.mutate((reason ?? "").trim() || "Dispute opened", {
                onError: handleError,
              }),
          },
        ],
        "plain-text"
      );
    } else {
      Alert.alert(
        "Open dispute",
        "This will flag the order for review. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open dispute",
            style: "destructive",
            onPress: () =>
              disputeAction.mutate("Dispute opened", { onError: handleError }),
          },
        ]
      );
    }
  };

  const onCancel = () => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: () => cancelAction.mutate(undefined, { onError: handleError }),
      },
    ]);
  };

  const onSubmitReview = () => {
    createReview.mutate(
      {
        escrowId: escrow.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      },
      {
        onError: handleError,
        onSuccess: () => {
          setReviewComment("");
          Alert.alert("Thanks!", "Your review has been submitted.");
        },
      }
    );
  };

  // ─── Derived UI flags ────────────────────────────────────────────────────

  const isComplete =
    escrow.status === "released" ||
    escrow.status === "completed" ||
    escrow.status === "auto_released";
  const canShip = isSeller && escrow.status === "funded" && escrow.releaseType === "shipping";
  // Shipping orders confirm after shipped/delivered; digital orders confirm from funded.
  // (Local-meetup uses the separate meetup-code release flow below, gated by !isMeetup.)
  const canConfirm =
    isBuyer &&
    (escrow.releaseType === "shipping"
      ? escrow.status === "shipped" || escrow.status === "delivered"
      : escrow.status === "funded");
  const isMeetup = escrow.releaseType === "local_meetup";
  // Server only allows cancellation pre-funding (pending).
  const canCancel = escrow.status === "pending";
  // Buyer funds a pending order via the Pi payment flow (Pi Browser only).
  const canFund = isBuyer && escrow.status === "pending";
  const canDispute =
    escrow.status === "funded" ||
    escrow.status === "shipped" ||
    escrow.status === "delivered";
  const canReview = isComplete;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Order #${escrow.id.slice(0, 8).toUpperCase()}`,
          headerShown: true,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: bottomPad + 40,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status header */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: statusCfg.color + "18",
              borderColor: statusCfg.color + "40",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name={statusCfg.icon} size={20} color={statusCfg.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
            <Text style={[styles.statusRole, { color: colors.mutedForeground }]}>
              You are the {isBuyer ? "buyer" : "seller"} ·{" "}
              {escrow.releaseType.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Payment */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Payment
          </Text>
          <Row label="Item price" value={`π ${itemPrice.toFixed(2)}`} colors={colors} />
          <Row
            label="Platform fee"
            value={`π ${escrow.platformFeePi.toFixed(2)}`}
            colors={colors}
            muted
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.breakdownRow}>
            <Text style={[styles.totalKey, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalVal, { color: colors.gold }]}>
              π {escrow.amountPi.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Tracking info */}
        {escrow.trackingNumber && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Shipping
            </Text>
            <Row
              label="Carrier"
              value={escrow.shippingCarrier || "—"}
              colors={colors}
            />
            <Row
              label="Tracking"
              value={escrow.trackingNumber}
              colors={colors}
            />
          </View>
        )}

        {/* Timeline */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Timeline
          </Text>
          {TIMELINE.map((step, i) => {
            const done =
              currentStep >= 0 && i <= currentStep && !["disputed", "cancelled"].includes(escrow.status);
            const isCancelledOrDisputed =
              escrow.status === "cancelled" || escrow.status === "disputed";
            return (
              <View key={step.status} style={styles.timelineRow}>
                <Feather
                  name={done ? "check-circle" : "circle"}
                  size={16}
                  color={done ? colors.gold : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.timelineLabel,
                    {
                      color: done ? colors.text : colors.mutedForeground,
                      fontWeight: done ? "600" : "400",
                    },
                  ]}
                >
                  {step.label}
                </Text>
                {i === 0 && (
                  <Text
                    style={[styles.timelineDate, { color: colors.mutedForeground }]}
                  >
                    {fmtDate(escrow.createdAt)}
                  </Text>
                )}
                {isCancelledOrDisputed && i === 0 && null}
              </View>
            );
          })}
          {(escrow.status === "disputed" || escrow.status === "cancelled") && (
            <View style={styles.timelineRow}>
              <Feather
                name={escrow.status === "disputed" ? "alert-triangle" : "x-circle"}
                size={16}
                color={statusCfg.color}
              />
              <Text style={[styles.timelineLabel, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          )}
        </View>

        {escrow.disputeReason && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: "#EF444418",
                borderColor: "#EF444440",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: "#EF4444" }]}>
              Dispute reason
            </Text>
            <Text style={[styles.disputeText, { color: colors.text }]}>
              {escrow.disputeReason}
            </Text>
          </View>
        )}

        {/* Milestones */}
        {escrow.milestones && escrow.milestones.length > 0 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Milestones
            </Text>
            {escrow.milestones.map((m) => (
              <View key={m.id} style={styles.milestoneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.milestoneTitle, { color: colors.text }]}>
                    {m.title}
                  </Text>
                  <Text
                    style={[styles.milestoneMeta, { color: colors.mutedForeground }]}
                  >
                    π {m.amountPi.toFixed(2)} · {m.status}
                  </Text>
                </View>
                {isBuyer && m.status === "pending" && (
                  <Pressable
                    onPress={() => onReleaseMilestone(m.id)}
                    disabled={anyPending}
                    style={[
                      styles.smallBtn,
                      { backgroundColor: colors.gold, borderRadius: colors.radius / 2 },
                    ]}
                  >
                    <Text style={styles.smallBtnText}>Release</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ─── Actions ─── */}

        {/* Buyer: fund pending order via Pi */}
        {canFund && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Complete payment
            </Text>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              Pay π {escrow.amountPi.toFixed(2)} to fund this order. Your Pi is
              held in escrow and only released to the seller once you confirm
              receipt.
            </Text>
            {funding !== "idle" ? (
              <View style={styles.fundingRow}>
                <ActivityIndicator color={colors.gold} />
                <Text
                  style={[styles.helpText, { color: colors.mutedForeground }]}
                >
                  {funding === "creating"
                    ? "Initiating payment…"
                    : funding === "approving"
                      ? "Waiting for server approval…"
                      : "Completing payment on the blockchain…"}
                </Text>
              </View>
            ) : (
              <ActionButton
                label={`Pay π ${escrow.amountPi.toFixed(2)} with Pi`}
                icon="credit-card"
                onPress={onPayWithPi}
                disabled={anyPending}
                colors={colors}
              />
            )}
          </View>
        )}

        {/* Seller: waiting for buyer to fund */}
        {isSeller && escrow.status === "pending" && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Awaiting payment
            </Text>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              Waiting for the buyer to fund this order. You'll be able to ship
              once payment is held in escrow.
            </Text>
          </View>
        )}

        {/* Seller: ship */}
        {canShip && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Mark as shipped
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
              value={carrier}
              onChangeText={setCarrier}
              placeholder="Carrier (e.g. DHL)"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
              value={tracking}
              onChangeText={setTracking}
              placeholder="Tracking number"
              placeholderTextColor={colors.mutedForeground}
            />
            <ActionButton
              label="Mark shipped"
              icon="truck"
              onPress={onShip}
              loading={shipAction.isPending}
              disabled={anyPending}
              colors={colors}
            />
          </View>
        )}

        {/* Buyer: confirm delivery (shipping) */}
        {canConfirm && !isMeetup && (
          <ActionButton
            label="Confirm delivery / Release funds"
            icon="check-circle"
            onPress={onConfirm}
            loading={confirmAction.isPending}
            disabled={anyPending}
            colors={colors}
          />
        )}

        {/* Local meetup */}
        {isMeetup && escrow.status === "funded" && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Local meetup
            </Text>
            {isBuyer && (
              <>
                <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
                  Show this code to the seller at meetup to release funds.
                </Text>
                {sellerMeetupCode ? (
                  <Text style={[styles.codeDisplay, { color: colors.gold }]}>
                    {sellerMeetupCode}
                  </Text>
                ) : (
                  <ActionButton
                    label="Show meetup code"
                    icon="maximize"
                    onPress={onShowMeetupCode}
                    colors={colors}
                  />
                )}
              </>
            )}
            {isSeller && (
              <>
                <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
                  Enter the buyer's meetup code to release funds.
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderRadius: colors.radius / 2,
                    },
                  ]}
                  value={meetupCode}
                  onChangeText={setMeetupCode}
                  placeholder="Meetup code"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />
                <ActionButton
                  label="Release funds"
                  icon="check-circle"
                  onPress={onMeetupRelease}
                  loading={meetupReleaseAction.isPending}
                  disabled={anyPending}
                  colors={colors}
                />
              </>
            )}
          </View>
        )}

        {/* Dispute / Cancel */}
        {(canDispute || canCancel) && (
          <View style={styles.dangerRow}>
            {canDispute && (
              <Pressable
                onPress={onDispute}
                disabled={anyPending}
                style={[
                  styles.outlineBtn,
                  { borderColor: colors.destructive, borderRadius: colors.radius },
                ]}
              >
                <Feather name="alert-triangle" size={16} color={colors.destructive} />
                <Text style={[styles.outlineBtnText, { color: colors.destructive }]}>
                  Open dispute
                </Text>
              </Pressable>
            )}
            {canCancel && (
              <Pressable
                onPress={onCancel}
                disabled={anyPending}
                style={[
                  styles.outlineBtn,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
                <Text style={[styles.outlineBtnText, { color: colors.mutedForeground }]}>
                  Cancel order
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Review */}
        {canReview && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Leave a review
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={6}>
                  <Feather
                    name="star"
                    size={28}
                    color={n <= reviewRating ? colors.gold : colors.border}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            <ActionButton
              label="Submit review"
              icon="send"
              onPress={onSubmitReview}
              loading={createReview.isPending}
              colors={colors}
            />
          </View>
        )}

        <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
          Order ID: {escrow.id}
        </Text>
      </ScrollView>
    </>
  );
}

function Row({
  label,
  value,
  colors,
  muted,
}: {
  label: string;
  value: string;
  colors: any;
  muted?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text
        style={[
          styles.breakdownKey,
          { color: muted ? colors.mutedForeground : colors.text },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.breakdownVal,
          { color: muted ? colors.mutedForeground : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: colors.gold,
          borderRadius: colors.radius,
          opacity: loading || disabled || pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <>
          <Feather name={icon} size={18} color="#000" />
          <Text style={styles.actionBtnText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  gateTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  ctaBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  ctaBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 14, fontWeight: "600" },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  statusLabel: { fontSize: 15, fontWeight: "700" },
  statusRole: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  card: { padding: 16, gap: 10, borderWidth: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownKey: { fontSize: 14 },
  breakdownVal: { fontSize: 14, fontWeight: "500" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  totalKey: { fontSize: 15, fontWeight: "700" },
  totalVal: { fontSize: 18, fontWeight: "800" },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineLabel: { fontSize: 14, flex: 1 },
  timelineDate: { fontSize: 11 },
  disputeText: { fontSize: 14, lineHeight: 19 },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  milestoneTitle: { fontSize: 14, fontWeight: "600" },
  milestoneMeta: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  smallBtnText: { fontSize: 13, fontWeight: "700", color: "#000" },
  input: {
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  helpText: { fontSize: 13, lineHeight: 18 },
  codeDisplay: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#000" },
  dangerRow: { flexDirection: "row", gap: 10 },
  fundingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 14, fontWeight: "600" },
  starsRow: { flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 4 },
  orderId: { fontSize: 11, textAlign: "center" },
});
