import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return [];
  return (data as Message[]) ?? [];
}

export default function ChatRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (content: string) => {
      if (!isSupabaseConfigured || !user) return;
      await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.uid,
        content,
        is_read: false,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  const handleSend = () => {
    if (!text.trim() || isPending) return;
    Haptics.selectionAsync();
    sendMessage(text.trim());
    setText("");
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Chat",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.uid;
            return (
              <View
                style={[
                  styles.bubble,
                  {
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    backgroundColor: isMe ? colors.gold : colors.card,
                    borderRadius: colors.radius,
                    maxWidth: "75%",
                  },
                ]}
              >
                <Text
                  style={{
                    color: isMe ? "#000" : colors.text,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {item.content}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                No messages yet. Say hello!
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.secondary,
                color: colors.text,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  text.trim() ? colors.gold : colors.secondary,
                borderRadius: 24,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={text.trim() ? "#000" : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyChat: {
    alignItems: "center",
    paddingTop: 40,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
