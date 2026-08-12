import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { useAppStore } from '../store/useAppStore';
import { usePeerStore } from '../store/usePeerStore';
import { SignalMessage, SyncState } from '../types';

export const PEER_PREFIX = 'wp-pro-v26-';

class PeerManager {
  peer: Peer | null = null;
  connections: Map<string, DataConnection> = new Map();
  mediaCalls: Map<string, MediaConnection> = new Map();
  localStream: MediaStream | null = null;
  
  private readyMap: Map<string, boolean> = new Map();
  
  // Callbacks for video player
  onSyncSignal: ((payload: any, type: string, networkLatency: number) => void) | null = null;

  init(roomId: string, isHost: boolean) {
    const { setConnectionStatus, setPeerCount } = usePeerStore.getState();
    const { addLog, userProfile } = useAppStore.getState();

    setConnectionStatus('connecting', 'Connecting...');
    
    try {
      this.peer = isHost ? new Peer(PEER_PREFIX + roomId) : new Peer();
    } catch (e) {
      setConnectionStatus('disconnected', 'Network Error');
      return;
    }

    this.peer.on('open', () => {
      this.setupMediaCallHandler();
      
      if (isHost) {
        setConnectionStatus('connected', 'Room Created (Waiting for partner)');
        addLog(`Room #${roomId} ready!`, 'success');
      } else {
        this.connectToHost(PEER_PREFIX + roomId);
      }
    });

    this.peer.on('connection', (conn) => this.setupDataConnection(conn));
    
    this.peer.on('disconnected', () => {
      setConnectionStatus('connecting', 'Reconnecting...');
      this.peer?.reconnect();
    });

    this.peer.on('error', (err) => {
      setConnectionStatus('disconnected', err.type === 'peer-unavailable' ? 'Room Not Found' : 'Connection Error');
    });
  }

  private connectToHost(hostId: string) {
    const { userProfile } = useAppStore.getState();
    const { setConnectionStatus } = usePeerStore.getState();
    setConnectionStatus('connecting', `Joining...`);
    
    if (!this.peer) return;
    const conn = this.peer.connect(hostId, { metadata: { userName: userProfile.name, avatarUrl: userProfile.avatarUrl } });
    this.setupDataConnection(conn);
  }

  private setupDataConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.updatePeerCount();
      
      const { setConnectionStatus } = usePeerStore.getState();
      const { addLog } = useAppStore.getState();
      
      setConnectionStatus('connected', 'Connected');
      addLog(`Partner ${conn.metadata?.userName || 'joined'}`, 'success');

      // Voice auto-connect if active
      if (usePeerStore.getState().isVoiceActive) {
        this.callPeerVoice(conn.peer);
      }

      // Request state if not host
      if (!useAppStore.getState().isHost) {
        this.sendToPeer(conn, 'REQUEST_STATE', {});
      }
    });

    conn.on('data', (data: any) => this.handleSignal(data as SignalMessage, conn));

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.readyMap.delete(conn.peer);
      this.updatePeerCount();
      this.checkReadyState();
      usePeerStore.getState().removeRemoteStream(conn.peer);
      useAppStore.getState().addLog(`A partner left the room.`, 'warning');
    });
  }

  private updatePeerCount() {
    usePeerStore.getState().setPeerCount(this.connections.size + 1);
  }

  private handleSignal(msg: SignalMessage, senderConn: DataConnection) {
    const { type, payload, sender, wallTime } = msg;
    const isHost = useAppStore.getState().isHost;
    
    // Host relays messages
    if (isHost && senderConn) {
      this.connections.forEach(conn => {
        if (conn.open && conn !== senderConn) conn.send(msg);
      });
    }

    const networkLatency = Math.max(0, (Date.now() - (wallTime || Date.now())) / 1000);

    if (type === 'CHAT') {
      useAppStore.getState().addChatMessage({
        id: Math.random().toString(),
        senderId: senderConn.peer,
        senderName: sender,
        text: payload.message,
        timestamp: Date.now(),
        isSelf: false
      });
      return;
    }

    if (type === 'SET_READY_STATE') {
      this.readyMap.set(senderConn.peer, payload.isReady);
      useAppStore.getState().addLog(`${sender} is ${payload.isReady ? 'Ready' : 'Not Ready'}`, 'info');
      this.checkReadyState();
      return;
    }

    // Video sync signals
    if (this.onSyncSignal) {
      this.onSyncSignal(payload, type, networkLatency);
    }
  }

  broadcast(type: string, payload: any) {
    const { userProfile } = useAppStore.getState();
    const msg: SignalMessage = {
      type, payload, sender: userProfile.name, timestamp: performance.now(), wallTime: Date.now()
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  sendToPeer(conn: DataConnection, type: string, payload: any) {
    const { userProfile } = useAppStore.getState();
    if (conn.open) {
      conn.send({ type, payload, sender: userProfile.name, timestamp: performance.now(), wallTime: Date.now() });
    }
  }

  // Ready State Logic
  setSelfReady(isReady: boolean) {
    usePeerStore.getState().setReadyState(isReady, false);
    this.broadcast('SET_READY_STATE', { isReady });
    this.checkReadyState();
  }

  private checkReadyState() {
    const { isSelfReady } = usePeerStore.getState();
    let allReady = isSelfReady;
    if (allReady) {
      this.connections.forEach((_, peerId) => {
        if (!this.readyMap.get(peerId)) allReady = false;
      });
    }
    usePeerStore.getState().setReadyState(isSelfReady, allReady);
  }

  // Voice Chat Logic
  async toggleVoice() {
    const state = usePeerStore.getState();
    if (state.isVoiceActive) {
      this.stopVoice();
    } else {
      await this.startVoice();
    }
  }

  private async startVoice() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, sampleRate: 48000 }
      });
      usePeerStore.getState().setVoiceState({ isVoiceActive: true, isMicMuted: false });
      this.connections.forEach((_, peerId) => this.callPeerVoice(peerId));
      useAppStore.getState().addLog('Voice connected (Studio 48kHz)', 'success');
    } catch (e) {
      useAppStore.getState().addLog('Mic access denied', 'error');
    }
  }

  private stopVoice() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.mediaCalls.forEach(call => call.close());
    this.mediaCalls.clear();
    usePeerStore.getState().setVoiceState({ isVoiceActive: false });
    useAppStore.getState().addLog('Voice disconnected', 'warning');
  }

  toggleMute() {
    const state = usePeerStore.getState();
    if (!this.localStream) return;
    const isMuted = !state.isMicMuted;
    this.localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    usePeerStore.getState().setVoiceState({ isMicMuted: isMuted });
  }

  toggleDeafen() {
    const state = usePeerStore.getState();
    usePeerStore.getState().setVoiceState({ isDeafened: !state.isDeafened });
  }

  private setupMediaCallHandler() {
    this.peer?.on('call', (call) => {
      call.answer(this.localStream || undefined);
      this.handleMediaCall(call);
    });
  }

  private callPeerVoice(peerId: string) {
    if (!this.peer || !this.localStream) return;
    const call = this.peer.call(peerId, this.localStream);
    this.handleMediaCall(call);
  }

  private handleMediaCall(call: MediaConnection) {
    this.mediaCalls.set(call.peer, call);
    call.on('stream', (stream) => {
      usePeerStore.getState().addRemoteStream(call.peer, stream);
    });
    call.on('close', () => {
      this.mediaCalls.delete(call.peer);
      usePeerStore.getState().removeRemoteStream(call.peer);
    });
  }
}

export const peerManager = new PeerManager();
