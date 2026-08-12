import { Copy, Settings, Tv } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { usePeerStore } from '../../store/usePeerStore';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export function Header() {
  const { userProfile, setIsWizardOpen, roomId } = useAppStore();
  const { connectionStatus, statusMessage } = usePeerStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (roomId) {
      navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-6 py-3 border-b border-white/5 bg-[#0d121e]/75 backdrop-blur-xl max-w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            className="relative group cursor-pointer" 
            onClick={() => setIsWizardOpen(true)}
            title="Edit Profile"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                WatchParty
              </h1>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">Millisecond Precision Cinema Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full border text-[11px] sm:text-xs font-semibold transition-all shrink-0",
            connectionStatus === 'connected' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' :
            connectionStatus === 'connecting' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' :
            'bg-rose-950/40 border-rose-500/30 text-rose-300'
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' :
              connectionStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
            )}></span>
            <span className="truncate max-w-[100px] sm:max-w-none">{statusMessage}</span>
          </div>

          {roomId && (
            <div className="hidden sm:flex items-center gap-1.5 bg-purple-950/30 border border-purple-500/30 rounded-full pl-3.5 pr-1 py-1 shadow-inner shrink-0">
              <span className="text-xs text-purple-300 font-mono font-bold tracking-wider select-text">{roomId}</span>
              <button 
                onClick={handleCopy}
                title="Copy Room Link" 
                className="p-1.5 hover:bg-purple-500/20 rounded-full text-purple-400 hover:text-white transition-all active:scale-90"
              >
                <Copy className={cn("w-3.5 h-3.5", copied && "text-emerald-400")} />
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 transition hover:border-purple-500/30 active:scale-95 shrink-0"
          >
            <Settings className="w-4 h-4 text-purple-400" />
          </button>
        </div>

      </div>
    </header>
  );
}
