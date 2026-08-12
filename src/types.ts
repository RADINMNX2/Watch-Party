export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface ActivityLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'play' | 'pause' | 'seek';
  timestamp: number;
}

export interface SyncState {
  videoUrl: string;
  currentTime: number;
  isPaused: boolean;
  playbackRate: number;
  subtitleVtt?: string | null;
  subtitleLabel?: string | null;
  embeddedTrackIdx?: number;
}

export interface SignalMessage {
  type: string;
  payload: any;
  sender: string;
  timestamp: number;
  wallTime: number;
}
