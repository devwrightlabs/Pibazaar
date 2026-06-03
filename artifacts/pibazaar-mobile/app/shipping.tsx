import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { useShippingCarriers } from "@/lib/api/hooks";
import type { ServiceRange, ShippingCarrier } from "@/lib/api/types";

const SECTIONS: { range: ServiceRange; label: string }[] = [
  { range: "local", label: "Local" },
  { range: "regional", label: "Regional" },
  { range: "international", label: "International" },
];

export default function ShippingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState("");

  const { data, isLoading } = useShippingCarriers(
    country.trim() ? { country: country.trim() } : undefined,
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const grouped = data?.grouped;
  const hasCarriers = (data?.carriers.length ?? 0) > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 8,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Shipping carriers
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
          >
            {data?.disclaimer ? (
              <View
                style={[
                  styles.disclaimer,
                  {
                    backgroundColor: colors.destructive + "1A",
                    borderColor: colors.destructive,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather name="alert-triangle" size={20} color={colors.destructive} />
                <Text style={[styles.disclaimerText, { color: colors.text }]}>
                  {data.disclaimer}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.filter,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.filterInput, { color: colors.text }]}
                value={country}
                onChangeText={setCountry}
                placeholder="Filter by country code (e.g. US)"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
              />
              {country.length > 0 && (
                <Pressable onPress={() => setCountry("")} hitSlop={8}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {!hasCarriers ? (
              <EmptyState
                icon="truck"
                title="No carriers found"
                subtitle="Try a different country or clear the filter."
              />
            ) : (
              SECTIONS.map(({ range, label }) => {
                const carriers = grouped?.[range] ?? [];
                if (!carriers.length) return null;
                return (
                  <View key={range} style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                      {label}
                    </Text>
                    {carriers.map((carrier) => (
                      <CarrierRow key={carrier.id} carrier={carrier} colors={colors} />
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

function CarrierRow({
  carrier,
  colors,
}: {
  carrier: ShippingCarrier;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(carrier.websiteUrl)}
      style={[
        styles.row,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View
        style={[
          styles.logoWrap,
          { backgroundColor: colors.background, borderRadius: colors.radius },
        ]}
      >
        {carrier.logoUrl ? (
          <Image
            source={{ uri: carrier.logoUrl }}
            style={styles.logo}
            contentFit="contain"
          />
        ) : (
          <Feather name="truck" size={22} color={colors.gold} />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {carrier.name}
        </Text>
        {carrier.countryName ? (
          <Text style={[styles.country, { color: colors.mutedForeground }]}>
            {carrier.countryName}
          </Text>
        ) : null}
        {carrier.description ? (
          <Text
            style={[styles.description, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {carrier.description}
          </Text>
        ) : null}
        <View style={styles.visit}>
          <Text style={[styles.visitText, { color: colors.gold }]}>Visit site</Text>
          <Feather name="external-link" size={13} color={colors.gold} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  content: { padding: 16, gap: 16 },
  disclaimer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  filterInput: { flex: 1, fontSize: 14, padding: 0 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  logoWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logo: { width: 40, height: 40 },
  rowBody: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: "700" },
  country: { fontSize: 12 },
  description: { fontSize: 12, lineHeight: 16 },
  visit: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  visitText: { fontSize: 13, fontWeight: "600" },
});
