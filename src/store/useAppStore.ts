import { create } from 'zustand';
import { ActivityLog, ChatMessage, UserProfile } from '../types';

interface AppState {
  // User Profile
  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  
  // Room
  roomId: string | null;
  isHost: boolean;
  setRoomInfo: (roomId: string, isHost: boolean) => void;
  
  // UI State
  wizardStep: number;
  setWizardStep: (step: number) => void;
  isWizardOpen: boolean;
  setIsWizardOpen: (isOpen: boolean) => void;
  activeSidebarTab: 'activity' | 'chat';
  setActiveSidebarTab: (tab: 'activity' | 'chat') => void;

  // Logs & Chat
  logs: ActivityLog[];
  addLog: (message: string, type?: ActivityLog['type']) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userProfile: {
    id: Math.random().toString(36).substring(2, 9),
    name: localStorage.getItem('watchparty_username') || 'Viewer',
    avatarUrl: localStorage.getItem('watchparty_avatar') || null,
  },
  setUserProfile: (updates) => set((state) => {
    const newProfile = { ...state.userProfile, ...updates };
    localStorage.setItem('watchparty_username', newProfile.name);
    if (newProfile.avatarUrl) {
      localStorage.setItem('watchparty_avatar', newProfile.avatarUrl);
    }
    return { userProfile: newProfile };
  }),

  roomId: null,
  isHost: false,
  setRoomInfo: (roomId, isHost) => set({ roomId, isHost }),

  wizardStep: localStorage.getItem('watchparty_username') ? 2 : 1,
  setWizardStep: (step) => set({ wizardStep: step }),
  isWizardOpen: true,
  setIsWizardOpen: (isOpen) => set({ isWizardOpen: isOpen }),

  activeSidebarTab: 'activity',
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  logs: [],
  addLog: (message, type = 'info') => set((state) => ({
    logs: [{ id: Math.random().toString(36).substring(2, 9), message, type, timestamp: Date.now() }, ...state.logs].slice(0, 100)
  })),

  chatMessages: [],
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, msg]
  })),
}));
