import { create } from 'zustand'
import type { SelfUser, ListingDraft } from '@/lib/api/types'
import { EMPTY_DRAFT } from '@/lib/api/types'

interface ModalConfig {
  title: string
  message: string
  variant: 'alert' | 'confirm' | 'info'
  onConfirm?: () => void
  onCancel?: () => void
}

interface AppState {
  // Auth (server state for the logged-in user lives here; everything else is React Query)
  currentUser: SelfUser | null
  isAuthenticated: boolean
  setCurrentUser: (user: SelfUser | null) => void

  // Map
  userLocation: [number, number] | null
  setUserLocation: (location: [number, number] | null) => void
  mapRadius: number
  setMapRadius: (radius: number) => void

  // Create-listing working draft (local continuity; server autosave handled in the page)
  draft: ListingDraft
  setDraft: (patch: Partial<ListingDraft>) => void
  clearDraft: () => void

  // Pi price (USD) for display conversions
  piPriceUsd: number | null
  setPiPriceUsd: (price: number | null) => void

  // Global modal
  modalOpen: boolean
  modalConfig: ModalConfig | null
  openModal: (config: ModalConfig) => void
  closeModal: () => void

  // Theme custom vars
  themeVars: Record<string, string>
  setThemeVars: (vars: Record<string, string>) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: user !== null }),

  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  mapRadius: 50,
  setMapRadius: (radius) => set({ mapRadius: radius }),

  draft: EMPTY_DRAFT,
  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  clearDraft: () => set({ draft: EMPTY_DRAFT }),

  piPriceUsd: null,
  setPiPriceUsd: (price) => set({ piPriceUsd: price }),

  modalOpen: false,
  modalConfig: null,
  openModal: (config) => set({ modalOpen: true, modalConfig: config }),
  closeModal: () => set({ modalOpen: false, modalConfig: null }),

  themeVars: {},
  setThemeVars: (vars) => set({ themeVars: vars }),
}))
