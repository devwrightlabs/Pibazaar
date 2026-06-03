import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { useListings } from "@/lib/api/hooks";
import type { Listing } from "@/lib/api/types";

type ViewMode = "grid" | "map";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [mode, setMode] = useState<ViewMode>("grid");

  const { data, isLoading, refetch, isRefetching, isFetching } = useListings({
    sort: "recent",
    limit: 30,
  });

  const listings = data?.listings ?? [];
  const bottomPad = Platform.OS === "web" ? 110 : insets.bottom + 100;

  const setView = (next: ViewMode) => {
    Haptics.selectionAsync();
    setMode(next);
  };

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

        {/* List / Map toggle — map is hidden by default to free up space. */}
        <View
          style={[
            styles.toggle,
            { backgroundColor: colors.secondary, borderRadius: colors.radius },
          ]}
        >
          <ToggleBtn
            active={mode === "grid"}
            icon="grid"
            label="Listings"
            onPress={() => setView("grid")}
            colors={colors}
          />
          <ToggleBtn
            active={mode === "map"}
            icon="map-pin"
            label="Map"
            onPress={() => setView("map")}
            colors={colors}
          />
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={Array(6).fill(null)}
          numColumns={2}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={() => <ListingCardSkeleton />}
          scrollEnabled={false}
        />
      ) : mode === "map" ? (
        <MapView listings={listings} bottomPad={bottomPad} colors={colors} />
      ) : (
        <FlatList
          data={listings}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.grid, { paddingBottom: bottomPad }]}
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

function ToggleBtn({
  active,
  icon,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleBtn,
        {
          backgroundColor: active ? colors.gold : "transparent",
          borderRadius: colors.radius - 2,
        },
      ]}
    >
      <Feather name={icon} size={15} color={active ? "#000" : colors.mutedForeground} />
      <Text
        style={[
          styles.toggleText,
          { color: active ? "#000" : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Lightweight "map" view: groups listings by their real location (city/country)
 * client-side — no map tiles or external geocoding APIs. Lets buyers see where
 * items are and jump straight to a listing.
 */
function MapView({
  listings,
  bottomPad,
  colors,
}: {
  listings: Listing[];
  bottomPad: number;
  colors: any;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Listing[]>();
    for (const l of listings) {
      const key = [l.city, l.country].filter(Boolean).join(", ") || "Location not set";
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [listings]);

  if (!groups.length) {
    return (
      <EmptyState
        icon="map-pin"
        title="No locations yet"
        subtitle="Listings with a location will appear here."
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.mapContent, { paddingBottom: bottomPad }]}
    >
      {groups.map(([place, items]) => (
        <View key={place} style={styles.mapGroup}>
          <View style={styles.mapGroupHeader}>
            <View style={[styles.pinDot, { backgroundColor: colors.gold + "22" }]}>
              <Feather name="map-pin" size={14} color={colors.gold} />
            </View>
            <Text style={[styles.mapPlace, { color: colors.text }]} numberOfLines={1}>
              {place}
            </Text>
            <View style={[styles.countPill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                {items.length}
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapRow}
          >
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/product/${item.id}`);
                }}
                style={[
                  styles.mapThumb,
                  { backgroundColor: colors.secondary, borderRadius: colors.radius },
                ]}
              >
                {item.images?.[0] ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.mapThumbImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.mapThumbImg, styles.mapThumbEmpty]}>
                    <Feather name="image" size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <Text
                  style={[styles.mapThumbTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.mapThumbPrice, { color: colors.gold }]}>
                  π {item.priceInPi}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
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
  toggle: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  toggleText: { fontSize: 13, fontWeight: "700" },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  mapContent: { padding: 16, gap: 20 },
  mapGroup: { gap: 10 },
  mapGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlace: { fontSize: 15, fontWeight: "700", flex: 1 },
  countPill: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: "center",
  },
  countText: { fontSize: 12, fontWeight: "700" },
  mapRow: { gap: 10, paddingRight: 8 },
  mapThumb: { width: 130, padding: 8, gap: 4 },
  mapThumbImg: { width: "100%", height: 100, borderRadius: 8 },
  mapThumbEmpty: { alignItems: "center", justifyContent: "center" },
  mapThumbTitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  mapThumbPrice: { fontSize: 13, fontWeight: "800" },
});
