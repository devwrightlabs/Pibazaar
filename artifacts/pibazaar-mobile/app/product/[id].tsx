import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Listing } from "@/components/ListingCard";

async function fetchListing(id: string): Promise<Listing | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Listing;
}

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [imageIndex, setImageIndex] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    enabled: !!id,
  });

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : !listing ? (
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.text }}>Listing not found</Text>
          </View>
        ) : (
          <>
            <View
              style={[styles.imageContainer, { backgroundColor: colors.secondary }]}
            >
              {listing.images?.[imageIndex] ? (
                <Image
                  source={{ uri: listing.images[imageIndex] }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <Feather name="image" size={48} color={colors.mutedForeground} />
              )}
              {listing.images?.length > 1 && (
                <View style={styles.dots}>
                  {listing.images.map((_: string, i: number) => (
                    <Pressable
                      key={i}
                      onPress={() => setImageIndex(i)}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            i === imageIndex ? colors.gold : colors.mutedForeground,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {listing.images?.length > 1 && (
              <FlatList
                horizontal
                data={listing.images}
                keyExtractor={(_, i) => String(i)}
                style={[styles.thumbnailList, { backgroundColor: colors.secondary }]}
                contentContainerStyle={{ gap: 4, padding: 4 }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <Pressable onPress={() => setImageIndex(index)}>
                    <Image
                      source={{ uri: item }}
                      style={[
                        styles.thumbnail,
                        {
                          borderColor:
                            index === imageIndex ? colors.gold : "transparent",
                          borderRadius: colors.radius / 2,
                        },
                      ]}
                      contentFit="cover"
                    />
                  </Pressable>
                )}
              />
            )}

            <View style={styles.details}>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.gold }]}>
                  π {listing.price_in_pi}
                </Text>
                {listing.is_boosted && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.gold + "22" },
                    ]}
                  >
                    <Feather name="zap" size={12} color={colors.gold} />
                    <Text style={[styles.badgeText, { color: colors.gold }]}>
                      Featured
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {listing.title}
              </Text>

              {(listing.city || listing.country) && (
                <View style={styles.locationRow}>
                  <Feather
                    name="map-pin"
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[styles.location, { color: colors.mutedForeground }]}
                  >
                    {[listing.city, listing.country].filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}

              {listing.condition && (
                <View style={styles.row}>
                  <Text
                    style={[styles.metaLabel, { color: colors.mutedForeground }]}
                  >
                    Condition
                  </Text>
                  <Text
                    style={[
                      styles.metaValue,
                      {
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    {listing.condition?.replace("_", " ")}
                  </Text>
                </View>
              )}

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Description
              </Text>
              <Text
                style={[styles.description, { color: colors.text }]}
              >
                {(listing as any).description || "No description provided."}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {listing && (
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
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/chat/${listing.seller_id}`);
            }}
            style={({ pressed }) => [
              styles.contactBtn,
              {
                backgroundColor: colors.gold,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="message-circle" size={18} color="#000" />
            <Text style={styles.contactBtnText}>Contact Seller</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dots: {
    position: "absolute",
    bottom: 12,
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  thumbnailList: {
    maxHeight: 60,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderWidth: 2,
  },
  details: {
    padding: 16,
    gap: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  contactBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
