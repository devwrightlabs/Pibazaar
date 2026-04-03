import { createClient } from '@supabase/supabase-js'
import type {
  Listing,
  Conversation,
  Message,
  TypingIndicator,
  UserProfile,
  UserPreferences,
  EscrowTransaction,
  ShippingAddress,
  EscrowTimelineEvent,
} from './types'
import {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseAnonKey,
} from './env'

export type Database = {
  public: {
    Tables: {
      listings: {
        Row: Listing
        Insert: Omit<Listing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Listing, 'id'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at'>
        Update: Partial<Omit<Conversation, 'id'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id'>>
      }
      typing_indicators: {
        Row: TypingIndicator
        Insert: Omit<TypingIndicator, 'id'>
        Update: Partial<Omit<TypingIndicator, 'id'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'id' | 'created_at'>
        Update: Partial<Omit<UserProfile, 'id'>>
      }
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserPreferences, 'id'>>
      }
      escrow_transactions: {
        Row: EscrowTransaction
        Insert: Omit<EscrowTransaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EscrowTransaction, 'id'>>
      }
      shipping_addresses: {
        Row: ShippingAddress
        Insert: Omit<ShippingAddress, 'id' | 'created_at'>
        Update: Partial<Omit<ShippingAddress, 'id'>>
      }
      escrow_timeline: {
        Row: EscrowTimelineEvent
        Insert: Omit<EscrowTimelineEvent, 'id' | 'created_at'>
        Update: Partial<Omit<EscrowTimelineEvent, 'id'>>
      }
    }
  }
}

// Warn loudly at module-init time so the issue surfaces immediately in both
// server logs and browser devtools — even before the first query runs.
if (!isSupabaseConfigured) {
  console.error(
    '[PiBazaar] Supabase client is using placeholder credentials. ' +
      'Every query will fail. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export { isSupabaseConfigured }


