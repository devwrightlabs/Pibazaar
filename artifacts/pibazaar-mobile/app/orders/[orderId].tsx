/**
 * Order Detail — PiBazaar Mobile
 *
 * Mirrors the web's /orders/:orderId route:
 * - Fetches escrow record + linked listing from Supabase (same tables as web)
 * - Shows status badge, price breakdown, buyer/seller summary, and timeline
 * - Matches the web app's status vocabulary: pending, held_in_escrow,
 *   released, refunded, cancelled
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Escrow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_pi: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EscrowWithListing extends Escrow {
  listing: {
    title: string;
    images: string[];
    price_in_pi: number;
    condition: string | null;
  } | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: keyof typeof Feather.glyphMap }
> = {
  pending: { label: "Pending payment", color: "#F59E0B", icon: "clock" },
  held_in_escrow: { label: "In escrow", color: "#3B82F6", icon: "shield" },
  released: { label: "Completed", color: "#10B981", icon: "check-circle" },
  refunded: { label: "Refunded", color: "#8B5CF6", icon: "refresh-cw" },
  cancelled: { label: "Cancelled", color: "#EF4444", icon: "x-circle" },
};

function fmtPi(val: number): string {
  return val.toFixed(4).replace(/\.?0+$/, "");
}

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

  const [order, setOrder] = useState<EscrowWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!orderId || !user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase
      .from("escrow")
      .select(
        `*, listing:listings(title, images, price_in_pi, condition)`
      )
      .eq("id", orderId)
      .or(`buyer_id.eq.${user.pi_uid},seller_id.eq.${user.pi_uid}`)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("Order not found.");
        } else {
          setOrder(data as unknown as EscrowWithListing);
        }
        setLoading(false);
      });
  }, [orderId, user]);

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[
            styles.centerContainer,
            { backgroundColor: colors.background },
          ]}
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

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[
            styles.centerContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator color={colors.gold} />
        </View>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ title: "Order Detail", headerShown: true }} />
        <View
          style={[
            styles.centerContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            {error ?? "Order not found"}
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

  const statusCfg =
    STATUS_CONFIG[order.status] ?? {
      label: order.status,
      color: colors.mutedForeground,
      icon: "circle" as keyof typeof Feather.glyphMap,
    };

  const isBuyer = order.buyer_id === user.pi_uid;
  const coverImage = order.listing?.images?.[0];
  const serviceFee = order.amount_pi * 0.02;
  const itemPrice = order.amount_pi - serviceFee;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
          headerShown: true,
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
      >
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
            <Text
              style={[styles.statusRole, { color: colors.mutedForeground }]}
            >
              You are the {isBuyer ? "buyer" : "seller"}
            </Text>
          </View>
        </View>

        {order.listing && (
          <View
            style={[
              styles.itemCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View
              style={[
                styles.itemImageBox,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              {coverImage ? (
                <Image
                  source={{ uri: coverImage }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <Feather
                  name="image"
                  size={28}
                  color={colors.mutedForeground}
                />
              )}
            </View>
            <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
              <Text
                style={[styles.itemTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {order.listing.title}
              </Text>
              {order.listing.condition && (
                <Text
                  style={[
                    styles.itemCondition,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {order.listing.condition.replace("_", " ")}
                </Text>
              )}
            </View>
          </View>
        )}

        <View
          style={[
            styles.breakdownCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text
            style={[styles.sectionLabel, { color: colors.mutedForeground }]}
          >
            Payment
          </Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownKey, { color: colors.text }]}>
              Item price
            </Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>
              π {fmtPi(itemPrice)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text
              style={[
                styles.breakdownKey,
                { color: colors.mutedForeground },
              ]}
            >
              Service fee (2%)
            </Text>
            <Text
              style={[
                styles.breakdownVal,
                { color: colors.mutedForeground },
              ]}
            >
              π {fmtPi(serviceFee)}
            </Text>
          </View>
          <View
            style={[
              styles.breakdownDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownTotal, { color: colors.text }]}>
              Total
            </Text>
            <Text
              style={[styles.breakdownTotalVal, { color: colors.gold }]}
            >
              π {fmtPi(order.amount_pi)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.timelineCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text
            style={[styles.sectionLabel, { color: colors.mutedForeground }]}
          >
            Timeline
          </Text>
          <View style={styles.timelineRow}>
            <Feather name="plus-circle" size={14} color={colors.gold} />
            <View>
              <Text style={[styles.timelineLabel, { color: colors.text }]}>
                Order created
              </Text>
              <Text
                style={[
                  styles.timelineDate,
                  { color: colors.mutedForeground },
                ]}
              >
                {fmtDate(order.created_at)}
              </Text>
            </View>
          </View>
          {order.updated_at !== order.created_at && (
            <View style={styles.timelineRow}>
              <Feather
                name="refresh-cw"
                size={14}
                color={colors.mutedForeground}
              />
              <View>
                <Text
                  style={[styles.timelineLabel, { color: colors.text }]}
                >
                  Last updated
                </Text>
                <Text
                  style={[
                    styles.timelineDate,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {fmtDate(order.updated_at)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text
          style={[styles.orderId, { color: colors.mutedForeground }]}
        >
          Order ID: {order.id}
        </Text>
      </ScrollView>
    </>
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
  statusRole: { fontSize: 12, marginTop: 2 },
  itemCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  itemImageBox: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  itemCondition: { fontSize: 12 },
  breakdownCard: { padding: 16, gap: 10, borderWidth: 1 },
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
  breakdownVal: { fontSize: 14 },
  breakdownDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  breakdownTotal: { fontSize: 15, fontWeight: "700" },
  breakdownTotalVal: { fontSize: 18, fontWeight: "800" },
  timelineCard: { padding: 16, gap: 12, borderWidth: 1 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  timelineLabel: { fontSize: 13, fontWeight: "600" },
  timelineDate: { fontSize: 12, marginTop: 2 },
  orderId: { fontSize: 11, textAlign: "center" },
});
