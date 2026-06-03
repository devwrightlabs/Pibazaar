import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useMessages, useSendMessage } from "@/lib/api/hooks";

export default function ChatRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data } = useMessages(id);
  const messages = data?.messages ?? [];

  const { mutate: sendMessage, isPending } = useSendMessage(id);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    Haptics.selectionAsync();
    sendMessage(trimmed);
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
        {!user ? (
          <View style={styles.authWrap}>
            <EmptyState
              icon="lock"
              title="Sign in to chat"
              subtitle="You need to be signed in to view this conversation"
            />
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: false })
              }
              renderItem={({ item }) => {
                const isMe = item.senderId === user.id;
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
                    backgroundColor: text.trim() ? colors.gold : colors.secondary,
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
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  authWrap: { flex: 1 },
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
