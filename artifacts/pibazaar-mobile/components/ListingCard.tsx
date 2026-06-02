import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export interface Listing {
  id: string;
  title: string;
  price_in_pi: number;
  images: string[];
  city?: string;
  country?: string;
  condition?: string;
  category?: string;
  is_boosted?: boolean;
  seller_id?: string;
}

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

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {listing.is_boosted && (
        <View style={[styles.boostBadge, { backgroundColor: colors.gold }]}>
          <Feather name="zap" size={10} color="#000" />
        </View>
      )}
      <View
        style={[
          styles.imagePlaceholder,
          { backgroundColor: colors.secondary, borderRadius: colors.radius - 2 },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Feather name="image" size={28} color={colors.mutedForeground} />
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {listing.title}
        </Text>
        <Text style={[styles.price, { color: colors.gold }]}>
          π {listing.price_in_pi}
        </Text>
        {(listing.city || listing.country) && (
          <Text
            style={[styles.location, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {[listing.city, listing.country].filter(Boolean).join(", ")}
          </Text>
        )}
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
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.imagePlaceholder,
          {
            backgroundColor: colors.secondary,
            borderRadius: colors.radius - 2,
          },
        ]}
      />
      <View style={styles.info}>
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.secondary, width: "85%", height: 12 },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.secondary, width: "50%", height: 12, marginTop: 4 },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.secondary, width: "60%", height: 10, marginTop: 4 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    overflow: "hidden",
  },
  imagePlaceholder: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  boostBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 1,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  info: {
    padding: 8,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  location: {
    fontSize: 10,
    marginTop: 2,
  },
  skeletonLine: {
    borderRadius: 4,
  },
});
