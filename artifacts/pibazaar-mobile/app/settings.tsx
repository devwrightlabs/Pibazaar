import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Settings",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
          },
        ]}
      >
        <Section label="Appearance" colors={colors}>
          <SettingsRow colors={colors}>
            <Feather name="moon" size={20} color={colors.text} />
            <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
            <View style={{ flex: 1 }} />
            <Switch
              value={scheme === "dark"}
              thumbColor={colors.gold}
              trackColor={{ true: colors.gold + "55", false: colors.border }}
              disabled
            />
          </SettingsRow>
        </Section>

        <Section label="Privacy & Security" colors={colors}>
          <SettingsRow colors={colors}>
            <Feather name="shield" size={20} color={colors.text} />
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <Feather name="external-link" size={16} color={colors.mutedForeground} />
          </SettingsRow>
          <SettingsRow colors={colors}>
            <Feather name="file-text" size={20} color={colors.text} />
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: colors.text }]}>Terms of Service</Text>
            </View>
            <Feather name="external-link" size={16} color={colors.mutedForeground} />
          </SettingsRow>
        </Section>

        <Section label="Notifications" colors={colors}>
          <SettingsRow colors={colors}>
            <Feather name="message-circle" size={20} color={colors.text} />
            <Text style={[styles.label, { color: colors.text }]}>New Messages</Text>
            <View style={{ flex: 1 }} />
            <Switch
              value={true}
              thumbColor={colors.gold}
              trackColor={{ true: colors.gold + "55", false: colors.border }}
              disabled
            />
          </SettingsRow>
          <SettingsRow colors={colors}>
            <Feather name="shopping-bag" size={20} color={colors.text} />
            <Text style={[styles.label, { color: colors.text }]}>Order Updates</Text>
            <View style={{ flex: 1 }} />
            <Switch
              value={true}
              thumbColor={colors.gold}
              trackColor={{ true: colors.gold + "55", false: colors.border }}
              disabled
            />
          </SettingsRow>
        </Section>

        <Section label="About" colors={colors}>
          <SettingsRow colors={colors}>
            <Feather name="info" size={20} color={colors.text} />
            <View style={styles.rowText}>
              <Text style={[styles.label, { color: colors.text }]}>Version</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>1.0.0</Text>
            </View>
          </SettingsRow>
          <SettingsRow colors={colors}>
            <Feather name="zap" size={20} color={colors.gold} />
            <Text style={[styles.label, { color: colors.text }]}>Powered by Pi Network</Text>
          </SettingsRow>
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 4 },
  section: { gap: 6, marginTop: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginLeft: 4 },
  group: { borderWidth: 1, overflow: "hidden" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 15 },
  rowText: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontSize: 13 },
});
