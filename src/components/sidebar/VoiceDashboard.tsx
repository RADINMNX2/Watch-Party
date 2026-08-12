import { Headphones, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { usePeerStore } from '../../store/usePeerStore';
import { peerManager } from '../../lib/PeerManager';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';

export function VoiceDashboard() {
  const { isVoiceActive, isMicMuted, isDeafened, remoteAudioStreams } = usePeerStore();
  const { userProfile } = useAppStore();
  const [volumeLevel, setVolumeLevel] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isVoiceActive && !isMicMuted && peerManager.localStream) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(peerManager.localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setVolumeLevel(sum / dataArray.length);
        rafRef.current = requestAnimationFrame(updateMeter);
      };
      
      updateMeter();

      return () => {
        cancelAnimationFrame(rafRef.current);
        audioCtx.close().catch(console.error);
      };
    } else {
      setVolumeLevel(0);
    }
  }, [isVoiceActive, isMicMuted]);

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl p-4 border border-white/10 flex flex-col gap-3 shadow-2xl max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Voice Dashboard</span>
        </div>
        <span className={cn(
          "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
          isVoiceActive ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-purple-500/10 text-purple-300 border-purple-500/20"
        )}>
          {isVoiceActive ? "Connected Studio HD" : "Disconnected"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 my-0.5 max-w-full">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-white/5 relative overflow-hidden min-w-0">
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-[10px] font-bold text-purple-200 overflow-hidden">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{userProfile.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
              {isMicMuted ? <MicOff className="w-2.5 h-2.5 text-rose-400" /> : <Mic className="w-2.5 h-2.5 text-emerald-400" />}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-200 truncate">You</p>
            <p className="text-[9px] text-slate-500 truncate">{isMicMuted ? "Muted" : (isVoiceActive ? "Active" : "Inactive")}</p>
          </div>
        </div>
      </div>

      {isVoiceActive && (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-950/80 border border-white/5 max-w-full">
          <span className="text-[10px] font-semibold text-slate-400">Mic Sensitivity:</span>
          <div className="flex items-center gap-1 h-3.5">
            {[0.4, 0.8, 1.2, 0.7, 0.3].map((mult, i) => (
              <span key={i} className="w-1 bg-emerald-400 rounded-full transition-all duration-75" style={{ height: Math.min(14, Math.max(3, volumeLevel * mult)) }} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button 
          onClick={() => peerManager.toggleVoice()} 
          className={cn(
            "py-2.5 px-2 rounded-xl text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 shrink-0 active:scale-95",
            isVoiceActive ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-600/20" : "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-600/20"
          )}
        >
          {isVoiceActive ? <PhoneOff className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span>{isVoiceActive ? "Leave" : "Connect"}</span>
        </button>

        <button 
          onClick={() => peerManager.toggleMute()} 
          disabled={!isVoiceActive}
          className={cn(
            "py-2.5 px-2 rounded-xl border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
            !isVoiceActive ? "bg-slate-950 opacity-40 cursor-not-allowed text-slate-300" : "bg-slate-900 hover:bg-slate-800 text-slate-200 active:scale-95"
          )}
        >
          {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Mute</span>
        </button>

        <button 
          onClick={() => peerManager.toggleDeafen()} 
          disabled={!isVoiceActive}
          className={cn(
            "py-2.5 px-2 rounded-xl border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1 shrink-0",
            !isVoiceActive ? "bg-slate-950 opacity-40 cursor-not-allowed text-slate-300" : "bg-slate-900 hover:bg-slate-800 text-slate-200 active:scale-95"
          )}
        >
          {isDeafened ? <Headphones className="w-3.5 h-3.5 text-amber-400" /> : <Headphones className="w-3.5 h-3.5 text-slate-400" />}
          <span>Deafen</span>
        </button>
      </div>

      {Object.entries(remoteAudioStreams).map(([peerId, stream]) => (
        <audio key={peerId} autoPlay playsInline muted={isDeafened} ref={(el) => {
          if (el && el.srcObject !== stream) el.srcObject = stream;
        }} className="hidden" />
      ))}
    </div>
  );
}
