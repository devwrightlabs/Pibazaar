import type {
  User,
  PublicUser,
  Listing,
  EscrowTransaction,
} from "@workspace/db";

export function num(value: string | null | undefined): number {
  return value == null ? 0 : Number(value);
}

/** Normalise numeric columns for the logged-in user (Pi-only app: no password field). */
export function serializeSelf(user: User) {
  return { ...user, trustScore: num(user.trustScore) };
}

/** Public profile — safe subset for other users to see. */
export function serializePublicUser(user: User | PublicUser) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    trustScore: num(user.trustScore),
    totalSales: user.totalSales,
    isVerified: user.isVerified,
    isKycVerified: user.isKycVerified,
    createdAt: user.createdAt,
  };
}

export function serializeListing(listing: Listing) {
  return { ...listing, priceInPi: num(listing.priceInPi) };
}

export function serializeEscrow(escrow: EscrowTransaction) {
  return {
    ...escrow,
    amountPi: num(escrow.amountPi),
    platformFeePi: num(escrow.platformFeePi),
  };
}
