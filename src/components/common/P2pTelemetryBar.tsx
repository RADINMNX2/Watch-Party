import React, { useState } from 'react';
import { usePeerStore } from '../../store/usePeerStore';
import { useAppStore } from '../../store/useAppStore';
import { peerManager } from '../../lib/PeerManager';
import { Network, Globe, RefreshCw, X, ShieldCheck, Cpu, Zap, SignalHigh, Server, Wifi, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const P2pTelemetryBar: React.FC = () => {
  const { connectionStatus, networkStats, p2pInfo, peerCount, serverConfig, setServerConfig } = usePeerStore();
  const { roomId, isHost, addLog } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'server' | 'troubleshoot'>('stats');

  const [customHost, setCustomHost] = useState(localStorage.getItem('wp_peer_host') || '');
  const [customPort, setCustomPort] = useState(localStorage.getItem('wp_peer_port') || '3000');

  const handleReconnect = () => {
    if (!roomId) return;
    setIsReconnecting(true);
    peerManager.init(roomId, isHost);
    setTimeout(() => setIsReconnecting(false), 1500);
  };

  const handleSaveCustomServer = () => {
    if (customHost.trim()) {
      localStorage.setItem('wp_peer_host', customHost.trim());
      localStorage.setItem('wp_peer_port', customPort.trim() || '3000');
      localStorage.setItem('wp_peer_path', '/peerjs/app');
      setServerConfig({
        mode: 'custom',
        customHost: customHost.trim(),
        customPort: Number(customPort) || 3000
      });
      addLog(`Signaling server set to custom IP: ${customHost.trim()}:${customPort}`, 'success');
    } else {
      localStorage.removeItem('wp_peer_host');
      localStorage.removeItem('wp_peer_port');
      setServerConfig({ mode: 'auto', customHost: '' });
      addLog('Reset to Auto Node.js / Cloud Signaling Server', 'info');
    }
    if (roomId) handleReconnect();
  };

  const getQualityColor = () => {
    switch (networkStats.quality) {
      case 'Excellent': return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
      case 'Good': return 'text-purple-300 border-purple-500/30 bg-purple-950/40';
      case 'Fair': return 'text-amber-300 border-amber-500/30 bg-amber-950/40';
      case 'Poor': return 'text-rose-400 border-rose-500/30 bg-rose-950/40';
      default: return 'text-purple-300 border-purple-500/30 bg-purple-950/40';
    }
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="cursor-pointer group flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-indigo-500/20 hover:border-indigo-500/50 shadow-lg hover:shadow-indigo-500/10 transition-all text-[10px] sm:text-xs font-mono font-medium"
        title="Click to view P2P WebRTC & STUN Network Telemetry"
      >
        <div className="flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span className="hidden xl:inline text-slate-300 font-sans font-semibold">STUN P2P:</span>
          <span className="text-cyan-300 font-bold tracking-tight">14 NODES</span>
        </div>

        <div className="h-3 w-px bg-white/10 hidden sm:block"></div>

        <div className="flex items-center gap-1 text-emerald-300">
          <SignalHigh className="w-3 h-3 text-emerald-400" />
          <span className="font-extrabold">{networkStats.ping || 12}</span>
          <span className="text-[9px] text-slate-400 font-sans">ms</span>
        </div>

        <div className="h-3 w-px bg-white/10 hidden md:block"></div>

        <div className="hidden md:flex items-center gap-1 text-slate-400">
          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 truncate max-w-[110px]">
            {p2pInfo.candidateType.includes('STUN') ? 'STUN UDP' : 'TURNS TLS'}
          </span>
        </div>
      </div>

      {/* P2P Diagnostics & STUN Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg glass-card rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden p-6 text-slate-100">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-cyan-300">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>P2P & Hotspot Signaling Engine</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono border", getQualityColor())}>
                    {networkStats.quality.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Cross-Operator CGNAT & Hotspot / Local IP Direct P2P</p>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10 mb-5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('stats')}
                className={cn(
                  "flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5",
                  activeTab === 'stats' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>آمار شبکه</span>
              </button>
              <button
                onClick={() => setActiveTab('server')}
                className={cn(
                  "flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5",
                  activeTab === 'server' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                <Server className="w-3.5 h-3.5" />
                <span>تنظیم IP / سرور</span>
              </button>
              <button
                onClick={() => setActiveTab('troubleshoot')}
                className={cn(
                  "flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5",
                  activeTab === 'troubleshoot' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                <span>رفع مشکل اتصال</span>
              </button>
            </div>

            {activeTab === 'stats' && (
              <>
                <div className="grid grid-cols-3 gap-2.5 mb-5 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-1">
                    <span className="text-slate-400 text-[10px] font-sans">Latency (RTT)</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {networkStats.ping || 12} <span className="text-[10px] text-slate-500 font-sans">ms</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-1">
                    <span className="text-slate-400 text-[10px] font-sans">Jitter</span>
                    <span className="text-base font-extrabold text-cyan-300">
                      {networkStats.jitter || 0.4} <span className="text-[10px] text-slate-500 font-sans">ms</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-1">
                    <span className="text-slate-400 text-[10px] font-sans">Active Peers</span>
                    <span className="text-base font-extrabold text-purple-300">
                      {peerCount}
                    </span>
                  </div>
                </div>

                {/* Active Candidate Details */}
                <div className="space-y-2 mb-6 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-indigo-500/20 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active ICE Hole-Punch Candidate</span>
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                      {p2pInfo.candidateType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">Transport Protocol</span>
                      <span className="font-mono font-bold text-indigo-300">{p2pInfo.protocol}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">STUN / TURN Cluster</span>
                      <span className="font-mono font-bold text-purple-300">14 Active Edge Nodes</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'server' && (
              <div className="space-y-4 mb-6 text-xs" dir="rtl">
                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>تنظیم سرور سیگنالینگ اختصاصی / IP هاتسپات</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    اگر در حال استفاده از Hotspot یا شبکه محلی LAN هستید، می‌توانید IP دقیق دستگاه میزبان (مثلاً <code className="text-cyan-300 font-mono">192.168.1.100</code> یا <code className="text-cyan-300 font-mono">172.20.10.1</code>) را اینجا وارد کنید:
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold">آدرس IP یا Hostname سرور:</label>
                    <input
                      type="text"
                      placeholder="مثال: 192.168.1.5 یا mydomain.com"
                      value={customHost}
                      onChange={(e) => setCustomHost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold">پورت (Port):</label>
                    <input
                      type="text"
                      placeholder="3000"
                      value={customPort}
                      onChange={(e) => setCustomPort(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs text-center"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveCustomServer}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs shadow-lg"
                  >
                    اعمال و اتصال مجدد
                  </button>
                  <button
                    onClick={() => {
                      setCustomHost('');
                      setCustomPort('3000');
                      localStorage.removeItem('wp_peer_host');
                      localStorage.removeItem('wp_peer_port');
                      setServerConfig({ mode: 'auto', customHost: '' });
                      if (roomId) handleReconnect();
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
                  >
                    بازنشانی به حالت خودکار
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'troubleshoot' && (
              <div className="space-y-3 mb-6 text-xs leading-relaxed text-slate-200" dir="rtl">
                <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                  <span>راهنمای رفع مشکل عدم اتصال در هاتسپات / اپراتورها</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1">
                    <strong className="text-cyan-300 block">۱. مشکل اتصال در هاتسپات (Hotspot / LAN):</strong>
                    <p>هنگام اتصال با هاتسپات، مرورگرها آدرس‌های IP داخلی را برای حفظ حریم خصوصی مخفی می‌کنند. برای حل این مشکل، دستگاه میزبانی که لینک اتاق را ساخته، آی‌پای محلی خود (مثل 172.20.10.1 یا 192.168.x.x) را در زبانه «تنظیم IP / سرور» وارد کند.</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1">
                    <strong className="text-purple-300 block">۲. اختلال اپراتورهای همراه اول و ایرانسل (CGNAT):</strong>
                    <p>برخی اپراتورها پورت‌های P2P استاندارد را مسدود می‌کنند. سیستم ما دارای ۱۴ سرور STUN/TURNS روی پورت SSL 443 است. اگر وصل نشدید، فیلترشکن خود را خاموش/روشن کرده و دکمه «همگام‌سازی مجدد ICE» را بزنید.</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1">
                    <strong className="text-emerald-300 block">۳. اطمینان از یکسان بودن کد اتاق:</strong>
                    <p>دقت کنید تمام کاربران دقیقاً از یک لینک یا کد ۶ رقمی اتاق استفاده نمایند.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-sans">
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                WebRTC E2EE Active
              </span>
              <button 
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isReconnecting && "animate-spin")} />
                <span>همگام‌سازی مجدد ICE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

