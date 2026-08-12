import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { useAppStore } from '../store/useAppStore';
import { usePeerStore } from '../store/usePeerStore';
import { SignalMessage } from '../types';

export const PEER_PREFIX = 'wp-pro-v26-';

class PeerManager {
  peer: Peer | null = null;
  connections: Map<string, DataConnection> = new Map();
  mediaCalls: Map<string, MediaConnection> = new Map();
  localStream: MediaStream | null = null;
  
  private readyMap: Map<string, boolean> = new Map();
  private clockOffset: number = 0; // NTP style time synchronization offset
  private qosInterval: number | null = null;
  private syncInterval: number | null = null;
  
  // Callbacks for video player
  onSyncSignal: ((payload: any, type: string, networkLatency: number) => void) | null = null;

  // Enterprise WebRTC Config
  private rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    sdpSemantics: 'unified-plan'
  };

  init(roomId: string, isHost: boolean) {
    const { setConnectionStatus } = usePeerStore.getState();
    const { addLog } = useAppStore.getState();

    setConnectionStatus('connecting', 'Connecting via Secure ICE...');
    
    try {
      this.peer = new Peer(isHost ? PEER_PREFIX + roomId : undefined, {
        config: this.rtcConfig,
        debug: 0,
      });
    } catch (e) {
      setConnectionStatus('disconnected', 'WebRTC Engine Error');
      return;
    }

    this.peer.on('open', () => {
      this.setupMediaCallHandler();
      this.startQoSPolling();
      
      if (isHost) {
        setConnectionStatus('connected', 'Room Hosted Securely');
        addLog(`P2P HD Room #${roomId} is live.`, 'success');
      } else {
        this.connectToHost(PEER_PREFIX + roomId);
      }
    });

    this.peer.on('connection', (conn) => this.setupDataConnection(conn));
    
    this.peer.on('disconnected', () => {
      setConnectionStatus('connecting', 'Reconnecting ICE...');
      this.peer?.reconnect();
    });

    this.peer.on('error', (err) => {
      setConnectionStatus('disconnected', err.type === 'peer-unavailable' ? 'Room Not Found' : 'WebRTC Error');
    });
  }

  private connectToHost(hostId: string) {
    const { userProfile } = useAppStore.getState();
    const { setConnectionStatus } = usePeerStore.getState();
    setConnectionStatus('connecting', `Negotiating P2P...`);
    
    if (!this.peer) return;
    const conn = this.peer.connect(hostId, {
      reliable: true, // Forces TCP-like reliability for state sync
      metadata: { userName: userProfile.name, avatarUrl: userProfile.avatarUrl } 
    });
    this.setupDataConnection(conn);
  }

  private setupDataConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.updatePeerCount();
      
      const { setConnectionStatus } = usePeerStore.getState();
      const { addLog, isHost } = useAppStore.getState();
      
      setConnectionStatus('connected', 'Encrypted P2P Active');
      addLog(`Partner ${conn.metadata?.userName || 'joined'} connected with E2EE.`, 'success');

      if (usePeerStore.getState().isVoiceActive) {
        this.callPeerVoice(conn.peer);
      }

      if (!isHost) {
        this.sendToPeer(conn, 'REQUEST_STATE', {});
        // Begin precise NTP time sync with host
        this.syncInterval = window.setInterval(() => {
          this.sendToPeer(conn, 'SYNC_PING', { clientSendTime: Date.now() });
        }, 3000);
        this.sendToPeer(conn, 'SYNC_PING', { clientSendTime: Date.now() });
      }
    });

    conn.on('data', (data: any) => this.handleSignal(data as SignalMessage, conn));

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.readyMap.delete(conn.peer);
      this.updatePeerCount();
      this.checkReadyState();
      usePeerStore.getState().removeRemoteStream(conn.peer);
      useAppStore.getState().addLog(`A partner dropped out.`, 'warning');
      if (this.syncInterval) clearInterval(this.syncInterval);
    });
  }

  private updatePeerCount() {
    usePeerStore.getState().setPeerCount(this.connections.size + 1);
  }

  /**
   * Calculates network time exactly mapped to the host's clock to prevent 
   * drift over long sessions. True millisecond-level precision sync.
   */
  private getSynchronizedTime(): number {
    return Date.now() + this.clockOffset;
  }

  private handleSignal(msg: SignalMessage, senderConn: DataConnection) {
    const { type, payload, sender, wallTime } = msg;
    const isHost = useAppStore.getState().isHost;

    // NTP Synchronization Protocol Handling
    if (type === 'SYNC_PING' && isHost) {
      this.sendToPeer(senderConn, 'SYNC_PONG', {
        clientSendTime: payload.clientSendTime,
        hostReceiveTime: Date.now(),
        hostSendTime: Date.now()
      });
      return;
    } else if (type === 'SYNC_PONG' && !isHost) {
      const clientReceiveTime = Date.now();
      const rtt = (clientReceiveTime - payload.clientSendTime) - (payload.hostSendTime - payload.hostReceiveTime);
      const offset = ((payload.hostReceiveTime - payload.clientSendTime) + (payload.hostSendTime - clientReceiveTime)) / 2;
      
      // Smooth clock offset adjustments to prevent jarring jumps
      this.clockOffset = this.clockOffset === 0 ? offset : (this.clockOffset * 0.7 + offset * 0.3);
      usePeerStore.getState().updateNetworkStats({ ping: Math.max(0, Math.round(rtt)) });
      return;
    }
    
    if (isHost && senderConn) {
      this.connections.forEach(conn => {
        if (conn.open && conn !== senderConn) conn.send(msg);
      });
    }

    // Advanced dynamic latency calculation based on NTP offset
    const estimatedLatency = isHost ? 0 : Math.max(0, (this.getSynchronizedTime() - (wallTime || Date.now())) / 1000);

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

    if (this.onSyncSignal) {
      this.onSyncSignal(payload, type, estimatedLatency);
    }
  }

  broadcast(type: string, payload: any) {
    const { userProfile, isHost } = useAppStore.getState();
    const msg: SignalMessage = {
      type, payload, sender: userProfile.name, timestamp: performance.now(), wallTime: isHost ? Date.now() : this.getSynchronizedTime()
    };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  sendToPeer(conn: DataConnection, type: string, payload: any) {
    const { userProfile, isHost } = useAppStore.getState();
    if (conn.open) {
      conn.send({ type, payload, sender: userProfile.name, timestamp: performance.now(), wallTime: isHost ? Date.now() : this.getSynchronizedTime() });
    }
  }

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

  // Next-Gen Voice Chat Logic (HD Audio, No AGC compression)
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
        audio: { 
          echoCancellation: { ideal: true }, 
          noiseSuppression: { ideal: true }, 
          autoGainControl: { ideal: false }, // Prevent muffling / ducking
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 2 }, // Stereo transmission
        }
      });
      usePeerStore.getState().setVoiceState({ isVoiceActive: true, isMicMuted: false });
      this.connections.forEach((_, peerId) => this.callPeerVoice(peerId));
      useAppStore.getState().addLog('HD Stereo Audio initialized (48kHz)', 'success');
    } catch (e) {
      useAppStore.getState().addLog('Microphone access denied or unsupported.', 'error');
    }
  }

  private stopVoice() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.mediaCalls.forEach(call => call.close());
    this.mediaCalls.clear();
    usePeerStore.getState().setVoiceState({ isVoiceActive: false });
    useAppStore.getState().addLog('Voice channel disconnected.', 'warning');
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

  // Monitor real-time QoS (Jitter, Packet Loss, RTT) using raw WebRTC stats API
  private startQoSPolling() {
    if (this.qosInterval) clearInterval(this.qosInterval);
    
    this.qosInterval = window.setInterval(async () => {
      let totalJitter = 0, totalLoss = 0, validAudioCount = 0;
      let totalPing = 0, validPingCount = 0;

      for (const [_, call] of Array.from(this.mediaCalls.entries())) {
        if (!call.peerConnection) continue;
        try {
          const stats = await call.peerConnection.getStats();
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              totalJitter += (report.jitter || 0) * 1000;
              totalLoss += (report.packetsLost || 0);
              validAudioCount++;
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime) {
                totalPing += (report.currentRoundTripTime * 1000);
                validPingCount++;
              }
            }
          });
        } catch (e) {}
      }
      
      const avgPing = validPingCount > 0 ? totalPing / validPingCount : usePeerStore.getState().networkStats.ping;
      const avgJitter = validAudioCount > 0 ? totalJitter / validAudioCount : 0;
      const avgLoss = validAudioCount > 0 ? totalLoss / validAudioCount : 0;
      
      if (validAudioCount > 0 || validPingCount > 0) {
         usePeerStore.getState().updateNetworkStats({
           ping: Math.round(avgPing),
           jitter: Number(avgJitter.toFixed(2)),
           packetLoss: avgLoss
         });
      }
    }, 2000);
  }
}

export const peerManager = new PeerManager();
