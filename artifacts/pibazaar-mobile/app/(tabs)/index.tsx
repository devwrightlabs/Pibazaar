import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { useListings } from "@/lib/api/hooks";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching, isFetching } = useListings({
    sort: "recent",
    limit: 30,
  });

  const listings = data?.listings ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.brand, { color: colors.gold }]}>PiBazaar</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Pi Network Marketplace
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/create");
            }}
            style={[
              styles.sellBtn,
              { backgroundColor: colors.gold, borderRadius: colors.radius },
            ]}
          >
            <Feather name="plus" size={16} color="#000" />
            <Text style={styles.sellBtnText}>Sell</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={Array(8).fill(null)}
          numColumns={2}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={() => <ListingCardSkeleton />}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={listings}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.grid,
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : insets.bottom + 80,
            },
          ]}
          columnWrapperStyle={styles.row}
          scrollEnabled={!!listings.length}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isFetching}
              onRefresh={refetch}
              tintColor={colors.gold}
            />
          }
          ListHeaderComponent={
            listings.length > 0 ? (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Latest listings
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="package"
              title="No listings yet"
              subtitle="Be the first to sell on PiBazaar!"
            />
          }
          renderItem={({ item }) => <ListingCard listing={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { fontSize: 12, marginTop: 1 },
  sellBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sellBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
  grid: { padding: 12, gap: 10 },
  row: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
});
