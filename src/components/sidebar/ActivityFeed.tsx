import { Activity, AlertTriangle, CheckCircle, FastForward, Info, Pause, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const IconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  play: Play,
  pause: Pause,
  seek: FastForward,
};

const ColorMap = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-rose-400',
  play: 'text-emerald-400',
  pause: 'text-amber-400',
  seek: 'text-indigo-400',
};

export function ActivityFeed() {
  const { logs } = useAppStore();

  return (
    <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 max-w-full">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Synchronization Timeline</div>
      <div className="space-y-2 max-w-full">
        {logs.map(log => {
          const Icon = IconMap[log.type] || Info;
          const colorClass = ColorMap[log.type] || 'text-slate-400';
          const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          return (
            <div key={log.id} className="flex items-start gap-2 text-xs p-2 rounded-xl bg-slate-950/70 border border-white/5 transition-all max-w-full">
              <Icon className={`w-3.5 h-3.5 ${colorClass} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 leading-snug font-medium break-words text-[11px] sm:text-xs" dangerouslySetInnerHTML={{ __html: log.message }}></p>
                <span className="text-[9px] text-slate-500 font-mono">{timeStr}</span>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">
            <Activity className="w-7 h-7 mx-auto mb-2 opacity-30" />
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
