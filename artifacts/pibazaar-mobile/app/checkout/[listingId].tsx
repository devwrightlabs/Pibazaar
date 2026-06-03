/**
 * Checkout — PiBazaar Mobile
 *
 * Escrow checkout over the Express api-server:
 * - Fetches the listing via useListing(listingId) for the order summary.
 * - Derives releaseType from the listing's productType:
 *     digital  -> "digital"
 *     physical -> "shipping"  (buyer picks / adds a shipping address)
 *     service  -> "local_meetup"
 * - Confirm creates an escrow (useCreateEscrow) then routes to /orders/:id.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
import {
  useAddresses,
  useCreateAddress,
  useCreateEscrow,
  useListing,
} from "@/lib/api/hooks";
import type { Address, ProductType, ReleaseType } from "@/lib/api/types";

const PLATFORM_FEE_RATE = 0.02;

function releaseTypeFor(productType: ProductType): ReleaseType {
  if (productType === "digital") return "digital";
  if (productType === "service") return "local_meetup";
  return "shipping";
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { user } = useAuth();

  const { data, isLoading, error } = useListing(listingId);
  const listing = data?.listing;

  const releaseType: ReleaseType = listing
    ? releaseTypeFor(listing.productType)
    : "shipping";

  const addressesQuery = useAddresses();
  const addresses = addressesQuery.data?.addresses ?? [];
  const createAddress = useCreateAddress();
  const createEscrow = useCreateEscrow();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    streetAddress: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "",
    phoneNumber: "",
  });

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const price = listing?.priceInPi ?? 0;
  const platformFee = useMemo(() => price * PLATFORM_FEE_RATE, [price]);
  const total = price + platformFee;

  const effectiveAddressId =
    selectedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  const handleAddAddress = async () => {
    if (!form.fullName.trim() || !form.streetAddress.trim() || !form.city.trim() || !form.countryCode.trim()) {
      Alert.alert("Missing fields", "Full name, street, city and country code are required.");
      return;
    }
    try {
      const res = await createAddress.mutateAsync({
        fullName: form.fullName.trim(),
        streetAddress: form.streetAddress.trim(),
        city: form.city.trim(),
        stateProvince: form.stateProvince.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        countryCode: form.countryCode.trim().toUpperCase(),
        phoneNumber: form.phoneNumber.trim() || undefined,
      });
      setSelectedAddressId(res.address.id);
      setShowAddForm(false);
      setForm({
        fullName: "",
        streetAddress: "",
        city: "",
        stateProvince: "",
        postalCode: "",
        countryCode: "",
        phoneNumber: "",
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save address.");
    }
  };

  const handleConfirm = async () => {
    if (!listing) return;
    if (releaseType === "shipping" && !effectiveAddressId) {
      Alert.alert("Address required", "Please add or select a shipping address.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await createEscrow.mutateAsync({
        listingId: listing.id,
        releaseType,
        shippingAddressId:
          releaseType === "shipping" ? effectiveAddressId ?? undefined : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/orders/${res.escrow.id}`);
    } catch (e: any) {
      Alert.alert("Checkout failed", e?.message || "Could not create the order.");
    }
  };

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: "Checkout", headerShown: true }} />
        <View
          style={[
            styles.centerContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            Sign in to check out
          </Text>
          <Text style={[styles.gateSubtitle, { color: colors.mutedForeground }]}>
            You need a Pi account to make purchases on PiBazaar.
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
        <Stack.Screen options={{ title: "Checkout", headerShown: true }} />
        <View
          style={[styles.centerContainer, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator color={colors.gold} />
        </View>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <Stack.Screen options={{ title: "Checkout", headerShown: true }} />
        <View
          style={[styles.centerContainer, { backgroundColor: colors.background }]}
        >
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            Listing unavailable
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

  const coverImage = listing.images?.[0];

  return (
    <>
      <Stack.Screen options={{ title: "Checkout", headerShown: true }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingBottom: bottomPad + 120,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Item summary */}
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
              <Feather name="image" size={28} color={colors.mutedForeground} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {listing.title}
            </Text>
            {listing.condition && (
              <Text
                style={[styles.itemCondition, { color: colors.mutedForeground }]}
              >
                {listing.condition.replace("_", " ")}
              </Text>
            )}
          </View>
        </View>

        {/* Delivery method */}
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Delivery method
          </Text>
          <View style={styles.methodRow}>
            <Feather
              name={
                releaseType === "digital"
                  ? "download"
                  : releaseType === "local_meetup"
                    ? "map-pin"
                    : "truck"
              }
              size={18}
              color={colors.gold}
            />
            <Text style={[styles.methodText, { color: colors.text }]}>
              {releaseType === "digital"
                ? "Digital delivery"
                : releaseType === "local_meetup"
                  ? "Local meetup"
                  : "Shipping"}
            </Text>
          </View>
        </View>

        {/* Shipping address (physical only) */}
        {releaseType === "shipping" && (
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
              Shipping address
            </Text>

            {addressesQuery.isLoading ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              addresses.map((addr: Address) => {
                const selected = effectiveAddressId === addr.id;
                return (
                  <Pressable
                    key={addr.id}
                    onPress={() => setSelectedAddressId(addr.id)}
                    style={[
                      styles.addressRow,
                      {
                        borderColor: selected ? colors.gold : colors.border,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={18}
                      color={selected ? colors.gold : colors.mutedForeground}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addressName, { color: colors.text }]}>
                        {addr.fullName}
                      </Text>
                      <Text
                        style={[
                          styles.addressLine,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {addr.streetAddress}, {addr.city}
                        {addr.stateProvince ? `, ${addr.stateProvince}` : ""} ·{" "}
                        {addr.countryCode}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            {showAddForm ? (
              <View style={styles.addForm}>
                {(
                  [
                    ["fullName", "Full name"],
                    ["streetAddress", "Street address"],
                    ["city", "City"],
                    ["stateProvince", "State / Province (optional)"],
                    ["postalCode", "Postal code (optional)"],
                    ["countryCode", "Country code (e.g. US)"],
                    ["phoneNumber", "Phone (optional)"],
                  ] as [keyof typeof form, string][]
                ).map(([key, placeholder]) => (
                  <TextInput
                    key={key}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                    value={form[key]}
                    onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize={key === "countryCode" ? "characters" : "sentences"}
                  />
                ))}
                <View style={styles.formActions}>
                  <Pressable
                    onPress={() => setShowAddForm(false)}
                    style={styles.formCancel}
                  >
                    <Text
                      style={[styles.formCancelText, { color: colors.mutedForeground }]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddAddress}
                    disabled={createAddress.isPending}
                    style={[
                      styles.formSave,
                      { backgroundColor: colors.gold, borderRadius: colors.radius / 2 },
                    ]}
                  >
                    {createAddress.isPending ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.formSaveText}>Save address</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowAddForm(true)}
                style={styles.addAddressBtn}
              >
                <Feather name="plus" size={16} color={colors.gold} />
                <Text style={[styles.addAddressText, { color: colors.gold }]}>
                  Add new address
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Payment breakdown */}
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Payment breakdown
          </Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownKey, { color: colors.text }]}>
              Item price
            </Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>
              π {price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownKey, { color: colors.mutedForeground }]}>
              Platform fee (2%)
            </Text>
            <Text
              style={[styles.breakdownVal, { color: colors.mutedForeground }]}
            >
              π {platformFee.toFixed(2)}
            </Text>
          </View>
          <View
            style={[styles.breakdownDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownTotal, { color: colors.text }]}>
              Total
            </Text>
            <Text style={[styles.breakdownTotalVal, { color: colors.gold }]}>
              π {total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.gold + "14",
              borderColor: colors.gold + "40",
              borderRadius: colors.radius / 2,
            },
          ]}
        >
          <Feather name="shield" size={14} color={colors.gold} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Funds are held in escrow and released to the seller once you confirm
            delivery.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 12,
          },
        ]}
      >
        <View style={styles.footerRow}>
          <View>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
              Total due
            </Text>
            <Text style={[styles.footerTotal, { color: colors.gold }]}>
              π {total.toFixed(2)}
            </Text>
          </View>
          <Pressable
            onPress={handleConfirm}
            disabled={createEscrow.isPending}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: colors.gold,
                borderRadius: colors.radius,
                opacity: createEscrow.isPending || pressed ? 0.85 : 1,
              },
            ]}
          >
            {createEscrow.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.payBtnText}>Confirm order</Text>
            )}
          </Pressable>
        </View>
      </View>
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
  gateSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  ctaBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  ctaBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 14, fontWeight: "600" },
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
  itemInfo: { flex: 1, gap: 4, justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  itemCondition: { fontSize: 12 },
  breakdownCard: {
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  methodText: { fontSize: 15, fontWeight: "600" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  addressName: { fontSize: 14, fontWeight: "600" },
  addressLine: { fontSize: 12, marginTop: 2 },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addAddressText: { fontSize: 14, fontWeight: "600" },
  addForm: { gap: 8, marginTop: 4 },
  input: {
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  formCancel: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center" },
  formCancelText: { fontSize: 14, fontWeight: "600" },
  formSave: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  formSaveText: { fontSize: 14, fontWeight: "700", color: "#000" },
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
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  footerLabel: { fontSize: 12 },
  footerTotal: { fontSize: 22, fontWeight: "800" },
  payBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: "center",
  },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
});
