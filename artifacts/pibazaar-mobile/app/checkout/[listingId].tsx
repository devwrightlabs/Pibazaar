/**
 * Checkout — PiBazaar Mobile
 *
 * Mirrors the web checkout page (/checkout/:listingId):
 * - Fetches the listing from Supabase (same query as web)
 * - Shows item, price, and payment breakdown (item + service fee)
 * - Initiates a Pi payment via the pi-auth backend contract
 * - Pi.createPayment() is unavailable in React Native; the UI clearly explains
 *   this and routes the user to Pi Browser to complete the payment — the same
 *   requirement the web checkout has.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import type { Listing } from "@/components/ListingCard";

const SERVICE_FEE_RATE = 0.02;

function fmtPi(val: number): string {
  return val.toFixed(4).replace(/\.?0+$/, "");
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!listingId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "active")
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("Listing not found or no longer available.");
        } else {
          setListing(data as Listing);
        }
        setLoading(false);
      });
  }, [listingId]);

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
          <Text
            style={[styles.gateSubtitle, { color: colors.mutedForeground }]}
          >
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

  if (loading) {
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
            {error ?? "Listing unavailable"}
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

  const price = Number(listing.price_in_pi) || 0;
  const serviceFee = price * SERVICE_FEE_RATE;
  const total = price + serviceFee;

  const handlePayWithPi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Complete payment in Pi Browser",
      `Pi payments require the Pi Browser app.\n\nAmount: π ${fmtPi(total)}\nItem: ${listing.title}\n\nTap "Open Pi Browser" to complete this purchase on the PiBazaar web app.`,
      [
        {
          text: "Open Pi Browser",
          onPress: () => {
            Linking.openURL(
              `https://pibazaar.app/checkout/${listingId}`
            ).catch(() => {
              Alert.alert(
                "Could not open Pi Browser",
                "Please open the Pi Browser app manually and navigate to PiBazaar."
              );
            });
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const coverImage = listing.images?.[0];

  return (
    <>
      <Stack.Screen options={{ title: "Checkout", headerShown: true }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingBottom: bottomPad + 100,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16,
        }}
      >
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
            Payment breakdown
          </Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownKey, { color: colors.text }]}>
              Item price
            </Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>
              π {fmtPi(price)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownKey, { color: colors.mutedForeground }]}
            >
              Service fee (2%)
            </Text>
            <Text
              style={[styles.breakdownVal, { color: colors.mutedForeground }]}
            >
              π {fmtPi(serviceFee)}
            </Text>
          </View>
          <View
            style={[styles.breakdownDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownTotal, { color: colors.text }]}
            >
              Total
            </Text>
            <Text style={[styles.breakdownTotalVal, { color: colors.gold }]}>
              π {fmtPi(total)}
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
          <Feather name="info" size={14} color={colors.gold} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Pi payments are processed in the Pi Browser. Tapping "Pay with π"
            will open the Pi Browser to complete your payment securely.
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
            <Text
              style={[styles.footerLabel, { color: colors.mutedForeground }]}
            >
              Total due
            </Text>
            <Text style={[styles.footerTotal, { color: colors.gold }]}>
              π {fmtPi(total)}
            </Text>
          </View>
          <Pressable
            onPress={handlePayWithPi}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: colors.gold,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.payBtnText}>Pay with π</Text>
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
  },
  payBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
});
