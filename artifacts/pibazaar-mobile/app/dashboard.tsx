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
import type { Listing } from "@/components/ListingCard";

async function fetchMyListings(userId: string): Promise<Listing[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Listing[]) ?? [];
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E",
  sold: "#F0C040",
  removed: "#EF4444",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ["my-listings", user?.uid],
    queryFn: () => fetchMyListings(user?.uid ?? ""),
    enabled: !!user,
  });

  const active = listings.filter((l) => l.status === "active").length;
  const sold = listings.filter((l) => l.status === "sold").length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "My Dashboard",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/create")}
              style={{ marginRight: 4 }}
            >
              <Feather name="plus" size={24} color={colors.gold} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!user ? (
          <EmptyState icon="lock" title="Sign in to view your dashboard" />
        ) : (
          <>
            <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
              <StatCard
                label="Active"
                value={active}
                color={STATUS_COLOR.active}
                colors={colors}
              />
              <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
              <StatCard
                label="Sold"
                value={sold}
                color={STATUS_COLOR.sold}
                colors={colors}
              />
              <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
              <StatCard
                label="Total"
                value={listings.length}
                color={colors.text}
                colors={colors}
              />
            </View>

            {isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : (
              <FlatList
                data={listings}
                keyExtractor={(item) => item.id}
                onRefresh={refetch}
                refreshing={isLoading}
                contentContainerStyle={{
                  padding: 16,
                  gap: 10,
                  paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
                }}
                ListEmptyComponent={
                  <EmptyState
                    icon="package"
                    title="No listings yet"
                    subtitle="Tap + to create your first listing"
                  />
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push(`/product/${item.id}`)}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardInfo}>
                        <Text
                          style={[styles.cardTitle, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={[styles.cardPrice, { color: colors.gold }]}>
                          π {item.price_in_pi}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
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
          </>
        )}
      </View>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    gap: 4,
  },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  dividerV: { width: StyleSheet.hairlineWidth },
  card: {
    padding: 14,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardPrice: { fontSize: 13, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
