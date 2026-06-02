import { useQuery } from "@tanstack/react-query";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { ListingCard, ListingCardSkeleton, type Listing } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Services", "Digital", "Vehicles", "Other"];

async function fetchListings(): Promise<Listing[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as Listing[]) ?? [];
}

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "browse"],
    queryFn: fetchListings,
  });

  const filtered = useMemo(() => {
    let result = listings;
    if (category !== "All") {
      result = result.filter(
        (l) => l.category?.toLowerCase() === category.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.country?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, search, category]);

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
          data={filtered}
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
          scrollEnabled={!!filtered.length}
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
