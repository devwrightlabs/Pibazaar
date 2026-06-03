import React, { useState, useEffect } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { useListings } from "@/lib/api/hooks";

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Services", "Digital", "Vehicles", "Other"];

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useListings({
    q: debouncedSearch || undefined,
    category: category === "All" ? undefined : category.toLowerCase(),
    sort: "recent",
    limit: 50,
  });

  const listings = data?.listings ?? [];

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
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
        />
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
              subtitle="Try a different search or category"
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
  grid: {
    padding: 12,
    gap: 10,
  },
  row: {
    gap: 10,
  },
});
