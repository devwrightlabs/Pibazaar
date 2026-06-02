/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: "#1A1A1A",
    tint: "#D4A017",
    background: "#F5F5F7",
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    cardForeground: "#1A1A1A",
    primary: "#D4A017",
    primaryForeground: "#000000",
    secondary: "#E8E8ED",
    secondaryForeground: "#1A1A1A",
    muted: "#E8E8ED",
    mutedForeground: "#4B5563",
    accent: "#E8E8ED",
    accentForeground: "#1A1A1A",
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    border: "rgba(0,0,0,0.08)",
    input: "rgba(0,0,0,0.08)",
    success: "#16A34A",
    gold: "#D4A017",
    royalPurple: "#4B0082",
  },
  dark: {
    text: "#FFFFFF",
    tint: "#F0C040",
    background: "#0A0A0F",
    foreground: "#FFFFFF",
    card: "#16213E",
    cardForeground: "#FFFFFF",
    primary: "#F0C040",
    primaryForeground: "#000000",
    secondary: "#1A1A2E",
    secondaryForeground: "#FFFFFF",
    muted: "#1A1A2E",
    mutedForeground: "#888888",
    accent: "#1A1A2E",
    accentForeground: "#FFFFFF",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    border: "rgba(255,255,255,0.05)",
    input: "rgba(255,255,255,0.1)",
    success: "#22C55E",
    gold: "#F0C040",
    royalPurple: "#4B0082",
  },
  radius: 12,
};

export default colors;
