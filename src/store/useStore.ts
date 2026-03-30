import { create } from 'zustand'
import type { Listing, Conversation, Message, UserProfile, CreateListingForm } from '@/lib/types'

const DEFAULT_FORM: CreateListingForm = {
  title: '',
  description: '',
  price_pi: 0,
  category: '',
  condition: 'new',
  images: [],
  location_city: '',
  location_country: '',
  allow_offers: true,
  fast_seller_agreed: false,
}

interface AppState {
  // Auth
  currentUser: UserProfile | null
  isAuthenticated: boolean
  setCurrentUser: (user: UserProfile | null) => void

  // Listings
  listings: Listing[]
  setListings: (listings: Listing[]) => void

  // Chat
  conversations: Conversation[]
  setConversations: (conversations: Conversation[]) => void
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  messages: Record<string, Message[]>
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void

  // Map
  userLocation: [number, number] | null
  setUserLocation: (location: [number, number] | null) => void
  mapRadius: number
  setMapRadius: (radius: number) => void

  // Create Listing
  createListingForm: CreateListingForm
  saveDraft: (form: Partial<CreateListingForm>) => void
  clearDraft: () => void
  piPriceUsd: number | null
  setPiPriceUsd: (price: number | null) => void

  // UI
  modalOpen: boolean
  modalConfig: {
    title: string
    message: string
    variant: 'alert' | 'confirm' | 'info'
    onConfirm?: () => void
    onCancel?: () => void
  } | null
  openModal: (config: AppState['modalConfig']) => void
  closeModal: () => void

  // Theme
  themeVars: Record<string, string>
  setThemeVars: (vars: Record<string, string>) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: user !== null }),

  listings: [],
  setListings: (listings) => set({ listings }),

  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  messages: {},
  setMessages: (conversationId, messages) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: messages } })),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  mapRadius: 50,
  setMapRadius: (radius) => set({ mapRadius: radius }),

  createListingForm: DEFAULT_FORM,
  saveDraft: (form) =>
    set((state) => ({ createListingForm: { ...state.createListingForm, ...form } })),
  clearDraft: () => set({ createListingForm: DEFAULT_FORM }),
  piPriceUsd: null,
  setPiPriceUsd: (price) => set({ piPriceUsd: price }),

  modalOpen: false,
  modalConfig: null,
  openModal: (config) => set({ modalOpen: true, modalConfig: config }),
  closeModal: () => set({ modalOpen: false, modalConfig: null }),

  themeVars: {},
  setThemeVars: (vars) => set({ themeVars: vars }),
}))
