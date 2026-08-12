import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Enable CORS and JSON body parsing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// In-memory Room State Store
interface RoomMember {
  peerId: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

interface RoomState {
  roomId: string;
  videoUrl: string;
  currentTime: number;
  isPaused: boolean;
  members: Map<string, RoomMember>;
  createdAt: number;
}

const activeRooms = new Map<string, RoomState>();

// --- 1. API ROUTES ---

// Health & Node.js Server Telemetry
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: Date.now(),
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    activeRoomsCount: activeRooms.size,
    serverEngine: 'Express + WebSocket + Vite Full-Stack'
  });
});

// STUN / TURN Dynamic Cluster Configuration
app.get('/api/stun-servers', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:openrelay.metered.ca:80' },
      { urls: 'stun:openrelay.metered.ca:443' },
      { urls: 'stun:relay.metered.ca:80' },
      { urls: 'stun:relay.metered.ca:443' },
      { urls: 'stun:openrelay.metered.ca:443?transport=tcp' },
      { urls: 'stun:relay.metered.ca:443?transport=tcp' },
      { urls: 'stun:stun.services.mozilla.com:3478' }
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle'
  });
});

// Rooms Management Endpoints
app.get('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const room = activeRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomId: room.roomId,
    videoUrl: room.videoUrl,
    currentTime: room.currentTime,
    isPaused: room.isPaused,
    membersCount: room.members.size,
    members: Array.from(room.members.values()),
    createdAt: room.createdAt
  });
});

app.post('/api/rooms', (req, res) => {
  const { roomId, videoUrl, hostPeerId, hostName } = req.body;
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  const room: RoomState = {
    roomId,
    videoUrl: videoUrl || '',
    currentTime: 0,
    isPaused: true,
    members: new Map(),
    createdAt: Date.now()
  };

  if (hostPeerId) {
    room.members.set(hostPeerId, {
      peerId: hostPeerId,
      name: hostName || 'Host',
      isHost: true,
      isReady: true,
      joinedAt: Date.now()
    });
  }

  activeRooms.set(roomId, room);
  res.json({ success: true, room: { roomId, memberCount: room.members.size } });
});

// Video Streaming Proxy (Bypasses CORS restrictions & supports Range Requests)
app.get('/api/proxy-video', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WatchPartyNode/1.0'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const videoRes = await fetch(targetUrl, { headers: fetchHeaders });
    if (!videoRes.ok) {
      return res.status(videoRes.status).send(`Failed to fetch remote video: ${videoRes.statusText}`);
    }

    // Proxy response headers
    res.status(videoRes.status);
    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const contentLength = videoRes.headers.get('content-length');
    const contentRange = videoRes.headers.get('content-range');
    const acceptRanges = videoRes.headers.get('accept-ranges') || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (videoRes.body) {
      // Stream Node.js response
      const reader = videoRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('Video proxy error:', err);
    res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

// Subtitle Processing API
app.post('/api/subtitles/process', (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: 'rawText is required' });
  }

  try {
    // Quick server-side WebVTT converter / cleaner
    let cleanVtt = rawText.trim();
    if (!cleanVtt.startsWith('WEBVTT')) {
      cleanVtt = 'WEBVTT\n\n' + cleanVtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    }
    res.json({ success: true, vttContent: cleanVtt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. WEBSOCKET HIGH-SPEED SIGNALING SERVER ---
const wss = new WebSocketServer({ noServer: true });

interface ConnectedClient {
  ws: WebSocket;
  roomId?: string;
  peerId?: string;
}

const clients = new Set<ConnectedClient>();

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname === '/ws/signaling') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Let Vite handle HMR upgrades if any
  }
});

wss.on('connection', (ws) => {
  const client: ConnectedClient = { ws };
  clients.add(client);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const { type, roomId, peerId, payload } = msg;

      if (type === 'JOIN_ROOM') {
        client.roomId = roomId;
        client.peerId = peerId;

        // Notify other clients in the same room
        broadcastToRoom(roomId, ws, {
          type: 'PEER_JOINED',
          peerId,
          timestamp: Date.now()
        });
      } else if (type === 'SYNC_STATE' || type === 'CHAT' || type === 'SIGNAL') {
        if (client.roomId) {
          broadcastToRoom(client.roomId, ws, {
            type,
            peerId: client.peerId,
            payload,
            timestamp: Date.now()
          });
        }
      } else if (type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(client);
    if (client.roomId && client.peerId) {
      broadcastToRoom(client.roomId, null, {
        type: 'PEER_LEFT',
        peerId: client.peerId,
        timestamp: Date.now()
      });
    }
  });
});

function broadcastToRoom(roomId: string, senderWs: WebSocket | null, messageObj: any) {
  const jsonStr = JSON.stringify(messageObj);
  for (const client of clients) {
    if (client.roomId === roomId && client.ws !== senderWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(jsonStr);
    }
  }
}

// --- 3. VITE MIDDLEWARE & PRODUCTION STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`WatchParty PRO Node.js Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
