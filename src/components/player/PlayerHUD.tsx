import { Headphones, Layers, Maximize, Mic, MicOff, Play, Pause, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePeerStore } from '../../store/usePeerStore';
import { peerManager } from '../../lib/PeerManager';
import { formatTime } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { safePlay, safePause } from '../../lib/videoUtils';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  isPaused: boolean;
  volume: number;
  muted: boolean;
  title: string;
  onTracksClick: () => void;
}

export function PlayerHUD({ videoRef, currentTime, duration, isPaused, volume, muted, title, onTracksClick }: Props) {
  const { isVoiceActive, isMicMuted, isDeafened, areAllReady, isSelfReady } = usePeerStore();
  const [showHUD, setShowHUD] = useState(true);

  useEffect(() => {
    let timer: number;
    const handleActivity = () => {
      setShowHUD(true);
      clearTimeout(timer);
      if (!isPaused) {
        timer = window.setTimeout(() => setShowHUD(false), 3000);
      }
    };
    
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    
    if (!isPaused) timer = window.setTimeout(() => setShowHUD(false), 3000);
    else setShowHUD(true);
    
    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      clearTimeout(timer);
    };
  }, [isPaused]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || !areAllReady) return;
    if (isPaused) {
      safePlay(videoRef.current);
    } else {
      safePause(videoRef.current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = time;
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = document.getElementById('playerContainer');
    if (!document.fullscreenElement) container?.requestFullscreen().catch(console.error);
    else document.exitFullscreen();
  };

  return (
    <AnimatePresence>
      {showHUD && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/60 pointer-events-none"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 pointer-events-auto">
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[60%]">{title}</span>
            <div className="flex items-center gap-1.5">
              {!areAllReady && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Waiting Ready
                </span>
              )}
              <button onClick={onTracksClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/50 text-purple-200 text-[11px] font-bold transition active:scale-95">
                <Layers className="w-3.5 h-3.5" />
                <span>Tracks</span>
              </button>
            </div>
          </div>

          {/* Center Play Button */}
          <div className="flex-1 flex items-center justify-center pointer-events-none">
            {areAllReady && (
              <button 
                onClick={togglePlay}
                className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-white flex items-center justify-center shadow-2xl backdrop-blur-xl transition-all hover:scale-110 active:scale-90"
              >
                {isPaused ? <Play className="w-6 h-6 ml-1 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
              </button>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <input 
              type="range" 
              min="0" max="100" 
              value={duration > 0 ? (currentTime / duration) * 100 : 0} 
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 transition active:scale-90">
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                </button>
                <span className="text-[11px] sm:text-xs font-mono font-medium text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={() => peerManager.toggleMute()} disabled={!isVoiceActive} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition">
                  {isMicMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className={cn("w-4 h-4", isVoiceActive ? "text-emerald-400" : "text-slate-400")} />}
                </button>
                <button onClick={() => peerManager.toggleDeafen()} disabled={!isVoiceActive} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition">
                  {isDeafened ? <Headphones className="w-4 h-4 text-amber-400" /> : <Headphones className="w-4 h-4 text-slate-400" />}
                </button>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => videoRef.current && (videoRef.current.muted = !muted)} className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition">
                    {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={muted ? 0 : volume} 
                    onChange={e => videoRef.current && (videoRef.current.volume = parseFloat(e.target.value))}
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 hidden sm:block"
                  />
                </div>
                
                <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
