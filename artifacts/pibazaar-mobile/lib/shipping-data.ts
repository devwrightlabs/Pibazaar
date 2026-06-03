/**
 * Centralized, client-side shipping directory — PiBazaar Mobile
 *
 * Shipping is STRICTLY INFORMATIONAL and handled OFF-PLATFORM. PiBazaar does not
 * manage logistics, labels, tracking, or fulfillment. This is a static, hand-
 * maintained list of real courier websites so buyers and sellers can arrange
 * delivery themselves. It is intentionally local state — no backend/API calls.
 */

export type ServiceRange = "local" | "regional" | "international";

export interface Courier {
  id: string;
  name: string;
  /** ISO-ish region/country hint, used only for client-side filtering. */
  region: string;
  serviceRange: ServiceRange;
  websiteUrl: string;
  description: string;
}

export const SHIPPING_DISCLAIMER =
  "Shipping is arranged off-platform. PiBazaar does not handle logistics, " +
  "tracking, customs, or fulfillment. These are external couriers — you and " +
  "the other party are responsible for arranging and paying for delivery.";

export const COURIERS: Courier[] = [
  // ── Local ─────────────────────────────────────────────────────────────
  {
    id: "usps",
    name: "USPS",
    region: "US",
    serviceRange: "local",
    websiteUrl: "https://www.usps.com",
    description: "United States Postal Service — domestic mail & parcels.",
  },
  {
    id: "royal-mail",
    name: "Royal Mail",
    region: "UK",
    serviceRange: "local",
    websiteUrl: "https://www.royalmail.com",
    description: "UK national postal carrier for domestic delivery.",
  },
  {
    id: "canada-post",
    name: "Canada Post",
    region: "CA",
    serviceRange: "local",
    websiteUrl: "https://www.canadapost-postescanada.ca",
    description: "Canada's national postal service.",
  },
  {
    id: "australia-post",
    name: "Australia Post",
    region: "AU",
    serviceRange: "local",
    websiteUrl: "https://auspost.com.au",
    description: "Australian domestic post & parcels.",
  },
  {
    id: "india-post",
    name: "India Post",
    region: "IN",
    serviceRange: "local",
    websiteUrl: "https://www.indiapost.gov.in",
    description: "India's national postal network.",
  },

  // ── Regional ──────────────────────────────────────────────────────────
  {
    id: "dpd",
    name: "DPD",
    region: "EU",
    serviceRange: "regional",
    websiteUrl: "https://www.dpd.com",
    description: "Road parcel network across Europe.",
  },
  {
    id: "gls",
    name: "GLS",
    region: "EU",
    serviceRange: "regional",
    websiteUrl: "https://gls-group.com",
    description: "European ground logistics & parcels.",
  },
  {
    id: "purolator",
    name: "Purolator",
    region: "CA",
    serviceRange: "regional",
    websiteUrl: "https://www.purolator.com",
    description: "North American courier (Canada-based).",
  },
  {
    id: "aramex",
    name: "Aramex",
    region: "MENA",
    serviceRange: "regional",
    websiteUrl: "https://www.aramex.com",
    description: "Middle East, Africa & Asia regional delivery.",
  },
  {
    id: "j-t-express",
    name: "J&T Express",
    region: "SEA",
    serviceRange: "regional",
    websiteUrl: "https://www.jtexpress.com",
    description: "Southeast Asia parcel delivery.",
  },

  // ── International ──────────────────────────────────────────────────────
  {
    id: "dhl",
    name: "DHL Express",
    region: "Global",
    serviceRange: "international",
    websiteUrl: "https://www.dhl.com",
    description: "Worldwide express courier & freight.",
  },
  {
    id: "fedex",
    name: "FedEx",
    region: "Global",
    serviceRange: "international",
    websiteUrl: "https://www.fedex.com",
    description: "Global express shipping & logistics.",
  },
  {
    id: "ups",
    name: "UPS",
    region: "Global",
    serviceRange: "international",
    websiteUrl: "https://www.ups.com",
    description: "International parcel & supply-chain delivery.",
  },
  {
    id: "tnt",
    name: "TNT",
    region: "Global",
    serviceRange: "international",
    websiteUrl: "https://www.tnt.com",
    description: "International express (FedEx-owned).",
  },
  {
    id: "ems",
    name: "EMS",
    region: "Global",
    serviceRange: "international",
    websiteUrl: "https://www.ems.post",
    description: "Universal Postal Union express worldwide.",
  },
];

export const SERVICE_SECTIONS: { range: ServiceRange; label: string; hint: string }[] = [
  { range: "local", label: "Local", hint: "Domestic, same-country delivery" },
  { range: "regional", label: "Regional", hint: "Neighboring countries / continent" },
  { range: "international", label: "International", hint: "Worldwide cross-border" },
];

/** Pure client-side filter by free-text region/name query. */
export function filterCouriers(query: string): Courier[] {
  const q = query.trim().toLowerCase();
  if (!q) return COURIERS;
  return COURIERS.filter(
    (c) =>
      c.region.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
}

export function groupByRange(couriers: Courier[]): Record<ServiceRange, Courier[]> {
  return {
    local: couriers.filter((c) => c.serviceRange === "local"),
    regional: couriers.filter((c) => c.serviceRange === "regional"),
    international: couriers.filter((c) => c.serviceRange === "international"),
  };
}
