import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Listing } from "@/lib/api/types";

export type { Listing } from "@/lib/api/types";

interface Props {
  listing: Listing;
}

export function ListingCard({ listing }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    router.push(`/product/${listing.id}`);
  };

  const imageUri = listing.images?.[0];
  const location = [listing.city, listing.country].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.secondary,
          borderRadius: colors.radius + 4,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noImage]}>
          <Feather name="image" size={32} color={colors.mutedForeground} />
        </View>
      )}

      {/* Bottom gradient scrim for legible text over media */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.5, 1]}
        style={styles.scrim}
      />

      {listing.isBoosted && (
        <View style={[styles.boostBadge, { backgroundColor: colors.gold }]}>
          <Feather name="zap" size={10} color="#000" />
          <Text style={styles.boostText}>Boosted</Text>
        </View>
      )}

      <View style={[styles.pricePill, { backgroundColor: colors.gold }]}>
        <Text style={styles.priceText}>π {listing.priceInPi}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        {location ? (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color="rgba(255,255,255,0.85)" />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ListingCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.secondary, borderRadius: colors.radius + 4 },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.secondary }]} />
      <View style={styles.info}>
        <View
          style={[styles.skeletonLine, { backgroundColor: colors.border, width: "80%" }]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border, width: "40%", marginTop: 6 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.78,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  noImage: { alignItems: "center", justifyContent: "center" },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  boostBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  boostText: { fontSize: 9, fontWeight: "800", color: "#000" },
  pricePill: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  priceText: { fontSize: 12, fontWeight: "800", color: "#000" },
  info: { padding: 10, gap: 3 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  location: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    flexShrink: 1,
  },
  skeletonLine: { height: 12, borderRadius: 4 },
});
