import { CheckCircle, Film, Layers, Link2, PlayCircle, RefreshCw, Subtitles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePeerStore } from '../../store/usePeerStore';
import { useAppStore } from '../../store/useAppStore';
import { peerManager } from '../../lib/PeerManager';
import { cn, formatTime } from '../../lib/utils';
import { PlayerHUD } from './PlayerHUD';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { videoUrl, setVideoUrl, isSelfReady, areAllReady } = usePeerStore();
  const { addLog, isHost } = useAppStore();
  
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [showTracksModal, setShowTracksModal] = useState(false);
  
  // HUD states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  
  const [bufferedTime, setBufferedTime] = useState(0);
  const [subtitleLabel, setSubtitleLabel] = useState('Hardsub / None');
  
  const isRemoteAction = useRef(false);
  const actionLockTimer = useRef<number | null>(null);

  const executeRemoteAction = (action: () => void) => {
    isRemoteAction.current = true;
    action();
    if (actionLockTimer.current) clearTimeout(actionLockTimer.current);
    actionLockTimer.current = window.setTimeout(() => {
      isRemoteAction.current = false;
    }, 600);
  };

  useEffect(() => {
    peerManager.onSyncSignal = (payload, type, networkLatency) => {
      if (!videoRef.current) return;
      const vid = videoRef.current;

      const applySeek = (targetTime: number) => {
        if (Math.abs(vid.currentTime - targetTime) > 0.15) {
          vid.currentTime = targetTime;
        }
      };

      const safePlay = () => {
        vid.play().catch(err => {
          if (err.name === 'NotAllowedError') setAutoplayBlocked(true);
        });
      };

      switch(type) {
        case 'INIT_STATE':
        case 'SYNC_STATE':
          executeRemoteAction(() => {
            if (payload.videoUrl && payload.videoUrl !== vid.src) {
              setVideoUrl(payload.videoUrl);
            }
            if (payload.playbackRate) vid.playbackRate = payload.playbackRate;
            applySeek(payload.currentTime + (payload.isPaused ? 0 : networkLatency));
            if (payload.isPaused && !vid.paused) vid.pause();
            else if (!payload.isPaused && vid.paused) safePlay();
          });
          break;
        case 'PLAY':
          executeRemoteAction(() => {
            applySeek(payload.currentTime + networkLatency);
            safePlay();
          });
          break;
        case 'PAUSE':
          executeRemoteAction(() => {
            vid.pause();
            applySeek(payload.currentTime);
          });
          break;
        case 'SEEK':
          executeRemoteAction(() => applySeek(payload.currentTime));
          break;
        case 'LOAD_VIDEO':
          executeRemoteAction(() => {
            setVideoUrl(payload.url);
            peerManager.setSelfReady(false);
          });
          addLog(`New video loaded`, 'info');
          break;
        case 'RATE_CHANGE':
          executeRemoteAction(() => vid.playbackRate = payload.rate);
          break;
        case 'HEARTBEAT':
          if (!isHost && !vid.paused && !isRemoteAction.current) {
            const expectedTime = payload.currentTime + networkLatency;
            const diff = expectedTime - vid.currentTime;
            if (Math.abs(diff) > 0.15 && Math.abs(diff) < 0.6) {
              vid.playbackRate = diff > 0 ? 1.04 : 0.96;
            } else if (Math.abs(diff) >= 0.6) {
              vid.playbackRate = 1.0;
              executeRemoteAction(() => { vid.currentTime = expectedTime; });
            } else {
              vid.playbackRate = 1.0;
            }
          }
          break;
      }
    };
  }, [isHost, setVideoUrl]);

  useEffect(() => {
    let hb: number;
    if (isHost && !isPaused && !isRemoteAction.current) {
      hb = window.setInterval(() => {
        peerManager.broadcast('HEARTBEAT', { currentTime: videoRef.current?.currentTime || 0 });
      }, 2500);
    }
    return () => clearInterval(hb);
  }, [isHost, isPaused]);

  const handleLoadUrl = () => {
    if (!inputUrl) return;
    setVideoUrl(inputUrl);
    peerManager.setSelfReady(false);
    peerManager.broadcast('LOAD_VIDEO', { url: inputUrl });
    addLog(`You loaded a new video`, 'info');
  };

  const handleForceResync = () => {
    if (isHost) {
      peerManager.broadcast('SYNC_STATE', {
        videoUrl: videoUrl,
        currentTime: videoRef.current?.currentTime || 0,
        isPaused: videoRef.current?.paused || true,
        playbackRate: videoRef.current?.playbackRate || 1,
      });
      addLog('Forced precision sync to peers', 'success');
    } else {
      // Need a way to request state, we can use an empty connection in peerManager.
      // But for simplicity, we just trigger request state to host if we keep track of host connection.
      // Or just broadcast a REQUEST_STATE (which host will catch)
      peerManager.broadcast('REQUEST_STATE', {});
      addLog('Requested sync from Host', 'info');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-full min-w-0 h-full">
      
      {/* Video Loader Input Card */}
      <div className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 max-w-full">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
          <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 sm:py-2.5 focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all min-w-0">
            <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
            <input 
              type="url" 
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="Paste direct MP4 or WebM video URL..." 
              className="bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none w-full truncate select-text"
            />
          </div>
          <button 
            onClick={handleLoadUrl}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-90 active:scale-95 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Load Video</span>
          </button>
        </div>
      </div>

      {/* Video Stage */}
      <div id="playerContainer" className="relative group rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl aspect-video flex items-center justify-center max-w-full">
        
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-pink-600/20 blur-2xl opacity-50 group-hover:opacity-80 transition duration-500 pointer-events-none"></div>

        <video 
          ref={videoRef}
          src={videoUrl}
          className="relative z-10 w-full h-full object-contain bg-black max-w-full cursor-pointer" 
          preload="auto" 
          crossOrigin="anonymous"
          onClick={() => {
            if (!videoRef.current) return;
            if (!areAllReady) {
              addLog('Wait for all peers to be Ready', 'warning');
              return;
            }
            if (videoRef.current.paused) videoRef.current.play().catch(console.error);
            else videoRef.current.pause();
          }}
          onPlay={() => {
            setIsPaused(false);
            if (!isRemoteAction.current) {
              peerManager.broadcast('PLAY', { currentTime: videoRef.current?.currentTime || 0 });
              addLog(`You played the video`, 'play');
            }
          }}
          onPause={() => {
            setIsPaused(true);
            if (!isRemoteAction.current) {
              peerManager.broadcast('PAUSE', { currentTime: videoRef.current?.currentTime || 0 });
              addLog(`You paused the video`, 'pause');
            }
          }}
          onSeeked={() => {
            if (!isRemoteAction.current) {
              peerManager.broadcast('SEEK', { currentTime: videoRef.current?.currentTime || 0 });
              addLog(`You seeked`, 'seek');
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              setDuration(videoRef.current.duration || 0);
              
              let buf = 0;
              const v = videoRef.current;
              for (let i = 0; i < v.buffered.length; i++) {
                if (v.buffered.start(i) <= v.currentTime) {
                  buf = Math.max(buf, v.buffered.end(i) - v.currentTime);
                }
              }
              setBufferedTime(buf);
            }
          }}
          onVolumeChange={() => {
            if (videoRef.current) {
              setVolume(videoRef.current.volume);
              setMuted(videoRef.current.muted);
            }
          }}
          onError={() => {
            if (videoUrl) {
              setError(true);
              addLog('Video failed to load', 'error');
            }
          }}
        />

        {/* Overlays */}
        {error && (
          <div className="absolute inset-0 bg-slate-950 z-30 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-xs sm:text-base font-bold text-slate-200 mb-1">Unable to Load Video</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm">Please paste a direct MP4 or WebM video download URL above.</p>
          </div>
        )}

        {autoplayBlocked && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3 animate-bounce">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-lg font-bold text-white mb-1">Autoplay Blocked</h3>
            <button 
              onClick={() => { setAutoplayBlocked(false); videoRef.current?.play(); }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-semibold text-xs shadow-lg transition"
            >
              Resume Playback
            </button>
          </div>
        )}

        {!areAllReady && videoUrl && !error && (
          <div className="absolute inset-0 z-25 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
            <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
              <Film className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1">Pre-Buffering Stream</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mb-3">Buffering at least 10s for all peers to guarantee 100% smooth sync...</p>
            
            <div className="w-48 bg-slate-900 border border-white/10 rounded-full h-2 overflow-hidden mb-3">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (bufferedTime / 10) * 100)}%` }}></div>
            </div>

            <button 
              onClick={() => peerManager.setSelfReady(!isSelfReady)}
              className={cn(
                "px-5 py-2 rounded-full font-bold text-xs shadow-xl transition active:scale-95 flex items-center gap-2 border backdrop-blur-md",
                isSelfReady ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/30" : "bg-slate-900 text-slate-200 border-white/10"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSelfReady ? "You are Ready! ✅" : "I'm Ready 🍿"}</span>
            </button>
          </div>
        )}

        <PlayerHUD 
          videoRef={videoRef}
          currentTime={currentTime}
          duration={duration}
          isPaused={isPaused}
          volume={volume}
          muted={muted}
          title={videoUrl ? videoUrl.split('/').pop()?.split('?')[0] || 'Video Stream' : 'No Video Loaded'}
          onTracksClick={() => setShowTracksModal(true)}
        />
      </div>

      <div className="glass-card rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-400 max-w-full">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            P2P Engine
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1.5 text-slate-400 text-xs truncate">
            <Subtitles className="w-3.5 h-3.5 text-purple-400" />
            Sub: <strong className="text-slate-200 font-bold truncate">{subtitleLabel}</strong>
          </span>
        </div>
        <button onClick={handleForceResync} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition active:scale-95 text-xs shrink-0">
          <RefreshCw className="w-3 h-3 text-purple-400" />
          <span className="font-semibold">Resync</span>
        </button>
      </div>

    </div>
  );
}
