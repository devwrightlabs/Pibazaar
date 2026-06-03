/**
 * Login / Sign Up — PiBazaar Mobile
 *
 * Two-step auth against the self-contained Express backend (mirrors the web app):
 *   1. Manual account: Sign Up or Log In with a username + password.
 *   2. Pi: a separate "Log in with Pi" button that runs the Pi SDK handshake.
 *      window.Pi is only available inside the Pi Browser, so outside it we surface
 *      a clear "Pi Browser required" message instead of failing silently.
 *
 * A collapsible developer escape hatch accepts a raw Pi access token and completes
 * the same /auth/pi flow (useful for testing outside the Pi Browser).
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    user,
    login,
    signup,
    loginWithPi,
    verifyPioneer,
    acceptToken,
    authError,
    clearError,
    isLoading,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [piNotice, setPiNotice] = useState<string | null>(null);

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (user) router.replace("/(tabs)/profile");
  }, [user]);

  const switchMode = (next: Mode) => {
    Haptics.selectionAsync();
    clearError();
    setPiNotice(null);
    setMode(next);
  };

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Missing fields", "Enter a username and password.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPiNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signup({ username: username.trim(), password });
        // Cleanly verify the new user is a Pioneer via the Pi SDK. Outside the
        // Pi Browser this resolves to false and never blocks account creation.
        const verified = await verifyPioneer();
        if (!verified) {
          setPiNotice(
            "Account created. Open PiBazaar in the Pi Browser to verify your Pioneer status and unlock Pi payments.",
          );
        }
      } else {
        await login({ username: username.trim(), password });
      }
    } catch {
      // authError is surfaced inline by the context.
    } finally {
      setBusy(false);
    }
  };

  const handlePiSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPiNotice(null);
    setBusy(true);
    try {
      await loginWithPi();
    } catch {
      // Gentle, non-blocking notice — never a destructive error on the web.
      setPiNotice(
        "Pi login is only available inside the Pi Browser. You can sign in with a username and password here, or open PiBazaar in the Pi Browser to use Pi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptToken = async () => {
    if (!tokenInput.trim()) {
      Alert.alert("Missing token", "Paste a Pi access token.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await acceptToken(tokenInput.trim());
    } catch (err) {
      Alert.alert(
        "Authentication failed",
        err instanceof Error ? err.message : "Authentication service unavailable.",
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
          {/* Mode toggle */}
          <View
            style={[
              styles.segment,
              { backgroundColor: colors.secondary, borderRadius: colors.radius },
            ]}
          >
            {(["login", "signup"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[
                  styles.segmentItem,
                  {
                    backgroundColor: mode === m ? colors.gold : "transparent",
                    borderRadius: colors.radius - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: mode === m ? "#000" : colors.mutedForeground },
                  ]}
                >
                  {m === "login" ? "Log In" : "Sign Up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  borderColor: colors.border,
                  borderRadius: colors.radius / 2,
                },
              ]}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={disabled}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.gold,
                  borderRadius: colors.radius,
                  opacity: pressed || disabled ? 0.8 : 1,
                },
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : "Log in"}
              </Text>
            </Pressable>
          </View>

          {authError && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + "18",
                  borderColor: colors.destructive + "40",
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {authError}
              </Text>
            </View>
          )}

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

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
              or
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            onPress={handlePiSignIn}
            disabled={disabled}
            style={({ pressed }) => [
              styles.piBtn,
              {
                borderColor: colors.gold,
                borderRadius: colors.radius,
                opacity: pressed || disabled ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.piBtnText, { color: colors.gold }]}>
              Log in with Pi
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowTokenInput((s) => !s);
            }}
            style={styles.developerToggle}
          >
            <Text
              style={[styles.developerToggleText, { color: colors.mutedForeground }]}
            >
              {showTokenInput ? "Hide" : "Developer"} token sign-in
            </Text>
            <Feather
              name={showTokenInput ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.mutedForeground}
            />
          </Pressable>

          {showTokenInput && (
            <View style={styles.tokenForm}>
              <Text
                style={[styles.tokenFormLabel, { color: colors.mutedForeground }]}
              >
                Paste a Pi access token to authenticate via the same /auth/pi
                endpoint the web app uses.
              </Text>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Pi access token"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.tokenTextArea,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.text,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              />
              <Pressable
                onPress={handleAcceptToken}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.tokenSubmitBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                    opacity: pressed || disabled ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.tokenSubmitText, { color: colors.text }]}>
                  {busy ? "Authenticating…" : "Authenticate"}
                </Text>
              </Pressable>
            </View>
          )}
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
