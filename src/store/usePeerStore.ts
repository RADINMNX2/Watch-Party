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

  // QoS and Network Stats
  networkStats: {
    ping: number;
    jitter: number;
    packetLoss: number;
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  };

  p2pInfo: {
    candidateType: string;
    protocol: string;
    iceState: string;
    stunClusterCount: number;
    activeStunNode: string;
  };
  
  // Setters
  setConnectionStatus: (status: ConnectionState, message: string) => void;
  setPeerCount: (count: number) => void;
  setVoiceState: (updates: Partial<PeerState>) => void;
  addRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  setVideoUrl: (url: string) => void;
  setReadyState: (isSelfReady: boolean, areAllReady: boolean) => void;
  updateNetworkStats: (stats: Partial<PeerState['networkStats']>) => void;
  updateP2pInfo: (info: Partial<PeerState['p2pInfo']>) => void;
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

  networkStats: {
    ping: 0,
    jitter: 0,
    packetLoss: 0,
    quality: 'Excellent'
  },

  p2pInfo: {
    candidateType: 'STUN Hole Punch (UDP)',
    protocol: 'DTLS / UDP',
    iceState: 'Connected',
    stunClusterCount: 14,
    activeStunNode: 'google-global-edge-01'
  },

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
  updateNetworkStats: (stats) => set((state) => {
    const newStats = { ...state.networkStats, ...stats };
    
    // Auto-calculate quality based on ping and jitter
    if (newStats.ping < 50 && newStats.jitter < 15) newStats.quality = 'Excellent';
    else if (newStats.ping < 120 && newStats.jitter < 30) newStats.quality = 'Good';
    else if (newStats.ping < 250 && newStats.jitter < 60) newStats.quality = 'Fair';
    else newStats.quality = 'Poor';

    return { networkStats: newStats };
  }),
  updateP2pInfo: (info) => set((state) => ({ p2pInfo: { ...state.p2pInfo, ...info } })),
}));
