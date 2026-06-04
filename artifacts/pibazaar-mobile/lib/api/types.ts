// Domain types mirroring the api-server JSON contract (camelCase).
// Timestamps are serialized as ISO strings over the wire.

export type UserRole = 'user' | 'admin'
export type ThemePreference = 'dark' | 'light'
export type JurisdictionMode = 'local' | 'global'

/** Logged-in user (GET /auth/me, /users/me) — passwordHash omitted. */
export interface SelfUser {
  id: string
  piUid: string | null
  username: string
  email: string | null
  avatarUrl: string | null
  bio: string | null
  walletAddress: string | null
  piWalletAddress: string | null
  isVerified: boolean
  isKycVerified: boolean
  role: UserRole
  isSuspended: boolean
  trustScore: number
  totalSales: number
  themePreference: ThemePreference
  jurisdictionMode: JurisdictionMode
  country: string | null
  createdAt: string
  updatedAt: string
}

/** Public profile subset (GET /users/:id). */
export interface PublicUser {
  id: string
  username: string
  avatarUrl: string | null
  bio: string | null
  trustScore: number
  totalSales: number
  isVerified: boolean
  isKycVerified: boolean
  createdAt: string
}

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair'
export type ProductType = 'physical' | 'digital' | 'service'
export type ListingStatus = 'draft' | 'active' | 'sold' | 'removed' | 'scheduled'

export interface Listing {
  id: string
  sellerId: string
  title: string
  description: string
  priceInPi: number
  category: string
  condition: ListingCondition
  productType: ProductType
  status: ListingStatus
  images: string[]
  locationLat: number | null
  locationLng: number | null
  city: string | null
  country: string | null
  originCountry: string | null
  allowOffers: boolean
  isBoosted: boolean
  isProSeller: boolean
  shippingCarrier: string | null
  scheduledFor: string | null
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type EscrowStatus =
  | 'pending'
  | 'funded'
  | 'shipped'
  | 'delivered'
  | 'released'
  | 'completed'
  | 'auto_released'
  | 'disputed'
  | 'cancelled'

export type ReleaseType = 'shipping' | 'local_meetup' | 'digital'

export interface EscrowMilestone {
  id: string
  title: string
  amountPi: number
  status: 'pending' | 'released'
  releasedAt?: string
}

export interface Escrow {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  amountPi: number
  platformFeePi: number
  status: EscrowStatus
  releaseType: ReleaseType
  piPaymentId: string | null
  piTxid: string | null
  shippingMethod: string | null
  shippingCarrier: string | null
  shippingAddressId: string | null
  trackingNumber: string | null
  deliveryProof: string | null
  meetupCode: string | null
  milestones: EscrowMilestone[] | null
  disputeReason: string | null
  notes: string | null
  autoReleaseAt: string | null
  releasedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  listingId: string | null
  listingTitle?: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  createdAt: string
  // Number of messages unread by the current user.
  unread: number
  // The other party, enriched by the list endpoint.
  otherUser: PublicUser | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  isRead: boolean
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string | null
  isRead: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface Review {
  id: string
  reviewerId: string
  revieweeId: string
  escrowId: string | null
  rating: number
  comment: string | null
  createdAt: string
  reviewer?: PublicUser
}

export interface Address {
  id: string
  userId: string
  fullName: string
  streetAddress: string
  city: string
  stateProvince: string | null
  postalCode: string | null
  countryCode: string
  phoneNumber: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type ServiceRange = 'local' | 'regional' | 'international'

export interface ShippingCarrier {
  id: string
  name: string
  countryCode: string
  countryName: string | null
  serviceRange: ServiceRange
  websiteUrl: string
  logoUrl: string | null
  description: string | null
  isActive: boolean
  sortOrder: number
}

export interface ShippingDirectory {
  carriers: ShippingCarrier[]
  grouped: Record<ServiceRange, ShippingCarrier[]>
  disclaimer: string
}

export interface DashboardSummary {
  activeListings: number
  draftListings: number
  sales: number
  purchases: number
  activeEscrows: number
  revenuePi: number
  unreadNotifications: number
  unreadMessages: number
}

// ─── Request payloads ──────────────────────────────────────────────────────

export interface SignupBody {
  username: string
  password: string
  /** Pi SDK access token — verified server-side to gate signup to real Pioneers. */
  accessToken: string
  walletAddress?: string
}

export interface LoginBody {
  username: string
  password: string
}

export interface PiLoginBody {
  accessToken: string
  walletAddress?: string
}

export interface AuthResponse {
  token: string
  user: SelfUser
  isNewUser?: boolean
}

export interface UpdateProfileBody {
  username?: string
  bio?: string
  avatarUrl?: string
  email?: string
  walletAddress?: string
  themePreference?: ThemePreference
  jurisdictionMode?: JurisdictionMode
  country?: string
}

export interface ListingInput {
  title?: string
  description?: string
  priceInPi?: number
  category?: string
  condition?: ListingCondition
  productType?: ProductType
  status?: ListingStatus
  images?: string[]
  locationLat?: number
  locationLng?: number
  city?: string
  country?: string
  originCountry?: string
  allowOffers?: boolean
  shippingCarrier?: string
  scheduledFor?: string
}

export interface ListingQuery {
  q?: string
  category?: string
  condition?: ListingCondition
  productType?: ProductType
  country?: string
  sellerId?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'recent' | 'price_asc' | 'price_desc'
  limit?: number
  offset?: number
}

export interface ListingsPage {
  listings: Listing[]
  total: number
  limit: number
  offset: number
}

export interface CreateEscrowBody {
  listingId: string
  releaseType?: ReleaseType
  shippingAddressId?: string
  shippingMethod?: string
  milestones?: { title: string; amountPi: number }[]
}

export interface CreateAddressBody {
  fullName: string
  streetAddress: string
  city: string
  stateProvince?: string
  postalCode?: string
  countryCode: string
  phoneNumber?: string
  isDefault?: boolean
}

export interface RequestUploadBody {
  name: string
  size: number
  contentType: string
}

export interface RequestUploadResponse {
  uploadURL: string
  objectPath: string
  metadata?: Record<string, unknown>
}

/** Local working draft for the create-listing flow (mirrors ListingInput). */
export interface ListingDraft {
  serverId: string | null
  title: string
  description: string
  priceInPi: number
  category: string
  condition: ListingCondition
  productType: ProductType
  images: string[]
  city: string
  country: string
  allowOffers: boolean
  shippingCarrier: string | null
}

export const EMPTY_DRAFT: ListingDraft = {
  serverId: null,
  title: '',
  description: '',
  priceInPi: 0,
  category: '',
  condition: 'good',
  productType: 'physical',
  images: [],
  city: '',
  country: '',
  allowOffers: true,
  shippingCarrier: null,
}
