import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from "@/lib/api/hooks";

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  message: "message-circle",
  order: "shopping-bag",
  escrow: "shield",
  listing: "package",
  offer: "tag",
  review: "star",
  system: "info",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading } = useNotifications();
  const readOne = useReadNotification();
  const readAll = useReadAllNotifications();

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerRight: () =>
            user && unread > 0 ? (
              <Pressable
                onPress={() => readAll.mutate()}
                disabled={readAll.isPending}
                style={{ marginRight: 4 }}
              >
                {readAll.isPending ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <Text style={[styles.headerBtn, { color: colors.gold }]}>
                    Mark all read
                  </Text>
                )}
              </Pressable>
            ) : null,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!user ? (
          <View style={styles.center}>
            <EmptyState
              icon="lock"
              title="Sign in to see notifications"
              subtitle="Stay up to date with orders and messages"
            />
            <Pressable
              onPress={() => router.push("/login")}
              style={[
                styles.signInBtn,
                { backgroundColor: colors.gold, borderRadius: colors.radius },
              ]}
            >
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
              flexGrow: 1,
            }}
            ListEmptyComponent={
              <EmptyState
                icon="bell"
                title="No notifications"
                subtitle="You're all caught up!"
              />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (!item.isRead) readOne.mutate(item.id);
                }}
                style={[
                  styles.row,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: item.isRead
                      ? "transparent"
                      : colors.gold + "11",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather
                    name={TYPE_ICON[item.type] ?? "bell"}
                    size={18}
                    color={colors.gold}
                  />
                </View>
                <View style={styles.content}>
                  <Text
                    style={[styles.title, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {item.body && (
                    <Text
                      style={[styles.body, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  )}
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead && (
                  <View
                    style={[styles.unread, { backgroundColor: colors.gold }]}
                  />
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBtn: { fontSize: 14, fontWeight: "600" },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInText: { fontSize: 15, fontWeight: "700", color: "#000" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  body: { fontSize: 13, lineHeight: 17, marginTop: 2 },
  time: { fontSize: 11, marginTop: 3 },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
