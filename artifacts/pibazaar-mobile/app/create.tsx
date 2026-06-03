import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { uploadFile } from "@/lib/api/client";
import { useCreateListing, useListing, useUpdateListing } from "@/lib/api/hooks";
import {
  EMPTY_DRAFT,
  type ListingCondition,
  type ListingDraft,
  type ListingInput,
  type ProductType,
} from "@/lib/api/types";

const CATEGORIES = [
  "electronics",
  "fashion",
  "home",
  "services",
  "digital",
  "vehicles",
  "other",
];
const CONDITIONS: ListingCondition[] = ["new", "like_new", "good", "fair"];
const PRODUCT_TYPES: ProductType[] = ["physical", "digital", "service"];

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const { data: existing, isLoading: loadingExisting } = useListing(editId);

  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [priceText, setPriceText] = useState("");
  const [uploading, setUploading] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!editId || hydratedFor.current === editId || !existing?.listing) return;
    const l = existing.listing;
    hydratedFor.current = editId;
    setDraft({
      serverId: l.id,
      title: l.title ?? "",
      description: l.description ?? "",
      priceInPi: l.priceInPi ?? 0,
      category: l.category ?? "",
      condition: l.condition ?? "good",
      productType: l.productType ?? "physical",
      images: l.images ?? [],
      city: l.city ?? "",
      country: l.country ?? "",
      allowOffers: l.allowOffers ?? true,
      shippingCarrier: l.shippingCarrier ?? null,
    });
    setPriceText(l.priceInPi ? String(l.priceInPi) : "");
  }, [editId, existing]);

  const isEditing = !!draft.serverId;
  const editLoading = !!editId && loadingExisting && hydratedFor.current !== editId;
  const isSaving =
    createListing.isPending || updateListing.isPending || editLoading;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const pickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo access to add images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const paths: string[] = [];
      for (const asset of result.assets) {
        const fileName =
          asset.fileName ?? `photo-${Date.now()}-${paths.length}.jpg`;
        const objectPath = await uploadFile(
          asset.uri,
          fileName,
          asset.mimeType ?? "image/jpeg",
        );
        paths.push(objectPath);
      }
      setDraft((d) => ({ ...d, images: [...d.images, ...paths] }));
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload images.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) =>
    setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== index) }));

  const buildBody = (status: "active" | "draft"): ListingInput => {
    const price = Number(priceText);
    return {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      priceInPi: price > 0 ? price : status === "draft" ? undefined : price,
      category: draft.category || undefined,
      condition: draft.condition,
      productType: draft.productType,
      images: draft.images,
      city: draft.city.trim() || undefined,
      country: draft.country.trim() || undefined,
      allowOffers: draft.allowOffers,
      shippingCarrier: draft.shippingCarrier ?? undefined,
      status,
    };
  };

  const save = async (status: "active" | "draft") => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (status === "active") {
      const price = Number(priceText);
      if (!draft.title.trim()) {
        Alert.alert("Missing title", "Please add a title for your listing.");
        return;
      }
      if (!price || price <= 0) {
        Alert.alert("Invalid price", "Please enter a price greater than 0.");
        return;
      }
      if (draft.images.length < 1) {
        Alert.alert("Add a photo", "Please add at least one photo.");
        return;
      }
      if (!draft.category) {
        Alert.alert("Pick a category", "Please choose a category.");
        return;
      }
    } else if (!draft.title.trim() && draft.images.length < 1) {
      Alert.alert(
        "Nothing to save",
        "Add a title or at least one photo before saving a draft.",
      );
      return;
    }

    const body = buildBody(status);

    try {
      if (draft.serverId) {
        await updateListing.mutateAsync({ id: draft.serverId, body });
      } else {
        await createListing.mutateAsync(body);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert(
        status === "draft" ? "Could not save draft" : "Could not publish",
        e?.message ?? "Please try again.",
      );
    }
  };

  const handleSubmit = () => save("active");
  const handleSaveDraft = () => save("draft");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 8,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Feather name="chevron-left" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Edit listing" : "New listing"}
          </Text>
          <Pressable
            onPress={handleSubmit}
            disabled={isSaving}
            style={[
              styles.postBtn,
              { backgroundColor: colors.gold, borderRadius: colors.radius },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.postText}>Post</Text>
            )}
          </Pressable>
        </View>

        {!user ? (
          <View style={styles.authWrap}>
            <EmptyState
              icon="lock"
              title="Sign in to create a listing"
              subtitle="You need an account to sell on PiBazaar."
            />
            <Pressable
              onPress={() => router.push("/login")}
              style={[
                styles.signInBtn,
                { backgroundColor: colors.gold, borderRadius: colors.radius },
              ]}
            >
              <Text style={styles.postText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Photos" colors={colors}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
              >
                {draft.images.map((path, i) => (
                  <View key={`${path}-${i}`} style={styles.thumbWrap}>
                    <Image
                      source={{ uri: path }}
                      style={[styles.thumb, { borderRadius: colors.radius }]}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => removeImage(i)}
                      hitSlop={6}
                      style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={pickImages}
                  disabled={uploading}
                  style={[
                    styles.addTile,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <>
                      <Feather name="camera" size={22} color={colors.mutedForeground} />
                      <Text style={[styles.addTileText, { color: colors.mutedForeground }]}>
                        Add photo
                      </Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </Field>

            <Field label="Title" colors={colors}>
              <TextInput
                style={inputStyle(colors)}
                value={draft.title}
                onChangeText={(t) => update("title", t)}
                placeholder="What are you selling?"
                placeholderTextColor={colors.mutedForeground}
              />
            </Field>

            <Field label="Description" colors={colors}>
              <TextInput
                style={[inputStyle(colors), styles.textArea]}
                value={draft.description}
                onChangeText={(t) => update("description", t)}
                placeholder="Describe your item..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Price (π)" colors={colors}>
              <TextInput
                style={inputStyle(colors)}
                value={priceText}
                onChangeText={setPriceText}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </Field>

            <Field label="Category" colors={colors}>
              <View style={styles.chips}>
                {CATEGORIES.map((cat) => (
                  <Pill
                    key={cat}
                    label={titleCase(cat)}
                    active={cat === draft.category}
                    onPress={() => update("category", cat)}
                    colors={colors}
                  />
                ))}
              </View>
            </Field>

            <Field label="Condition" colors={colors}>
              <View style={styles.chips}>
                {CONDITIONS.map((c) => (
                  <Pill
                    key={c}
                    label={titleCase(c)}
                    active={c === draft.condition}
                    onPress={() => update("condition", c)}
                    colors={colors}
                  />
                ))}
              </View>
            </Field>

            <Field label="Product type" colors={colors}>
              <View style={styles.chips}>
                {PRODUCT_TYPES.map((t) => (
                  <Pill
                    key={t}
                    label={titleCase(t)}
                    active={t === draft.productType}
                    onPress={() => update("productType", t)}
                    colors={colors}
                  />
                ))}
              </View>
            </Field>

            <Field label="City" colors={colors}>
              <TextInput
                style={inputStyle(colors)}
                value={draft.city}
                onChangeText={(t) => update("city", t)}
                placeholder="Nassau..."
                placeholderTextColor={colors.mutedForeground}
              />
            </Field>

            <Field label="Country" colors={colors}>
              <TextInput
                style={inputStyle(colors)}
                value={draft.country}
                onChangeText={(t) => update("country", t)}
                placeholder="Bahamas..."
                placeholderTextColor={colors.mutedForeground}
              />
            </Field>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Allow offers
                </Text>
                <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                  Let buyers negotiate the price.
                </Text>
              </View>
              <Switch
                value={draft.allowOffers}
                onValueChange={(v) => update("allowOffers", v)}
                trackColor={{ true: colors.gold, false: colors.secondary }}
                thumbColor="#fff"
              />
            </View>

            <Pressable
              onPress={() => router.push("/shipping")}
              style={[
                styles.linkRow,
                { backgroundColor: colors.secondary, borderRadius: colors.radius },
              ]}
            >
              <Feather name="truck" size={18} color={colors.gold} />
              <Text style={[styles.linkText, { color: colors.text }]}>
                Browse shipping carriers
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: colors.gold,
                  borderRadius: colors.radius,
                  opacity: isSaving || pressed ? 0.8 : 1,
                },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Feather name="plus-circle" size={18} color="#000" />
                  <Text style={styles.submitText}>Publish Listing</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleSaveDraft}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.draftBtn,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: isSaving || pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="save" size={18} color={colors.text} />
              <Text style={[styles.draftText, { color: colors.text }]}>
                Save as draft
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function Pill({
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
        }}
      >
        {label}
      </Text>
    </Pressable>
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
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(colors: any) {
  return [
    styles.input,
    {
      color: colors.text,
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: "center",
  },
  postText: { fontSize: 14, fontWeight: "700", color: "#000" },
  authWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  signInBtn: { paddingVertical: 14, alignItems: "center" },
  content: { padding: 16, gap: 16 },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: { padding: 12, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 100, paddingTop: 12 },
  photoRow: { gap: 10, paddingVertical: 2 },
  thumbWrap: { width: 96, height: 96 },
  thumb: { width: 96, height: 96 },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addTileText: { fontSize: 11 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { fontSize: 15, fontWeight: "600" },
  switchHint: { fontSize: 12, marginTop: 2 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  linkText: { flex: 1, fontSize: 14, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: "700", color: "#000" },
  draftBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  draftText: { fontSize: 15, fontWeight: "600" },
});
