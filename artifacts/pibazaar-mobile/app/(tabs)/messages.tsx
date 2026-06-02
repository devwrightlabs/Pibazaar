import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string;
  last_message_at: string;
}

async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as Conversation[]) ?? [];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.pi_uid],
    queryFn: () => fetchConversations(user?.pi_uid ?? ""),
    enabled: !!user,
  });

  const otherParticipant = (conv: Conversation) =>
    conv.participant_1 === user?.pi_uid
      ? conv.participant_2
      : conv.participant_1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.heading, { color: colors.text }]}>Messages</Text>
      </View>

      {!user ? (
        <EmptyState
          icon="lock"
          title="Sign in to see messages"
          subtitle="Connect with buyers and sellers after signing in"
        />
      ) : isLoading ? (
        <FlatList
          data={Array(6).fill(null)}
          keyExtractor={(_, i) => String(i)}
          renderItem={() => <ConversationSkeleton />}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="No conversations yet"
              subtitle="Start a conversation by messaging a seller"
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: pressed ? colors.secondary : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.gold + "33" },
                ]}
              >
                <Feather name="user" size={20} color={colors.gold} />
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text
                    style={[styles.participant, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {otherParticipant(item)}
                  </Text>
                  <Text
                    style={[styles.time, { color: colors.mutedForeground }]}
                  >
                    {timeAgo(item.last_message_at)}
                  </Text>
                </View>
                <Text
                  style={[styles.lastMsg, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.last_message || "No messages yet"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function ConversationSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]} />
      <View style={styles.rowContent}>
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.secondary, width: "50%", height: 13 },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              backgroundColor: colors.secondary,
              width: "80%",
              height: 11,
              marginTop: 6,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: { fontSize: 26, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
  participant: { fontSize: 15, fontWeight: "600", flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  lastMsg: { fontSize: 13, marginTop: 2 },
  skeletonLine: { borderRadius: 4 },
});
