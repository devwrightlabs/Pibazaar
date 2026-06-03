import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? colors.secondary : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={20}
        color={danger ? colors.destructive : colors.text}
      />
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? colors.destructive : colors.text },
        ]}
      >
        {label}
      </Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, loginWithPi, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <View style={styles.notSignedIn}>
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Feather name="user" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>
            Welcome to PiBazaar
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.mutedForeground }]}
          >
            Sign in with your Pi account to buy, sell, and chat with the
            community.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/login");
            }}
            style={[
              styles.signInBtn,
              { backgroundColor: colors.gold, borderRadius: colors.radius },
            ]}
          >
            <Text style={[styles.signInText, { color: colors.primaryForeground }]}>
              Sign in with Pi
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: topPad + 16,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80,
        },
      ]}
    >
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatarLarge,
            { backgroundColor: colors.gold + "22" },
          ]}
        >
          <Feather name="user" size={40} color={colors.gold} />
        </View>
        <Text style={[styles.username, { color: colors.text }]}>
          {user.username}
        </Text>
        <Text style={[styles.uid, { color: colors.mutedForeground }]}>
          {user.id}
        </Text>
      </View>

      <View style={styles.section}>
        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground }]}
        >
          Account
        </Text>
        <View
          style={[
            styles.menuGroup,
            {
              borderRadius: colors.radius,
              borderColor: colors.border,
              overflow: "hidden",
            },
          ]}
        >
          <MenuItem
            icon="grid"
            label="My Listings"
            onPress={() => router.push("/dashboard")}
          />
          <MenuItem
            icon="shopping-bag"
            label="My Orders"
            onPress={() => router.push("/orders")}
          />
          <MenuItem
            icon="bell"
            label="Notifications"
            onPress={() => router.push("/notifications")}
          />
          <MenuItem
            icon="truck"
            label="Shipping carriers"
            onPress={() => router.push("/shipping")}
          />
          <MenuItem
            icon="settings"
            label="Settings"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View
          style={[
            styles.menuGroup,
            {
              borderRadius: colors.radius,
              borderColor: colors.border,
              overflow: "hidden",
            },
          ]}
        >
          <MenuItem
            icon="log-out"
            label="Sign out"
            onPress={logout}
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notSignedIn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  profileHeader: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  signInBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  signInText: { fontSize: 16, fontWeight: "700" },
  username: { fontSize: 20, fontWeight: "700" },
  uid: { fontSize: 12 },
  section: { marginTop: 16, gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginLeft: 4 },
  menuGroup: { borderWidth: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: { flex: 1, fontSize: 15 },
});
