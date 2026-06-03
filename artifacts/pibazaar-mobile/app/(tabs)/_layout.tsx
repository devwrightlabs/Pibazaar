import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="browse">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Messages</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

type TabItem = {
  name: string;
  label: string;
  feather: keyof typeof Feather.glyphMap;
  sf: string;
};

const TAB_ITEMS: TabItem[] = [
  { name: "index", label: "Home", feather: "home", sf: "house" },
  { name: "browse", label: "Browse", feather: "search", sf: "magnifyingglass" },
  { name: "messages", label: "Messages", feather: "message-circle", sf: "message" },
  { name: "profile", label: "Profile", feather: "user", sf: "person" },
];

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: true,
        tabBarItemStyle: { height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Platform.select({ web: 16, default: 24 }),
          height: 64,
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 22,
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.4 : 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          overflow: "hidden",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {TAB_ITEMS.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.label,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon item={item} color={color} focused={focused} isIOS={isIOS} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

function TabIcon({
  item,
  color,
  focused,
  isIOS,
}: {
  item: TabItem;
  color: string;
  focused: boolean;
  isIOS: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: colors.gold + "1F" },
      ]}
    >
      {isIOS ? (
        <SymbolView name={item.sf as any} tintColor={color} size={22} />
      ) : (
        <Feather name={item.feather} size={20} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
