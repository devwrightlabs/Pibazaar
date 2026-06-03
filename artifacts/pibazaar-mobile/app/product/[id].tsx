import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useListing, useStartConversation } from "@/lib/api/hooks";

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [imageIndex, setImageIndex] = useState(0);

  const { data, isLoading } = useListing(id);
  const listing = data?.listing;
  const seller = data?.seller;

  const startConversation = useStartConversation();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isOwner = !!user && !!listing && user.id === listing.sellerId;

  const handleMessageSeller = async () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const result = await startConversation.mutateAsync({
        recipientId: listing.sellerId,
        listingId: listing.id,
        content: `Hi! Is "${listing.title}" still available?`,
      });
      router.push(`/chat/${result.conversationId}`);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not start conversation."
      );
    }
  };

  const handleBuyNow = () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      router.push("/login");
      return;
    }
    router.push(`/checkout/${listing.id}`);
  };

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
            <EmptyState
              icon="alert-circle"
              title="Listing not found"
              subtitle="This listing may have been removed."
            />
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
                  π {listing.priceInPi.toFixed(2)}
                </Text>
                {listing.isBoosted && (
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

              <View style={styles.tagsRow}>
                {listing.condition && (
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.secondary,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.text }]}>
                      {listing.condition.replace("_", " ")}
                    </Text>
                  </View>
                )}
                {listing.category && (
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.secondary,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.text }]}>
                      {listing.category}
                    </Text>
                  </View>
                )}
                {listing.productType && (
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.secondary,
                        borderRadius: colors.radius / 2,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.text }]}>
                      {listing.productType}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Description
              </Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {listing.description || "No description provided."}
              </Text>

              {seller && (
                <>
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                  <Text
                    style={[styles.sectionLabel, { color: colors.mutedForeground }]}
                  >
                    Seller
                  </Text>
                  <View
                    style={[
                      styles.sellerCard,
                      {
                        backgroundColor: colors.card,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sellerAvatar,
                        { backgroundColor: colors.gold + "33" },
                      ]}
                    >
                      <Feather name="user" size={20} color={colors.gold} />
                    </View>
                    <View style={styles.sellerInfo}>
                      <View style={styles.sellerNameRow}>
                        <Text
                          style={[styles.sellerName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {seller.username}
                        </Text>
                        {seller.isVerified && (
                          <Feather
                            name="check-circle"
                            size={14}
                            color={colors.gold}
                          />
                        )}
                      </View>
                      <View style={styles.sellerMetaRow}>
                        <Feather name="star" size={12} color={colors.gold} />
                        <Text
                          style={[
                            styles.sellerMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {seller.trustScore.toFixed(1)} trust score
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
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
          {isOwner ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/dashboard");
              }}
              style={({ pressed }) => [
                styles.contactBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather name="edit-2" size={18} color={colors.text} />
              <Text style={[styles.contactBtnText, { color: colors.text }]}>
                This is your listing
              </Text>
            </Pressable>
          ) : (
            <View style={styles.ctaRow}>
              <Pressable
                onPress={handleMessageSeller}
                disabled={startConversation.isPending}
                style={({ pressed }) => [
                  styles.messageBtn,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: colors.radius,
                    opacity: pressed || startConversation.isPending ? 0.75 : 1,
                  },
                ]}
              >
                {startConversation.isPending ? (
                  <ActivityIndicator size="small" color={colors.gold} />
                ) : (
                  <>
                    <Feather
                      name="message-circle"
                      size={18}
                      color={colors.text}
                    />
                    <Text
                      style={[styles.messageBtnText, { color: colors.text }]}
                    >
                      Message
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={handleBuyNow}
                style={({ pressed }) => [
                  styles.buyBtn,
                  {
                    backgroundColor: colors.gold,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather name="shopping-bag" size={18} color="#000" />
                <Text style={styles.contactBtnText}>Buy now</Text>
              </Pressable>
            </View>
          )}
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
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: "700",
  },
  sellerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  sellerMeta: {
    fontSize: 12,
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
  ctaRow: {
    flexDirection: "row",
    gap: 10,
  },
  messageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  messageBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  buyBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
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
