import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useEscrows } from "@/lib/api/hooks";
import type { Escrow, EscrowStatus } from "@/lib/api/types";

const STATUS_COLOR: Record<EscrowStatus, string> = {
  pending: "#F59E0B",
  funded: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#06B6D4",
  released: "#22C55E",
  completed: "#22C55E",
  auto_released: "#22C55E",
  disputed: "#EF4444",
  cancelled: "#888888",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Tab = "buyer" | "seller";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("buyer");

  const { data, isLoading } = useEscrows(tab);
  const escrows = data?.escrows ?? [];

  const renderItem = ({ item }: { item: Escrow }) => {
    const color = STATUS_COLOR[item.status] || "#888";
    return (
      <Pressable
        onPress={() => router.push(`/orders/${item.id}`)}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text
              style={[styles.orderTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Order #{item.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>
              {item.releaseType.replace("_", " ")} · {timeAgo(item.createdAt)}
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.gold }]}>
            π {item.amountPi.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <View
            style={[
              styles.status,
              { backgroundColor: color + "22", borderRadius: 20 },
            ]}
          >
            <Text style={[styles.statusText, { color }]}>
              {item.status.replace("_", " ")}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "My Orders",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!user ? (
          <View style={styles.center}>
            <EmptyState
              icon="lock"
              title="Sign in to view orders"
              subtitle="Track your purchases and sales"
            />
            <Pressable
              onPress={() => router.push("/login")}
              style={[
                styles.signInBtn,
                { backgroundColor: colors.gold, borderRadius: colors.radius },
              ]}
            >
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[styles.segment, { borderBottomColor: colors.border }]}
            >
              {(["buyer", "seller"] as Tab[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[
                    styles.segmentBtn,
                    tab === t && { borderBottomColor: colors.gold },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          tab === t ? colors.gold : colors.mutedForeground,
                        fontWeight: tab === t ? "700" : "500",
                      },
                    ]}
                  >
                    {t === "buyer" ? "Buying" : "Selling"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : (
              <FlatList
                data={escrows}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  padding: 16,
                  gap: 12,
                  flexGrow: 1,
                  paddingBottom:
                    Platform.OS === "web" ? 34 : insets.bottom + 24,
                }}
                ListEmptyComponent={
                  <EmptyState
                    icon="shopping-bag"
                    title={
                      tab === "buyer" ? "No purchases yet" : "No sales yet"
                    }
                    subtitle={
                      tab === "buyer"
                        ? "Items you buy will appear here"
                        : "Items you sell will appear here"
                    }
                  />
                }
                renderItem={renderItem}
              />
            )}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInText: { fontSize: 15, fontWeight: "700", color: "#000" },
  segment: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentText: { fontSize: 15 },
  card: {
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardInfo: { flex: 1, marginRight: 12 },
  orderTitle: { fontSize: 15, fontWeight: "600" },
  orderMeta: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  price: { fontSize: 17, fontWeight: "700" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  status: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
