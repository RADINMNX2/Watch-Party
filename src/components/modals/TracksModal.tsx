import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Subtitles, Volume2, Upload, Sliders, Check, Plus, 
  Palette, Type, Layers, Eye, RefreshCw, Zap, ShieldCheck 
} from 'lucide-react';
import { useSubtitleStore, SubtitleTrackItem } from '../../store/useSubtitleStore';
import { parseSubtitleFile } from '../../lib/subtitleParser';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const TracksModal: React.FC<Props> = ({ isOpen, onClose, videoRef }) => {
  const { addLog } = useAppStore();
  const { 
    activeTrackId, 
    availableTracks, 
    style, 
    setActiveTrackId, 
    setAvailableTracks, 
    addUploadedTrack, 
    updateStyle 
  } = useSubtitleStore();

  const [activeTab, setActiveTab] = useState<'subtitles' | 'audio' | 'customize'>('subtitles');
  const [audioTracksList, setAudioTracksList] = useState<Array<{ id: number; label: string; language: string; active: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect embedded tracks when modal opens or video changes
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    const vid = videoRef.current;

    // 1. Detect Text/Subtitle Tracks
    const detectedSubTracks: SubtitleTrackItem[] = [];
    if (vid.textTracks && vid.textTracks.length > 0) {
      for (let i = 0; i < vid.textTracks.length; i++) {
        const track = vid.textTracks[i];
        // Hide default native browser subtitle overlays so custom engine renders them
        track.mode = 'hidden';

        detectedSubTracks.push({
          id: `embedded-${i}`,
          label: track.label || `Track #${i + 1} (${track.language || 'Embedded'})`,
          language: track.language || 'Unknown',
          kind: track.kind || 'subtitles',
          source: 'embedded',
          htmlTrackIndex: i,
        });
      }
    }

    // Preserve previously uploaded custom tracks
    const existingUploaded = availableTracks.filter(t => t.source === 'uploaded');
    setAvailableTracks([...detectedSubTracks, ...existingUploaded]);

    // 2. Detect Audio Tracks (if supported by browser API)
    const audioList: Array<{ id: number; label: string; language: string; active: boolean }> = [];
    if ((vid as any).audioTracks && (vid as any).audioTracks.length > 0) {
      const tracks = (vid as any).audioTracks;
      for (let i = 0; i < tracks.length; i++) {
        audioList.push({
          id: i,
          label: tracks[i].label || `Audio Track #${i + 1}`,
          language: tracks[i].language || 'Main',
          active: tracks[i].enabled || false,
        });
      }
    } else {
      audioList.push({
        id: 0,
        label: 'Default Stream Audio (MKV / MP4 Stereo)',
        language: 'Default',
        active: true,
      });
    }
    setAudioTracksList(audioList);

  }, [isOpen, videoRef]);

  // Handle uploading external subtitle file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const cues = parseSubtitleFile(file.name, content);
        const newTrack: SubtitleTrackItem = {
          id: `uploaded-${Date.now()}`,
          label: file.name,
          source: 'uploaded',
          cues,
        };
        addUploadedTrack(newTrack);
        addLog(`Subtitle uploaded: ${file.name} (${cues.length} cues)`, 'success');
      }
    };
    reader.readAsText(file);
  };

  // Toggle audio track
  const selectAudioTrack = (trackId: number) => {
    if (!videoRef.current) return;
    const vid = videoRef.current as any;
    if (vid.audioTracks && vid.audioTracks.length > 0) {
      for (let i = 0; i < vid.audioTracks.length; i++) {
        vid.audioTracks[i].enabled = (i === trackId);
      }
      setAudioTracksList(audioTracksList.map(a => ({ ...a, active: a.id === trackId })));
      addLog(`Switch audio to track #${trackId + 1}`, 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl glass-card rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden p-4 sm:p-6 text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-purple-300">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Audio & Subtitle Manager</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Manage MKV tracks, custom SRT files, and glass visual styling</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-white/10 my-4 shrink-0">
          <button 
            onClick={() => setActiveTab('subtitles')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              activeTab === 'subtitles' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            <Subtitles className="w-4 h-4" />
            <span>Subtitles</span>
          </button>

          <button 
            onClick={() => setActiveTab('audio')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              activeTab === 'audio' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            <Volume2 className="w-4 h-4" />
            <span>Audio Stream</span>
          </button>

          <button 
            onClick={() => setActiveTab('customize')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              activeTab === 'customize' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
            )}
          >
            <Palette className="w-4 h-4" />
            <span>Customizer</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[220px]">
          
          {/* TAB 1: Subtitles */}
          {activeTab === 'subtitles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Select Active Subtitle Track</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".srt,.vtt,.ass,.ssa" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .SRT / .ASS</span>
                </button>
              </div>

              {/* Subtitle List */}
              <div className="space-y-2">
                {/* None Option */}
                <div 
                  onClick={() => setActiveTrackId('none')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs font-semibold",
                    activeTrackId === 'none' 
                      ? "bg-purple-950/50 border-purple-500 text-purple-200 shadow-md" 
                      : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-400">
                      <Subtitles className="w-4 h-4" />
                    </div>
                    <span>Off (Subtitles Disabled)</span>
                  </div>
                  {activeTrackId === 'none' && <Check className="w-4 h-4 text-purple-400" />}
                </div>

                {/* Available Subtitle Tracks */}
                {availableTracks.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => setActiveTrackId(track.id)}
                    className={cn(
                      "p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs font-semibold",
                      activeTrackId === track.id 
                        ? "bg-purple-950/60 border-purple-500 text-purple-200 shadow-md" 
                        : "bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                      <div className="p-1.5 rounded-xl bg-slate-950 border border-white/10 text-purple-400 shrink-0">
                        <Subtitles className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="truncate font-bold text-slate-100">{track.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {track.source === 'uploaded' ? 'Custom External Subtitle' : `Embedded Track (${track.language})`}
                        </p>
                      </div>
                    </div>
                    {activeTrackId === track.id && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Audio Streams */}
          {activeTab === 'audio' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300">Detected Audio Channels</span>
              <div className="space-y-2">
                {audioTracksList.map((track) => (
                  <div 
                    key={track.id}
                    onClick={() => selectAudioTrack(track.id)}
                    className={cn(
                      "p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs font-semibold",
                      track.active 
                        ? "bg-purple-950/60 border-purple-500 text-purple-200 shadow-md" 
                        : "bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-slate-950 border border-white/10 text-emerald-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-100">{track.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Language: {track.language}</p>
                      </div>
                    </div>
                    {track.active && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Customizer */}
          {activeTab === 'customize' && (
            <div className="space-y-4 text-xs">
              
              {/* Font Size Selector */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-purple-400" />
                  <span>Subtitle Font Size</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                    <button 
                      key={sz}
                      onClick={() => updateStyle({ fontSize: sz })}
                      className={cn(
                        "py-1.5 rounded-xl border text-[11px] font-bold capitalize transition",
                        style.fontSize === sz 
                          ? "bg-purple-600 border-purple-400 text-white" 
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>Text Color Palette</span>
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#ffffff', label: 'White' },
                    { color: '#facc15', label: 'Yellow' },
                    { color: '#22d3ee', label: 'Cyan' },
                    { color: '#4ade80', label: 'Green' },
                    { color: '#fb923c', label: 'Orange' },
                  ].map((c) => (
                    <button 
                      key={c.color}
                      onClick={() => updateStyle({ color: c.color })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition relative flex items-center justify-center",
                        style.color === c.color ? "border-purple-400 scale-110 shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {style.color === c.color && <Check className="w-4 h-4 text-slate-950 font-black" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Style */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Glassmorphic Background Container</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'glass', label: 'Frosted Glass Pill 🔮' },
                    { key: 'solid', label: 'Solid Dark Box 🔳' },
                    { key: 'minimal', label: 'Text Shadow Only 👤' },
                    { key: 'none', label: 'Transparent ✨' },
                  ].map((bg) => (
                    <button 
                      key={bg.key}
                      onClick={() => updateStyle({ bgStyle: bg.key as any })}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-[11px] font-bold transition text-left",
                        style.bgStyle === bg.key 
                          ? "bg-purple-600/40 border-purple-400 text-white" 
                          : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Position Slider */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-bold">
                  <span>Vertical Position (Distance from Bottom)</span>
                  <span className="text-purple-400 font-mono">{style.verticalPosition}%</span>
                </div>
                <input 
                  type="range" 
                  min="2" max="75" step="1"
                  value={style.verticalPosition}
                  onChange={(e) => updateStyle({ verticalPosition: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Subtitle Sync Offset Delay */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-bold">
                  <span>Subtitle Sync Delay Correction</span>
                  <span className="text-purple-400 font-mono">
                    {style.syncDelay > 0 ? `+${style.syncDelay.toFixed(1)}s` : `${style.syncDelay.toFixed(1)}s`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateStyle({ syncDelay: style.syncDelay - 0.5 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 hover:bg-slate-800 font-mono font-bold"
                  >
                    -0.5s
                  </button>
                  <input 
                    type="range" 
                    min="-10" max="10" step="0.1"
                    value={style.syncDelay}
                    onChange={(e) => updateStyle({ syncDelay: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <button 
                    onClick={() => updateStyle({ syncDelay: style.syncDelay + 0.5 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 hover:bg-slate-800 font-mono font-bold"
                  >
                    +0.5s
                  </button>
                  <button 
                    onClick={() => updateStyle({ syncDelay: 0 })}
                    className="p-1.5 rounded-xl bg-slate-950 border border-white/10 text-amber-400 hover:bg-slate-800"
                    title="Reset Sync Delay"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-between items-center shrink-0 mt-2">
          <span className="text-[10px] text-purple-300 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Active Subtitle Engine Ready
          </span>
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg active:scale-95"
          >
            Apply & Close
          </button>
        </div>

      </div>
    </div>
  );
};
