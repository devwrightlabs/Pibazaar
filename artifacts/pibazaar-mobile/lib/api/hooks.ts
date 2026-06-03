// React Query hooks over the typed API client.

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  listingsApi,
  usersApi,
  escrowApi,
  conversationsApi,
  notificationsApi,
  reviewsApi,
  addressesApi,
  shippingApi,
} from './client'
import { subscribeRealtime } from '../realtime'
import type {
  ListingQuery,
  ListingInput,
  CreateEscrowBody,
  CreateAddressBody,
  UpdateProfileBody,
  ServiceRange,
  Message,
} from './types'

export const qk = {
  listings: (q?: ListingQuery) => ['listings', q ?? {}] as const,
  listing: (id: string) => ['listing', id] as const,
  myListings: (status?: string) => ['my-listings', status ?? 'all'] as const,
  dashboard: () => ['dashboard'] as const,
  user: (id: string) => ['user', id] as const,
  userListings: (id: string) => ['user-listings', id] as const,
  userReviews: (id: string) => ['user-reviews', id] as const,
  escrows: (role?: string) => ['escrows', role ?? 'all'] as const,
  escrow: (id: string) => ['escrow', id] as const,
  conversations: () => ['conversations'] as const,
  messages: (id: string) => ['messages', id] as const,
  notifications: () => ['notifications'] as const,
  addresses: () => ['addresses'] as const,
  carriers: (p?: { country?: string; serviceRange?: ServiceRange }) =>
    ['carriers', p ?? {}] as const,
}

// ─── Listings ──────────────────────────────────────────────────────────────

export function useListings(query?: ListingQuery, enabled = true) {
  return useQuery({
    queryKey: qk.listings(query),
    queryFn: () => listingsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: qk.listing(id ?? ''),
    queryFn: () => listingsApi.get(id as string),
    enabled: !!id,
  })
}

export function useMyListings(status?: string) {
  return useQuery({
    queryKey: qk.myListings(status),
    queryFn: () => usersApi.myListings(status),
  })
}

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard(), queryFn: () => usersApi.dashboard() })
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: qk.user(id ?? ''),
    queryFn: () => usersApi.get(id as string),
    enabled: !!id,
  })
}

export function useUserListings(id: string | undefined) {
  return useQuery({
    queryKey: qk.userListings(id ?? ''),
    queryFn: () => usersApi.listings(id as string),
    enabled: !!id,
  })
}

export function useUserReviews(id: string | undefined) {
  return useQuery({
    queryKey: qk.userReviews(id ?? ''),
    queryFn: () => usersApi.reviews(id as string),
    enabled: !!id,
  })
}

export function useCreateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ListingInput) => listingsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['my-listings'] })
      qc.invalidateQueries({ queryKey: qk.dashboard() })
    },
  })
}

export function useUpdateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ListingInput }) =>
      listingsApi.update(id, body),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.listing(id) })
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['my-listings'] })
    },
  })
}

export function useDeleteListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['my-listings'] })
      qc.invalidateQueries({ queryKey: qk.dashboard() })
    },
  })
}

// ─── Escrow ────────────────────────────────────────────────────────────────

export function useEscrows(role?: 'buyer' | 'seller') {
  return useQuery({ queryKey: qk.escrows(role), queryFn: () => escrowApi.list(role) })
}

export function useEscrow(id: string | undefined) {
  return useQuery({
    queryKey: qk.escrow(id ?? ''),
    queryFn: () => escrowApi.get(id as string),
    enabled: !!id,
  })
}

export function useCreateEscrow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEscrowBody) => escrowApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escrows'] }),
  })
}

/** Generic invalidator for the per-escrow lifecycle actions. */
export function useEscrowAction<TArgs>(
  fn: (args: TArgs) => Promise<{ escrow: { id: string } }>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ escrow }) => {
      qc.invalidateQueries({ queryKey: qk.escrow(escrow.id) })
      qc.invalidateQueries({ queryKey: ['escrows'] })
      qc.invalidateQueries({ queryKey: qk.dashboard() })
    },
  })
}

// ─── Conversations & messages ───────────────────────────────────────────────

export function useConversations() {
  return useQuery({ queryKey: qk.conversations(), queryFn: () => conversationsApi.list() })
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: qk.messages(conversationId ?? ''),
    queryFn: () => conversationsApi.messages(conversationId as string),
    enabled: !!conversationId,
  })
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => conversationsApi.sendMessage(conversationId, content),
    onSuccess: ({ message }) => {
      qc.setQueryData<{ messages: Message[] }>(qk.messages(conversationId), (prev) =>
        prev ? { messages: [...prev.messages, message] } : { messages: [message] },
      )
      qc.invalidateQueries({ queryKey: qk.conversations() })
    },
  })
}

export function useStartConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { recipientId: string; listingId?: string; content: string }) =>
      conversationsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations() }),
  })
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({ queryKey: qk.notifications(), queryFn: () => notificationsApi.list() })
}

export function useReadNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications() }),
  })
}

export function useReadAllNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications() }),
  })
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { escrowId: string; rating: number; comment?: string }) =>
      reviewsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-reviews'] }),
  })
}

// ─── Addresses ─────────────────────────────────────────────────────────────

export function useAddresses() {
  return useQuery({ queryKey: qk.addresses(), queryFn: () => addressesApi.list() })
}

export function useCreateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAddressBody) => addressesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  })
}

// ─── Shipping directory ─────────────────────────────────────────────────────

export function useShippingCarriers(params?: { country?: string; serviceRange?: ServiceRange }) {
  return useQuery({
    queryKey: qk.carriers(params),
    queryFn: () => shippingApi.carriers(params),
  })
}

// ─── Profile ───────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => usersApi.updateMe(body),
  })
}

// ─── Realtime bridge ────────────────────────────────────────────────────────

/** Subscribe once (e.g. in a top-level provider) to keep query caches live. */
export function useRealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    return subscribeRealtime((event) => {
      if (event.type === 'message') {
        const msg = event.payload
        qc.setQueryData<{ messages: Message[] }>(qk.messages(msg.conversationId), (prev) => {
          if (!prev) return prev
          if (prev.messages.some((m) => m.id === msg.id)) return prev
          return { messages: [...prev.messages, msg] }
        })
        qc.invalidateQueries({ queryKey: qk.conversations() })
      } else if (event.type === 'notification') {
        qc.invalidateQueries({ queryKey: qk.notifications() })
      }
      qc.invalidateQueries({ queryKey: qk.dashboard() })
    })
  }, [qc])
}
