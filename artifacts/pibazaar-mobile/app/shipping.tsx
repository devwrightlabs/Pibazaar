import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import {
  SERVICE_SECTIONS,
  SHIPPING_DISCLAIMER,
  filterCouriers,
  groupByRange,
  type Courier,
} from "@/lib/shipping-data";

export default function ShippingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  // Pure client-side directory — no backend / external API calls.
  const grouped = useMemo(() => groupByRange(filterCouriers(query)), [query]);
  const hasResults = useMemo(
    () => Object.values(grouped).some((list) => list.length > 0),
    [grouped],
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.disclaimer,
              {
                backgroundColor: colors.gold + "1A",
                borderColor: colors.gold,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="info" size={20} color={colors.gold} />
            <Text style={[styles.disclaimerText, { color: colors.text }]}>
              {SHIPPING_DISCLAIMER}
            </Text>
          </View>

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
              value={query}
              onChangeText={setQuery}
              placeholder="Filter by region or carrier (e.g. US, EU, DHL)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {!hasResults ? (
            <EmptyState
              icon="truck"
              title="No carriers found"
              subtitle="Try a different region or clear the filter."
            />
          ) : (
            SERVICE_SECTIONS.map(({ range, label, hint }) => {
              const carriers = grouped[range];
              if (!carriers.length) return null;
              return (
                <View key={range} style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {label}
                  </Text>
                  <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                    {hint}
                  </Text>
                  {carriers.map((carrier) => (
                    <CarrierRow key={carrier.id} carrier={carrier} colors={colors} />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

function CarrierRow({
  carrier,
  colors,
}: {
  carrier: Courier;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(carrier.websiteUrl)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.logoWrap,
          { backgroundColor: colors.gold + "1A", borderRadius: colors.radius },
        ]}
      >
        <Feather name="truck" size={22} color={colors.gold} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {carrier.name}
          </Text>
          <View
            style={[
              styles.regionPill,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.regionText, { color: colors.mutedForeground }]}>
              {carrier.region}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {carrier.description}
        </Text>
        <View style={styles.visit}>
          <Text style={[styles.visitText, { color: colors.gold }]}>
            Open carrier site
          </Text>
          <Feather name="external-link" size={13} color={colors.gold} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  section: { gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionHint: { fontSize: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  logoWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  regionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  regionText: { fontSize: 10, fontWeight: "700" },
  description: { fontSize: 12, lineHeight: 16 },
  visit: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  visitText: { fontSize: 13, fontWeight: "600" },
});
