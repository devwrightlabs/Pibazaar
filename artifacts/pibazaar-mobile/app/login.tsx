/**
 * Login — PiBazaar Mobile
 *
 * Pi Network compliance: Pi Authentication SDK is the ONLY sign-in method.
 * There is no username/password account and no manual credential entry.
 * window.Pi is only available inside the Pi Browser, so outside it we surface
 * a clear "Pi Browser required" message instead of failing silently.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, loginWithPi, isLoading } = useAuth();

  const [busy, setBusy] = useState(false);
  const [piNotice, setPiNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/(tabs)/profile");
  }, [user]);

  const handlePiSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPiNotice(null);
    setBusy(true);
    try {
      await loginWithPi();
    } catch {
      // Gentle, non-blocking notice — never a destructive error on the web.
      setPiNotice(
        "Pi login is only available inside the Pi Browser. Open PiBazaar in the Pi Browser to sign in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View
            style={[styles.logoCircle, { backgroundColor: colors.gold + "22" }]}
          >
            <Text style={[styles.logoText, { color: colors.gold }]}>π</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>PiBazaar</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            The Pi Network marketplace
          </Text>
        </View>

        <View style={styles.card}>
          {piNotice && (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: colors.gold + "18",
                  borderColor: colors.gold + "55",
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Feather name="info" size={14} color={colors.gold} />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                {piNotice}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handlePiSignIn}
            disabled={disabled}
            style={({ pressed }) => [
              styles.piBtn,
              {
                borderColor: colors.gold,
                borderRadius: colors.radius,
                backgroundColor: colors.gold,
                opacity: pressed || disabled ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.piBtnText, { color: "#000" }]}>
              {busy ? "Please wait…" : "Log in with Pi"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
          <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>
            Browse without signing in
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 32,
  },
  hero: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 40, fontWeight: "800" },
  appName: { fontSize: 28, fontWeight: "800" },
  tagline: { fontSize: 15 },
  card: { gap: 16 },
  segment: {
    flexDirection: "row",
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
  },
  segmentText: { fontSize: 14, fontWeight: "700" },
  form: { gap: 10 },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
  piBtn: {
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
  },
  piBtnText: { fontSize: 15, fontWeight: "700" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12 },
  developerToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  developerToggleText: { fontSize: 12 },
  tokenForm: { gap: 10 },
  tokenFormLabel: { fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  tokenTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  tokenSubmitBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tokenSubmitText: { fontSize: 14, fontWeight: "600" },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
  },
  backLinkText: { fontSize: 13 },
});
