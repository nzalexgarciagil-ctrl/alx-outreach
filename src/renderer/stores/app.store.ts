import { create } from 'zustand'

interface AppState {
  gmailConnected: boolean
  gmailEmail: string | null
  unreadReplies: number
  geminiConfigured: boolean
  setGmailStatus: (connected: boolean, email: string | null) => void
  setUnreadReplies: (count: number) => void
  setGeminiConfigured: (configured: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  gmailConnected: false,
  gmailEmail: null,
  unreadReplies: 0,
  geminiConfigured: false,
  setGmailStatus: (connected, email) => set({ gmailConnected: connected, gmailEmail: email }),
  setUnreadReplies: (count) => set({ unreadReplies: count }),
  setGeminiConfigured: (configured) => set({ geminiConfigured: configured })
}))
