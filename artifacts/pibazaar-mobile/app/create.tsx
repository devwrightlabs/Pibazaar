import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Services", "Digital", "Vehicles", "Other"];
const CONDITIONS = ["new", "like_new", "good", "fair"] as const;

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("good");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim()) {
      setError("Title and price are required.");
      return;
    }
    if (!user) {
      setError("Please sign in to create a listing.");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const { error: sbError } = await supabase.from("listings").insert({
        title: title.trim(),
        description: description.trim(),
        price_in_pi: parseFloat(price),
        category,
        condition,
        city: city.trim(),
        seller_id: user.pi_uid,
        images: [],
        status: "active",
        is_boosted: false,
        location_lat: 0,
        location_lng: 0,
        country: "",
        deleted_at: null,
      });
      if (sbError) throw sbError;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message || "Failed to create listing. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "New Listing",
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Title" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
            value={title}
            onChangeText={setTitle}
            placeholder="What are you selling?"
            placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Description" colors={colors}>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Price (π)" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
        </Field>

        <Field label="Category" colors={colors}>
          <View style={styles.chips}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: cat === category ? colors.primary : colors.secondary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: cat === category ? colors.primaryForeground : colors.mutedForeground,
                    fontSize: 13,
                    fontWeight: cat === category ? "700" : "400",
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Condition" colors={colors}>
          <View style={styles.chips}>
            {CONDITIONS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCondition(c)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: c === condition ? colors.primary : colors.secondary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: c === condition ? colors.primaryForeground : colors.mutedForeground,
                    fontSize: 13,
                    fontWeight: c === condition ? "700" : "400",
                  }}
                >
                  {c.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="City" colors={colors}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
            value={city}
            onChangeText={setCity}
            placeholder="Nassau, Bahamas..."
            placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        {error && (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.gold,
              borderRadius: colors.radius,
              opacity: isLoading || pressed ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name="plus-circle" size={18} color="#000" />
              <Text style={styles.submitText}>Publish Listing</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  input: {
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    textAlign: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
