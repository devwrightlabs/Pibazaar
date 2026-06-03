import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useDashboard, useDeleteListing, useMyListings } from "@/lib/api/hooks";
import type { Listing } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E",
  draft: "#F59E0B",
  sold: "#F0C040",
  scheduled: "#3B82F6",
  removed: "#EF4444",
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: dashboard,
    isLoading: dashLoading,
    refetch: refetchDash,
  } = useDashboard();
  const {
    data: listingsData,
    isLoading: listingsLoading,
    refetch: refetchListings,
  } = useMyListings();
  const deleteListing = useDeleteListing();

  const listings = listingsData?.listings ?? [];

  const handleDelete = (item: Listing) => {
    Alert.alert(
      "Delete listing",
      `Remove "${item.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteListing.mutate(item.id, {
              onError: (e: any) =>
                Alert.alert("Error", e?.message || "Failed to delete listing."),
            }),
        },
      ]
    );
  };

  const refetch = () => {
    refetchDash();
    refetchListings();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "My Dashboard",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerRight: () =>
            user ? (
              <Pressable
                onPress={() => router.push("/create")}
                style={{ marginRight: 4 }}
              >
                <Feather name="plus" size={24} color={colors.gold} />
              </Pressable>
            ) : null,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!user ? (
          <View style={styles.center}>
            <EmptyState
              icon="lock"
              title="Sign in to view your dashboard"
              subtitle="Manage your listings and sales"
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
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            onRefresh={refetch}
            refreshing={listingsLoading || dashLoading}
            contentContainerStyle={{
              padding: 16,
              gap: 10,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
            }}
            ListHeaderComponent={
              <View style={styles.headerWrap}>
                {dashLoading && !dashboard ? (
                  <View style={styles.statsLoading}>
                    <ActivityIndicator color={colors.gold} />
                  </View>
                ) : (
                  <View style={styles.statsGrid}>
                    <StatCard
                      icon="grid"
                      label="Active"
                      value={dashboard?.activeListings ?? 0}
                      colors={colors}
                    />
                    <StatCard
                      icon="edit-3"
                      label="Drafts"
                      value={dashboard?.draftListings ?? 0}
                      colors={colors}
                    />
                    <StatCard
                      icon="trending-up"
                      label="Sales"
                      value={dashboard?.sales ?? 0}
                      colors={colors}
                    />
                    <StatCard
                      icon="shopping-bag"
                      label="Purchases"
                      value={dashboard?.purchases ?? 0}
                      colors={colors}
                    />
                    <StatCard
                      icon="shield"
                      label="Active escrows"
                      value={dashboard?.activeEscrows ?? 0}
                      colors={colors}
                    />
                    <StatCard
                      icon="dollar-sign"
                      label="Revenue"
                      value={`π ${(dashboard?.revenuePi ?? 0).toFixed(2)}`}
                      colors={colors}
                      highlight
                    />
                  </View>
                )}
                <Text style={[styles.listHeader, { color: colors.text }]}>
                  My Listings
                </Text>
              </View>
            }
            ListEmptyComponent={
              listingsLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.gold} />
                </View>
              ) : (
                <EmptyState
                  icon="package"
                  title="No listings yet"
                  subtitle="Tap + to create your first listing"
                />
              )
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
                      π {item.priceInPi.toFixed(2)}
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
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleDelete(item)}
                    style={styles.deleteBtn}
                  >
                    <Feather
                      name="trash-2"
                      size={18}
                      color={colors.destructive}
                    />
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  colors,
  highlight,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number | string;
  colors: any;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={highlight ? colors.gold : colors.mutedForeground}
      />
      <Text
        style={[
          styles.statValue,
          { color: highlight ? colors.gold : colors.text },
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInText: { fontSize: 15, fontWeight: "700", color: "#000" },
  headerWrap: { gap: 16, marginBottom: 6 },
  statsLoading: { paddingVertical: 32, alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "31.5%",
    flexGrow: 1,
    minWidth: 100,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  listHeader: { fontSize: 16, fontWeight: "700" },
  card: {
    padding: 14,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardInfo: { flex: 1, marginRight: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardPrice: { fontSize: 13, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  deleteBtn: { padding: 4 },
});
