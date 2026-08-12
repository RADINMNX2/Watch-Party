import { create } from 'zustand';
import { SubtitleCue } from '../lib/subtitleParser';

export interface SubtitleTrackItem {
  id: string;
  label: string;
  language?: string;
  kind?: string;
  source: 'embedded' | 'uploaded';
  cues?: SubtitleCue[];
  htmlTrackIndex?: number;
}

export interface SubtitleStyle {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'vazir' | 'jakarta' | 'sans' | 'serif' | 'mono';
  color: string;
  bgStyle: 'glass' | 'solid' | 'minimal' | 'none';
  verticalPosition: number; // 0 (bottom) to 80 (near top)
  syncDelay: number; // offset in seconds (-10 to +10)
}

interface SubtitleState {
  activeTrackId: string; // 'none' or track id
  availableTracks: SubtitleTrackItem[];
  style: SubtitleStyle;
  
  // Actions
  setActiveTrackId: (id: string) => void;
  setAvailableTracks: (tracks: SubtitleTrackItem[]) => void;
  addUploadedTrack: (track: SubtitleTrackItem) => void;
  updateStyle: (styleUpdates: Partial<SubtitleStyle>) => void;
}

export const useSubtitleStore = create<SubtitleState>((set) => ({
  activeTrackId: 'none',
  availableTracks: [],
  style: {
    fontSize: 'medium',
    fontFamily: 'vazir',
    color: '#ffffff',
    bgStyle: 'glass',
    verticalPosition: 12,
    syncDelay: 0,
  },

  setActiveTrackId: (id) => set({ activeTrackId: id }),
  setAvailableTracks: (tracks) => set({ availableTracks: tracks }),
  addUploadedTrack: (track) => set((state) => ({
    availableTracks: [...state.availableTracks, track],
    activeTrackId: track.id,
  })),
  updateStyle: (styleUpdates) => set((state) => ({
    style: { ...state.style, ...styleUpdates },
  })),
}));
