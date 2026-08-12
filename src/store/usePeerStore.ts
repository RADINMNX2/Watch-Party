import { create } from 'zustand';
import { ConnectionState, SyncState } from '../types';

interface PeerState {
  connectionStatus: ConnectionState;
  statusMessage: string;
  peerCount: number;
  
  // Voice State
  isVoiceActive: boolean;
  isMicMuted: boolean;
  isDeafened: boolean;
  remoteAudioStreams: Record<string, MediaStream>;
  
  // Video Sync State
  videoUrl: string;
  isSelfReady: boolean;
  areAllReady: boolean;
  
  // Setters
  setConnectionStatus: (status: ConnectionState, message: string) => void;
  setPeerCount: (count: number) => void;
  setVoiceState: (updates: Partial<PeerState>) => void;
  addRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  setVideoUrl: (url: string) => void;
  setReadyState: (isSelfReady: boolean, areAllReady: boolean) => void;
}

export const usePeerStore = create<PeerState>((set) => ({
  connectionStatus: 'disconnected',
  statusMessage: 'Disconnected',
  peerCount: 1, // Includes self

  isVoiceActive: false,
  isMicMuted: false,
  isDeafened: false,
  remoteAudioStreams: {},

  videoUrl: '',
  isSelfReady: false,
  areAllReady: false,

  setConnectionStatus: (status, message) => set({ connectionStatus: status, statusMessage: message }),
  setPeerCount: (count) => set({ peerCount: count }),
  setVoiceState: (updates) => set((state) => ({ ...state, ...updates })),
  addRemoteStream: (peerId, stream) => set((state) => ({
    remoteAudioStreams: { ...state.remoteAudioStreams, [peerId]: stream }
  })),
  removeRemoteStream: (peerId) => set((state) => {
    const newStreams = { ...state.remoteAudioStreams };
    delete newStreams[peerId];
    return { remoteAudioStreams: newStreams };
  }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setReadyState: (isSelfReady, areAllReady) => set({ isSelfReady, areAllReady }),
}));
