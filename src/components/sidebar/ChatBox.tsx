import { MessageSquare, Send } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { peerManager } from '../../lib/PeerManager';

export function ChatBox() {
  const { chatMessages, addChatMessage, userProfile } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const text = input.trim();
    addChatMessage({
      id: Math.random().toString(),
      senderId: 'self',
      senderName: 'You',
      text,
      timestamp: Date.now(),
      isSelf: true
    });
    
    peerManager.broadcast('CHAT', { message: text });
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden max-w-full">
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 max-w-full select-text">
        {chatMessages.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-30" />
            Start chatting with room members!
          </div>
        ) : (
          chatMessages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'} gap-1 max-w-full`}>
              <span className="text-[10px] font-semibold text-slate-500 px-1">{msg.senderName}</span>
              <div className={`px-3.5 py-2 text-xs max-w-[90%] break-words font-medium select-text ${
                msg.isSelf 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none shadow-md shadow-purple-600/20' 
                  : 'bg-slate-950 border border-white/10 text-slate-200 rounded-2xl rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} className="p-2.5 bg-slate-950/90 border-t border-white/5 flex gap-2 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..." 
          className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500/60 transition min-w-0 select-text"
        />
        <button type="submit" className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white transition flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20">
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
