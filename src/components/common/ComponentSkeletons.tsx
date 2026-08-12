import React from 'react';
import { Zap, Film, MessageSquare, Activity, Mic } from 'lucide-react';

export const PlayerSkeleton: React.FC = () => (
  <div className="w-full aspect-video rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-purple-500/20 relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl animate-pulse">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-shimmer"></div>
    <div className="p-4 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-3">
      <Film className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
    <div className="h-4 w-48 bg-slate-800 rounded-full mb-2"></div>
    <div className="h-3 w-32 bg-slate-900 rounded-full"></div>
    <div className="absolute bottom-4 left-4 right-4 h-12 bg-slate-900/90 rounded-2xl border border-white/5 flex items-center justify-between px-4">
      <div className="h-4 w-20 bg-slate-800 rounded"></div>
      <div className="h-4 w-12 bg-slate-800 rounded"></div>
    </div>
  </div>
);

export const SidebarSkeleton: React.FC = () => (
  <div className="w-full h-[380px] lg:h-[420px] rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-purple-500/20 relative overflow-hidden flex flex-col p-4 shadow-xl animate-pulse">
    <div className="flex gap-2 mb-4">
      <div className="h-8 flex-1 bg-slate-900 rounded-xl"></div>
      <div className="h-8 flex-1 bg-slate-900 rounded-xl"></div>
    </div>
    <div className="flex-1 space-y-3 p-2">
      <div className="h-10 bg-slate-900/60 rounded-xl w-3/4"></div>
      <div className="h-10 bg-slate-900/60 rounded-xl w-1/2 ml-auto"></div>
      <div className="h-10 bg-slate-900/60 rounded-xl w-2/3"></div>
    </div>
  </div>
);

export const VoiceSkeleton: React.FC = () => (
  <div className="w-full h-32 rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-purple-500/20 relative overflow-hidden p-4 animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
        <Mic className="w-5 h-5 text-purple-400" />
      </div>
      <div className="space-y-1">
        <div className="h-3 w-28 bg-slate-800 rounded"></div>
        <div className="h-2 w-20 bg-slate-900 rounded"></div>
      </div>
    </div>
  </div>
);
