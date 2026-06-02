import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  message: "message-circle",
  order: "shopping-bag",
  listing: "package",
  offer: "tag",
  system: "info",
};

async function fetchNotifications(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data as Notification[]) ?? [];
}

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

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.pi_uid],
    queryFn: () => fetchNotifications(user?.pi_uid ?? ""),
    enabled: !!user,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!user ? (
          <EmptyState icon="lock" title="Sign in to see notifications" />
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
            }}
            ListEmptyComponent={
              <EmptyState
                icon="bell"
                title="No notifications"
                subtitle="You're all caught up!"
              />
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.row,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: item.is_read ? "transparent" : colors.gold + "11",
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
                  <Text style={[styles.message, { color: colors.text }]}>
                    {item.message}
                  </Text>
                  <Text
                    style={[styles.time, { color: colors.mutedForeground }]}
                  >
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
                {!item.is_read && (
                  <View
                    style={[styles.unread, { backgroundColor: colors.gold }]}
                  />
                )}
              </View>
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
  message: { fontSize: 14, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 3 },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
