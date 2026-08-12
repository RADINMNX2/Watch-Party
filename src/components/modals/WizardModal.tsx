import { ArrowRight, Camera, Hash, Key, PlusCircle, Popcorn, Settings, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { peerManager, PEER_PREFIX } from '../../lib/PeerManager';
import { generateRoomCode } from '../../lib/utils';
import { useRef, useState, useEffect } from 'react';

export function WizardModal() {
  const { isWizardOpen, setIsWizardOpen, wizardStep, setWizardStep, userProfile, setUserProfile, setRoomInfo } = useAppStore();
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [roomInput, setRoomInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read URL params for room id
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room && wizardStep === 2) {
      setRoomInput(room);
      setWizardStep(3);
    }
  }, [wizardStep]);

  if (!isWizardOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 120;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h *= maxDim / w; w = maxDim; } }
        else { if (h > maxDim) { w *= maxDim / h; h = maxDim; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if(ctx) ctx.drawImage(img, 0, 0, w, h);
        setUserProfile({ avatarUrl: canvas.toDataURL('image/webp', 0.65) });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    setUserProfile({ name: nameInput.trim() || 'Viewer' });
    setWizardStep(2);
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomInfo(code, true);
    setIsWizardOpen(false);
    peerManager.init(code, true);
  };

  const handleJoinRoom = () => {
    const code = roomInput.trim().toUpperCase();
    if (code.length < 3) return;
    setRoomInfo(code, false);
    setIsWizardOpen(false);
    peerManager.init(code, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-2xl">
      <div className="bg-[#0a0e1a]/95 backdrop-blur-3xl max-w-[92vw] sm:max-w-md w-full rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden border border-white/12">
        
        {wizardStep === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div 
                className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 group cursor-pointer rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center border-2 border-purple-400/40 shadow-xl overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl || undefined} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">{nameInput.charAt(0).toUpperCase() || 'V'}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                  <Camera className="w-5 h-5" />
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-1">Your Profile</h2>
              <p className="text-xs text-slate-400">Set display name & optional profile photo.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Your Display Name</label>
              <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-purple-500/60 transition">
                <User className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter nickname" 
                  className="bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none w-full font-medium min-w-0 select-text"
                />
              </div>
            </div>

            <button onClick={handleSaveProfile} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2">
              <span>Save Profile & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Popcorn className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Watch Together</h3>
              </div>
              <button onClick={() => setWizardStep(1)} className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-purple-300 text-xs font-semibold transition flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            </div>

            <div className="space-y-3">
              <button onClick={handleCreateRoom} className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-white/10 hover:border-purple-500/40 text-left transition group active:scale-95">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">Create New Room</span>
                  <PlusCircle className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-400">Auto-generate a 5-char code & invite partners.</p>
              </button>

              <button onClick={() => setWizardStep(3)} className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-white/10 hover:border-purple-500/40 text-left transition group active:scale-95">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">Join Existing Room</span>
                  <Key className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-400">Enter a 5-character invitation code from partner.</p>
              </button>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Join Room</h3>
              </div>
              <button onClick={() => setWizardStep(1)} className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-purple-300 text-xs font-semibold transition flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">5-Char Room Code</label>
              <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-purple-500/60 transition">
                <Hash className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <input 
                  type="text" 
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  placeholder="e.g. K8F92" 
                  className="bg-transparent text-xs font-mono tracking-wider text-slate-100 uppercase placeholder-slate-500 outline-none w-full font-bold select-text"
                />
              </div>
            </div>

            <button onClick={handleJoinRoom} className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2">
              <span>Enter Cinema 🍿</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button onClick={() => setWizardStep(2)} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 font-semibold transition text-center">
              ← Back to Options
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
