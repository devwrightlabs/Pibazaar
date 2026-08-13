import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateProfile,
} from "@/lib/api/hooks";
import type {
  Address,
  JurisdictionMode,
  ThemePreference,
} from "@/lib/api/types";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, refresh } = useAuth();

  const updateProfile = useUpdateProfile();
  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();

  const addresses = addressesQuery.data?.addresses ?? [];

  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    user?.themePreference ?? "dark"
  );
  const [jurisdictionMode, setJurisdictionMode] = useState<JurisdictionMode>(
    user?.jurisdictionMode ?? "local"
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    fullName: "",
    streetAddress: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "",
    phoneNumber: "",
  });

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Username required", "Please enter a username.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateProfile.mutateAsync({
        username: username.trim(),
        bio: bio.trim(),
        walletAddress: walletAddress.trim() || undefined,
        country: country.trim() || undefined,
        themePreference,
        jurisdictionMode,
      });
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update profile.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleAddAddress = async () => {
    if (
      !addrForm.fullName.trim() ||
      !addrForm.streetAddress.trim() ||
      !addrForm.city.trim() ||
      !addrForm.countryCode.trim()
    ) {
      Alert.alert(
        "Missing fields",
        "Full name, street, city and country code are required."
      );
      return;
    }
    try {
      await createAddress.mutateAsync({
        fullName: addrForm.fullName.trim(),
        streetAddress: addrForm.streetAddress.trim(),
        city: addrForm.city.trim(),
        stateProvince: addrForm.stateProvince.trim() || undefined,
        postalCode: addrForm.postalCode.trim() || undefined,
        countryCode: addrForm.countryCode.trim().toUpperCase(),
        phoneNumber: addrForm.phoneNumber.trim() || undefined,
      });
      setShowAddForm(false);
      setAddrForm({
        fullName: "",
        streetAddress: "",
        city: "",
        stateProvince: "",
        postalCode: "",
        countryCode: "",
        phoneNumber: "",
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save address.");
    }
  };

  const handleDeleteAddress = (addr: Address) => {
    Alert.alert("Delete address", `Remove ${addr.fullName}'s address?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteAddress.mutate(addr.id, {
            onError: (e: any) =>
              Alert.alert("Error", e?.message || "Failed to delete address."),
          }),
      },
    ]);
  };

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "Settings",
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        />
        <View style={[styles.gate, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="lock"
            title="Sign in to manage settings"
            subtitle="Update your profile and preferences"
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
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Settings",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile */}
        <Section label="Profile" colors={colors}>
          <Field label="Username" colors={colors}>
            <TextInput
              style={inputStyle(colors)}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Bio" colors={colors}>
            <TextInput
              style={[inputStyle(colors), styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about yourself"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          </Field>
          <Field label="Wallet address" colors={colors}>
            <TextInput
              style={inputStyle(colors)}
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder="Pi wallet address"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Country" colors={colors}>
            <TextInput
              style={inputStyle(colors)}
              value={country}
              onChangeText={setCountry}
              placeholder="Country"
              placeholderTextColor={colors.mutedForeground}
            />
          </Field>
        </Section>

        {/* Preferences */}
        <Section label="Preferences" colors={colors}>
          <Field label="Theme" colors={colors}>
            <View style={styles.chips}>
              {(["dark", "light"] as ThemePreference[]).map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={themePreference === t}
                  onPress={() => setThemePreference(t)}
                  colors={colors}
                />
              ))}
            </View>
          </Field>
          <Field label="Jurisdiction" colors={colors}>
            <View style={styles.chips}>
              {(["local", "global"] as JurisdictionMode[]).map((j) => (
                <Chip
                  key={j}
                  label={j}
                  active={jurisdictionMode === j}
                  onPress={() => setJurisdictionMode(j)}
                  colors={colors}
                />
              ))}
            </View>
          </Field>
        </Section>

        <Pressable
          onPress={handleSave}
          disabled={updateProfile.isPending}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.gold,
              borderRadius: colors.radius,
              opacity: updateProfile.isPending || pressed ? 0.85 : 1,
            },
          ]}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name="save" size={18} color="#000" />
              <Text style={styles.saveText}>Save changes</Text>
            </>
          )}
        </Pressable>

        {/* Addresses */}
        <Section label="Shipping addresses" colors={colors}>
          {addressesQuery.isLoading ? (
            <ActivityIndicator color={colors.gold} />
          ) : addresses.length === 0 && !showAddForm ? (
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>
              No saved addresses yet.
            </Text>
          ) : (
            addresses.map((addr) => (
              <View
                key={addr.id}
                style={[
                  styles.addressRow,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressName, { color: colors.text }]}>
                    {addr.fullName}
                  </Text>
                  <Text
                    style={[
                      styles.addressLine,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {addr.streetAddress}, {addr.city}
                    {addr.stateProvince ? `, ${addr.stateProvince}` : ""} ·{" "}
                    {addr.countryCode}
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleDeleteAddress(addr)}
                >
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </Pressable>
              </View>
            ))
          )}

          {showAddForm ? (
            <View style={styles.addForm}>
              {(
                [
                  ["fullName", "Full name"],
                  ["streetAddress", "Street address"],
                  ["city", "City"],
                  ["stateProvince", "State / Province (optional)"],
                  ["postalCode", "Postal code (optional)"],
                  ["countryCode", "Country code (e.g. US)"],
                  ["phoneNumber", "Phone (optional)"],
                ] as [keyof typeof addrForm, string][]
              ).map(([key, placeholder]) => (
                <TextInput
                  key={key}
                  style={inputStyle(colors)}
                  value={addrForm[key]}
                  onChangeText={(t) =>
                    setAddrForm((f) => ({ ...f, [key]: t }))
                  }
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize={
                    key === "countryCode" ? "characters" : "sentences"
                  }
                />
              ))}
              <View style={styles.formActions}>
                <Pressable
                  onPress={() => setShowAddForm(false)}
                  style={styles.formCancel}
                >
                  <Text
                    style={[
                      styles.formCancelText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleAddAddress}
                  disabled={createAddress.isPending}
                  style={[
                    styles.formSave,
                    {
                      backgroundColor: colors.gold,
                      borderRadius: colors.radius / 2,
                    },
                  ]}
                >
                  {createAddress.isPending ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.formSaveText}>Save address</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={styles.addAddressBtn}
            >
              <Feather name="plus" size={16} color={colors.gold} />
              <Text style={[styles.addAddressText, { color: colors.gold }]}>
                Add new address
              </Text>
            </Pressable>
          )}
        </Section>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={[
            styles.signOutBtn,
            { borderColor: colors.destructive, borderRadius: colors.radius },
          ]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign out
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          PiBazaar · v1.0.0 · Powered by Pi Network
        </Text>
      </ScrollView>
    </>
  );
}

function inputStyle(colors: any) {
  return {
    color: colors.text,
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: colors.radius,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
  } as const;
}

function Section({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.group,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.secondary,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.primaryForeground : colors.mutedForeground,
          fontSize: 13,
          fontWeight: active ? "700" : "400",
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  signInText: { fontSize: 15, fontWeight: "700", color: "#000" },
  section: { gap: 8, marginTop: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  group: { borderWidth: 1, padding: 14, gap: 14 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 12,
  },
  saveText: { fontSize: 16, fontWeight: "700", color: "#000" },
  muted: { fontSize: 14 },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  addressName: { fontSize: 14, fontWeight: "600" },
  addressLine: { fontSize: 12, marginTop: 2 },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  addAddressText: { fontSize: 14, fontWeight: "600" },
  addForm: { gap: 8 },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  formCancel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  formCancelText: { fontSize: 14, fontWeight: "600" },
  formSave: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  formSaveText: { fontSize: 14, fontWeight: "700", color: "#000" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
  version: { fontSize: 11, textAlign: "center", marginTop: 16 },
});
