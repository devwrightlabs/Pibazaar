/**
 * Login — PiBazaar Mobile
 *
 * Mirrors the web login page's UX and intent:
 * - Runs the Pi Browser authentication handshake (window.Pi is unavailable in
 *   React Native; the same PI_BROWSER_REQUIRED error the web surfaces is shown).
 * - Forwards verified Pi identity to the `pi-auth` Supabase Edge Function.
 * - Same backend contract as the web: acceptToken() → supabase.functions.invoke('pi-auth').
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, loginWithPi, acceptToken, authError, isLoading } = useAuth();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [uidInput, setUidInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/profile");
    }
  }, [user]);

  const handlePiSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSigningIn(true);
    try {
      await loginWithPi();
    } catch {
      Alert.alert(
        "Pi Browser Required",
        "PiBazaar uses Pi Network authentication, which is only available inside the Pi Browser.\n\nOpen PiBazaar at pibazaar.app in your Pi Browser to sign in, then return here.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAcceptToken = async () => {
    if (!tokenInput.trim() || !uidInput.trim() || !usernameInput.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSigningIn(true);
    try {
      await acceptToken(tokenInput.trim(), uidInput.trim(), usernameInput.trim());
    } catch (err) {
      Alert.alert(
        "Authentication failed",
        err instanceof Error ? err.message : "Authentication service unavailable."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          },
        ]}
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
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Sign in with Pi
          </Text>
          <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
            PiBazaar uses Pi Network authentication. Open PiBazaar in your{" "}
            <Text style={{ color: colors.gold }}>Pi Browser</Text> to sign in
            with your Pi account.
          </Text>

          <Pressable
            onPress={handlePiSignIn}
            disabled={isSigningIn || isLoading}
            style={({ pressed }) => [
              styles.piBtn,
              {
                backgroundColor: colors.gold,
                borderRadius: colors.radius,
                opacity: pressed || isSigningIn ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.piBtnText}>
              {isSigningIn ? "Connecting…" : "Sign in with Pi"}
            </Text>
          </Pressable>

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

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowTokenInput(!showTokenInput);
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
                Enter a Pi access token from the Pi Browser web session to
                authenticate via the same backend the web app uses.
              </Text>
              <TextInput
                value={uidInput}
                onChangeText={setUidInput}
                placeholder="Pi UID"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
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
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Pi username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
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
                disabled={isSigningIn}
                style={({ pressed }) => [
                  styles.tokenSubmitBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                    opacity: pressed || isSigningIn ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.tokenSubmitText, { color: colors.text }]}>
                  {isSigningIn ? "Authenticating…" : "Authenticate"}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
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
  cardTitle: { fontSize: 20, fontWeight: "700" },
  cardBody: { fontSize: 14, lineHeight: 20 },
  piBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  piBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
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
