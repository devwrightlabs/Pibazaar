import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React from "react";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  amount_pi: number;
  status: string;
  created_at: string;
  listing?: { title: string; images: string[] };
}

async function fetchOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from("escrow")
    .select("*, listing:listings(title, images)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data as Order[]) ?? [];
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  completed: "#22C55E",
  cancelled: "#EF4444",
  refunded: "#888888",
};

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.pi_uid],
    queryFn: () => fetchOrders(user?.pi_uid ?? ""),
    enabled: !!user,
  });

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
          <EmptyState icon="lock" title="Sign in to view orders" />
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
            }}
            ListEmptyComponent={
              <EmptyState
                icon="shopping-bag"
                title="No orders yet"
                subtitle="Your purchases and sales will appear here"
              />
            }
            renderItem={({ item }) => (
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
                      {item.listing?.title || "Order"}
                    </Text>
                    <Text
                      style={[styles.orderId, { color: colors.mutedForeground }]}
                    >
                      #{item.id.slice(0, 8)}
                    </Text>
                  </View>
                  <Text style={[styles.price, { color: colors.gold }]}>
                    π {item.amount_pi}
                  </Text>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <View
                    style={[
                      styles.status,
                      {
                        backgroundColor:
                          (STATUS_COLOR[item.status] || "#888") + "22",
                        borderRadius: 20,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLOR[item.status] || "#888" },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  orderId: { fontSize: 11, marginTop: 2 },
  price: { fontSize: 17, fontWeight: "700" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: { fontSize: 12 },
  status: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
