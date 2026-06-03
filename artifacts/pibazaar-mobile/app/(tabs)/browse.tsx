import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { useListings } from "@/lib/api/hooks";
import type { ListingCondition } from "@/lib/api/types";

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Services", "Digital", "Vehicles", "Other"];

const CONDITIONS: { label: string; value: ListingCondition | "all" }[] = [
  { label: "Any", value: "all" },
  { label: "New", value: "new" },
  { label: "Like new", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
];

const SORTS: { label: string; value: "recent" | "price_asc" | "price_desc" }[] = [
  { label: "Recent", value: "recent" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
];

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [condition, setCondition] = useState<ListingCondition | "all">("all");
  const [minPriceText, setMinPriceText] = useState("");
  const [maxPriceText, setMaxPriceText] = useState("");
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [priceFilter, setPriceFilter] = useState<{ min?: number; max?: number }>({});
  useEffect(() => {
    const t = setTimeout(() => {
      const min = Number(minPriceText);
      const max = Number(maxPriceText);
      setPriceFilter({
        min: minPriceText.trim() && min >= 0 ? min : undefined,
        max: maxPriceText.trim() && max >= 0 ? max : undefined,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [minPriceText, maxPriceText]);

  const { data, isLoading } = useListings({
    q: debouncedSearch || undefined,
    category: category === "All" ? undefined : category.toLowerCase(),
    condition: condition === "all" ? undefined : condition,
    minPrice: priceFilter.min,
    maxPrice: priceFilter.max,
    sort,
    limit: 50,
  });

  const listings = data?.listings ?? [];

  const activeFilterCount =
    (condition !== "all" ? 1 : 0) +
    (priceFilter.min != null ? 1 : 0) +
    (priceFilter.max != null ? 1 : 0) +
    (sort !== "recent" ? 1 : 0);

  const clearFilters = () => {
    setCondition("all");
    setMinPriceText("");
    setMaxPriceText("");
    setSort("recent");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        <Text style={[styles.heading, { color: colors.text }]}>Browse</Text>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              onClear={() => setSearch("")}
            />
          </View>
          <Pressable
            onPress={() => setShowFilters((s) => !s)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: showFilters || activeFilterCount > 0 ? colors.primary : colors.secondary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather
              name="sliders"
              size={18}
              color={showFilters || activeFilterCount > 0 ? colors.primaryForeground : colors.mutedForeground}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.gold }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    item === category ? colors.primary : colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryText,
                  {
                    color:
                      item === category
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    fontWeight: item === category ? "700" : "400",
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          )}
        />

        {showFilters && (
          <View style={[styles.filterPanel, { borderTopColor: colors.border }]}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>
              Condition
            </Text>
            <View style={styles.pillRow}>
              {CONDITIONS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setCondition(c.value)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: condition === c.value ? colors.primary : colors.secondary,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: condition === c.value ? colors.primaryForeground : colors.mutedForeground,
                      fontSize: 13,
                      fontWeight: condition === c.value ? "700" : "400",
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>
              Price (π)
            </Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[
                  styles.priceInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                value={minPriceText}
                onChangeText={setMinPriceText}
                placeholder="Min"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
              <Text style={{ color: colors.mutedForeground }}>–</Text>
              <TextInput
                style={[
                  styles.priceInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
                value={maxPriceText}
                onChangeText={setMaxPriceText}
                placeholder="Max"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>
              Sort
            </Text>
            <View style={styles.pillRow}>
              {SORTS.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setSort(s.value)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: sort === s.value ? colors.primary : colors.secondary,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: sort === s.value ? colors.primaryForeground : colors.mutedForeground,
                      fontSize: 13,
                      fontWeight: sort === s.value ? "700" : "400",
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeFilterCount > 0 && (
              <Pressable onPress={clearFilters} style={styles.clearBtn}>
                <Feather name="x" size={14} color={colors.gold} />
                <Text style={[styles.clearText, { color: colors.gold }]}>
                  Clear filters
                </Text>
              </Pressable>
            )}
          </View>
        )}
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
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="No listings found"
              subtitle="Try a different search or filters"
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
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#000" },
  categoryList: {
    marginHorizontal: -0,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryText: {
    fontSize: 13,
  },
  filterPanel: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  clearText: { fontSize: 13, fontWeight: "600" },
  grid: {
    padding: 12,
    gap: 10,
  },
  row: {
    gap: 10,
  },
});
