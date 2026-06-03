// Self-contained typed API client for the PiBazaar Express backend (mobile).
// Requests target an absolute base URL (Expo bundles run outside the web proxy),
// derived from EXPO_PUBLIC_DOMAIN. Auth is a Bearer JWT persisted in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage'

import type {
  AuthResponse,
  SelfUser,
  PublicUser,
  Listing,
  ListingInput,
  ListingQuery,
  ListingsPage,
  Escrow,
  Conversation,
  Message,
  Notification,
  Review,
  Address,
  ShippingDirectory,
  DashboardSummary,
  SignupBody,
  LoginBody,
  PiLoginBody,
  UpdateProfileBody,
  CreateEscrowBody,
  CreateAddressBody,
  RequestUploadBody,
  RequestUploadResponse,
  ServiceRange,
} from './types'

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN
export const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : '/api'
const TOKEN_KEY = '@pibazaar/session_token'

// ─── Token storage (AsyncStorage, cached in memory) ──────────────────────────

let memoryToken: string | null = null
let hydrated = false
type TokenListener = (token: string | null) => void
const tokenListeners = new Set<TokenListener>()

/** Load the persisted token into memory once at app start. */
export async function hydrateToken(): Promise<string | null> {
  if (hydrated) return memoryToken
  try {
    memoryToken = await AsyncStorage.getItem(TOKEN_KEY)
  } catch {
    memoryToken = null
  }
  hydrated = true
  for (const listener of tokenListeners) listener(memoryToken)
  return memoryToken
}

/** Synchronous accessor — valid after hydrateToken() resolves. */
export function getToken(): string | null {
  return memoryToken
}

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token
  hydrated = true
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token)
    else await AsyncStorage.removeItem(TOKEN_KEY)
  } catch {
    // Non-fatal: session works for this launch but won't persist.
  }
  for (const listener of tokenListeners) listener(token)
}

export function onTokenChange(listener: TokenListener): () => void {
  tokenListeners.add(listener)
  return () => {
    tokenListeners.delete(listener)
  }
}

// ─── Error type ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown
  constructor(status: number, message: string, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ─── Core request ──────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  auth?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  let url = `${API_BASE}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }
  return url
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = false, signal } = options
  const headers: Record<string, string> = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if ((auth || token) && token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : typeof payload === 'string' && payload
          ? payload
          : `Request failed (${res.status})`
    // A 401 means our token is stale — clear it so the UI can re-auth.
    if (res.status === 401) void setToken(null)
    throw new ApiError(res.status, message, payload)
  }

  return payload as T
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (body: SignupBody) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body }),
  login: (body: LoginBody) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),
  pi: (body: PiLoginBody, opts?: { link?: boolean }) =>
    request<AuthResponse>('/auth/pi', { method: 'POST', body, auth: !!opts?.link }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: SelfUser }>('/auth/me', { auth: true }),
}

// ─── Users ─────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => request<{ user: SelfUser }>('/users/me', { auth: true }),
  updateMe: (body: UpdateProfileBody) =>
    request<{ user: SelfUser }>('/users/me', { method: 'PATCH', body, auth: true }),
  myListings: (status?: string) =>
    request<{ listings: Listing[] }>('/users/me/listings', { query: { status }, auth: true }),
  dashboard: () =>
    request<DashboardSummary>('/users/me/dashboard', { auth: true }),
  get: (id: string) => request<{ user: PublicUser }>(`/users/${id}`),
  listings: (id: string) => request<{ listings: Listing[] }>(`/users/${id}/listings`),
  reviews: (id: string) => request<{ reviews: Review[] }>(`/users/${id}/reviews`),
}

// ─── Listings ──────────────────────────────────────────────────────────────

export const listingsApi = {
  list: (query?: ListingQuery) =>
    request<ListingsPage>('/listings', { query: query as RequestOptions['query'] }),
  get: (id: string) =>
    request<{ listing: Listing; seller: PublicUser }>(`/listings/${id}`),
  create: (body: ListingInput) =>
    request<{ listing: Listing }>('/listings', { method: 'POST', body, auth: true }),
  update: (id: string, body: ListingInput) =>
    request<{ listing: Listing }>(`/listings/${id}`, { method: 'PATCH', body, auth: true }),
  remove: (id: string) =>
    request<{ ok: true }>(`/listings/${id}`, { method: 'DELETE', auth: true }),
}

// ─── Escrow ────────────────────────────────────────────────────────────────

export const escrowApi = {
  list: (role?: 'buyer' | 'seller') =>
    request<{ escrows: Escrow[] }>('/escrow', { query: { role }, auth: true }),
  get: (id: string) => request<{ escrow: Escrow }>(`/escrow/${id}`, { auth: true }),
  create: (body: CreateEscrowBody) =>
    request<{ escrow: Escrow }>('/escrow', { method: 'POST', body, auth: true }),
  approve: (id: string, paymentId: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/approve`, { method: 'POST', body: { paymentId }, auth: true }),
  complete: (id: string, paymentId: string, txid: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/complete`, { method: 'POST', body: { paymentId, txid }, auth: true }),
  ship: (id: string, body: { trackingNumber?: string; shippingCarrier?: string }) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/ship`, { method: 'POST', body, auth: true }),
  deliver: (id: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/deliver`, { method: 'POST', auth: true }),
  confirm: (id: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/confirm`, { method: 'POST', auth: true }),
  meetupCode: (id: string) =>
    request<{ code: string }>(`/escrow/${id}/meetup-code`, { auth: true }),
  meetupRelease: (id: string, code: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/meetup/release`, { method: 'POST', body: { code }, auth: true }),
  releaseMilestone: (id: string, milestoneId: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/milestones/${milestoneId}/release`, { method: 'POST', auth: true }),
  dispute: (id: string, reason?: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/dispute`, { method: 'POST', body: { reason }, auth: true }),
  cancel: (id: string) =>
    request<{ escrow: Escrow }>(`/escrow/${id}/cancel`, { method: 'POST', auth: true }),
}

// ─── Conversations ─────────────────────────────────────────────────────────

export const conversationsApi = {
  list: () => request<{ conversations: Conversation[] }>('/conversations', { auth: true }),
  create: (body: { recipientId: string; listingId?: string; content: string }) =>
    request<{ conversationId: string; message: Message }>('/conversations', { method: 'POST', body, auth: true }),
  messages: (id: string, query?: { limit?: number; before?: string }) =>
    request<{ messages: Message[] }>(`/conversations/${id}/messages`, { query, auth: true }),
  sendMessage: (id: string, content: string) =>
    request<{ message: Message }>(`/conversations/${id}/messages`, { method: 'POST', body: { content }, auth: true }),
}

// ─── Notifications ─────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => request<{ notifications: Notification[]; unread: number }>('/notifications', { auth: true }),
  readAll: () => request<{ ok: true }>('/notifications/read-all', { method: 'POST', auth: true }),
  read: (id: string) => request<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST', auth: true }),
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export const reviewsApi = {
  create: (body: { escrowId: string; rating: number; comment?: string }) =>
    request<{ review: Review }>('/reviews', { method: 'POST', body, auth: true }),
}

// ─── Addresses ─────────────────────────────────────────────────────────────

export const addressesApi = {
  list: () => request<{ addresses: Address[] }>('/addresses', { auth: true }),
  create: (body: CreateAddressBody) =>
    request<{ address: Address }>('/addresses', { method: 'POST', body, auth: true }),
  update: (id: string, body: Partial<CreateAddressBody>) =>
    request<{ address: Address }>(`/addresses/${id}`, { method: 'PATCH', body, auth: true }),
  remove: (id: string) =>
    request<{ ok: true }>(`/addresses/${id}`, { method: 'DELETE', auth: true }),
}

// ─── Shipping directory ────────────────────────────────────────────────────

export const shippingApi = {
  carriers: (params?: { country?: string; serviceRange?: ServiceRange }) =>
    request<ShippingDirectory>('/shipping/carriers', { query: params }),
}

// ─── Storage ───────────────────────────────────────────────────────────────

export const storageApi = {
  requestUploadUrl: (body: RequestUploadBody) =>
    request<RequestUploadResponse>('/storage/uploads/request-url', { method: 'POST', body, auth: true }),
}

/**
 * Upload a local file (by URI, from expo-image-picker etc.) to object storage
 * and return its public objectPath.
 */
export async function uploadFile(
  uri: string,
  name: string,
  contentType = 'image/jpeg',
): Promise<string> {
  const fileRes = await fetch(uri)
  const blob = await fileRes.blob()
  const type = blob.type || contentType
  const { uploadURL, objectPath } = await storageApi.requestUploadUrl({
    name,
    size: blob.size,
    contentType: type,
  })
  const res = await fetch(uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': type },
    body: blob,
  })
  if (!res.ok) throw new ApiError(res.status, `Upload failed (${res.status})`, null)
  return objectPath
}
