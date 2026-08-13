import { create } from 'zustand';

interface UIStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  modalState: Record<string, boolean>;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  sidebarOpen: false,
  modalState: {},
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  openModal: (modalId) =>
    set((state) => ({
      modalState: { ...state.modalState, [modalId]: true },
    })),
  closeModal: (modalId) =>
    set((state) => ({
      modalState: { ...state.modalState, [modalId]: false },
    })),
}));
