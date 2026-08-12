import { Header } from './components/layout/Header';
import { useAppStore } from './store/useAppStore';
import { usePeerStore } from './store/usePeerStore';
import { Activity, MessageSquare, Share2, Users } from 'lucide-react';
import { cn } from './lib/utils';
import { useEffect, lazy, Suspense } from 'react';
import { PlayerSkeleton, SidebarSkeleton, VoiceSkeleton } from './components/common/ComponentSkeletons';

// Modern Lazy Loaded Modules with Code Splitting
const VideoPlayer = lazy(() => import('./components/player/VideoPlayer').then(m => ({ default: m.VideoPlayer })));
const ActivityFeed = lazy(() => import('./components/sidebar/ActivityFeed').then(m => ({ default: m.ActivityFeed })));
const ChatBox = lazy(() => import('./components/sidebar/ChatBox').then(m => ({ default: m.ChatBox })));
const VoiceDashboard = lazy(() => import('./components/sidebar/VoiceDashboard').then(m => ({ default: m.VoiceDashboard })));
const WizardModal = lazy(() => import('./components/modals/WizardModal').then(m => ({ default: m.WizardModal })));

export default function App() {
  const { activeSidebarTab, setActiveSidebarTab, roomId } = useAppStore();
  const { peerCount } = usePeerStore();

  useEffect(() => {
    // Hardware accelerated dark mode on body
    document.documentElement.classList.add('dark');
    document.body.className = "bg-[#06080F] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-purple-500 selection:text-white bg-grid-pattern relative overflow-x-hidden max-w-full gpu-layer";
  }, []);

  const handleInvite = () => {
    if (roomId) {
      navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
      alert('Invite link copied to clipboard!');
    }
  };

  return (
    <>
      <div className="fixed top-0 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse gpu-layer"></div>
      <div className="fixed bottom-0 right-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse gpu-layer"></div>

      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 relative z-10 max-w-full contain-render">
        
        {/* Left Panel - GPU Accelerated Video Player */}
        <section className="lg:col-span-8 flex flex-col gap-4 max-w-full min-w-0 gpu-layer">
          <Suspense fallback={<PlayerSkeleton />}>
            <VideoPlayer />
          </Suspense>
        </section>

        {/* Right Panel - Sidebar and Voice Dashboard */}
        <section className="lg:col-span-4 flex flex-col gap-4 max-w-full min-w-0 gpu-layer">
          
          <div className="glass-card rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden h-[380px] lg:h-[420px] border border-white/10 max-w-full">
            <div className="flex border-b border-white/5 bg-slate-950/60 p-1.5 shrink-0">
              <button 
                onClick={() => setActiveSidebarTab('activity')} 
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all",
                  activeSidebarTab === 'activity' ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Activity Feed</span>
              </button>
              <button 
                onClick={() => setActiveSidebarTab('chat')} 
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all",
                  activeSidebarTab === 'chat' ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            </div>

            <Suspense fallback={<SidebarSkeleton />}>
              {activeSidebarTab === 'activity' ? <ActivityFeed /> : <ChatBox />}
            </Suspense>

            <div className="p-3 bg-slate-950/90 border-t border-white/5 text-xs text-slate-400 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Peers: <strong className="text-slate-100 font-extrabold">{peerCount}</strong></span>
              </div>
              <button onClick={handleInvite} className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 transition">
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>
          </div>

          <Suspense fallback={<VoiceSkeleton />}>
            <VoiceDashboard />
          </Suspense>

        </section>
      </main>

      <Suspense fallback={null}>
        <WizardModal />
      </Suspense>
    </>
  );
}

