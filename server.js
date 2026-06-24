const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
app.get('/', (req, res) => {
  const ips = getLanIps();
  const label = '<strong>LAN IP' + (ips.length !== 1 ? 's' : '') + ':</strong> ' + (ips.length ? ips.join(', ') : '(none)');
  res.type('html').send(indexHtml.replace('{SERVER_IPS}', label));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/server-ips', (req, res) => {
  res.json(getLanIps());
});

function computePairResult(vote1, vote2) {
  if (vote1 === 'ally' && vote2 === 'ally') return { c1: 2, c2: 2 };
  if (vote1 === 'ally' && vote2 === 'betray') return { c1: -2, c2: 3 };
  if (vote1 === 'betray' && vote2 === 'ally') return { c1: 3, c2: -2 };
  return { c1: 0, c2: 0 };
}

let hostSocketId = null;
let hostDisconnectTimer = null;
let players = [];
let slots = [];
let phase = 'lobby';
let currentRound = 0;
let pairings = [];
let allResults = [];

const SLOT_DEFS = [
  { id: 1, type: 'pair' },
  { id: 2, type: 'solo' },
  { id: 3, type: 'pair' },
  { id: 4, type: 'solo' },
  { id: 5, type: 'pair' },
  { id: 6, type: 'solo' },
];

function initSlots() {
  slots = SLOT_DEFS.map(s => ({
    id: s.id,
    type: s.type,
    name: '',
    playerIds: [],
    socketId: null,
    voted: false,
    vote: null,
    roundChange: null,
  }));
}

function resetGame() {
  players = [];
  initSlots();
  phase = 'lobby';
  currentRound = 0;
  pairings = [];
  allResults = [];
}

function getPlayerPoints(playerId) {
  const p = players.find(pl => pl.id === playerId);
  return p ? p.points : 0;
}

function setPlayerPoints(playerId, val) {
  const p = players.find(pl => pl.id === playerId);
  if (p) p.points = val;
}

function getState() {
  return {
    phase,
    players: players.map(p => ({ id: p.id, name: p.name, points: p.points, roundStartPoints: p.roundStartPoints })),
    slots: slots.map(s => ({
      id: s.id,
      type: s.type,
      name: s.name,
      playerIds: s.playerIds,
      connected: s.socketId !== null,
      voted: s.voted,
      vote: s.vote,
      roundChange: s.roundChange,
    })),
    currentRound,
    pairings: pairings.map(p => ({ slot1Id: p.slot1Id, slot2Id: p.slot2Id })),
    allResults,
    hostConnected: hostSocketId !== null,
  };
}

function broadcast() {
  const state = getState();
  for (const [id, socket] of io.sockets.sockets) {
    if (id === hostSocketId) {
      socket.emit('state-update', { ...state, isHost: true });
    } else {
      const slot = slots.find(s => s.socketId === id);
      socket.emit('state-update', { ...state, isHost: false, mySlotId: slot ? slot.id : null });
    }
  }
}

io.on('connection', (socket) => {
  socket.on('host-connect', () => {
    hostSocketId = socket.id;
    if (hostDisconnectTimer) {
      clearTimeout(hostDisconnectTimer);
      hostDisconnectTimer = null;
    }
    socket.emit('server-ips', getLanIps());
    broadcast();
  });

  socket.on('setup-players', (playerNames) => {
    if (socket.id !== hostSocketId) return;
    if (playerNames.length < 2 || playerNames.length > 9) return;
    players = playerNames.map((name, i) => ({
      id: i + 1,
      name: name.trim(),
      points: 3,
      roundStartPoints: 3,
    }));
    initSlots();
    phase = 'roundSetup';
    currentRound = 0;
    pairings = [];
    allResults = [];
    broadcast();
  });

  socket.on('assign-slots', (assignment) => {
    if (socket.id !== hostSocketId) return;
    if (phase !== 'roundSetup') return;
    initSlots();
    const usedPlayerIds = new Set();
    for (const a of assignment) {
      const slot = slots.find(s => s.id === a.slotId);
      if (!slot) continue;
      const ids = a.playerIds.filter(id => !usedPlayerIds.has(id) && players.find(p => p.id === id));
      if (ids.length === 0) continue;
      if (slot.type === 'pair' && ids.length !== 2) continue;
      if (slot.type === 'solo' && ids.length !== 1) continue;
      slot.playerIds = ids;
      ids.forEach(id => usedPlayerIds.add(id));
      const names = ids.map(id => { const p = players.find(pl => pl.id === id); return p ? p.name : '?' });
      slot.name = slot.type === 'pair' ? names.join(' & ') : names[0];
    }
    broadcast();
  });

  socket.on('confirm-round-setup', () => {
    if (socket.id !== hostSocketId) return;
    if (phase !== 'roundSetup') return;

    // Auto-generate pairings: each pair slot fights its adjacent solo slot
    pairings = [];
    for (let g = 0; g < 3; g++) {
      const pairSlot = slots[g * 2];
      const soloSlot = slots[g * 2 + 1];
      const pairFilled = pairSlot.playerIds.length > 0;
      const soloFilled = soloSlot.playerIds.length > 0;
      if (pairFilled !== soloFilled) {
        return socket.emit('error', `Group ${g + 1}: pair and solo must both be filled or both empty`);
      }
      if (pairFilled && soloFilled) {
        pairings.push({ slot1Id: pairSlot.id, slot2Id: soloSlot.id });
      }
    }

    if (pairings.length === 0) return socket.emit('error', 'Need at least one complete pair-solo group');

    phase = 'voting';
    currentRound++;
    players.forEach(p => { p.roundStartPoints = p.points; });
    slots.forEach(s => {
      s.voted = false;
      s.vote = null;
      s.roundChange = null;
    });
    allResults = [];
    broadcast();
  });

  socket.on('join-slot', (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return socket.emit('error', 'Slot not found');
    if (slot.playerIds.length === 0) return socket.emit('error', 'Slot is empty');
    if (slot.socketId) return socket.emit('error', 'Slot already has a device connected');
    slot.socketId = socket.id;
    broadcast();
  });

  socket.on('vote', (choice) => {
    const slot = slots.find(s => s.socketId === socket.id);
    if (!slot) return socket.emit('error', 'You are not connected to a slot');
    if (phase !== 'voting') return socket.emit('error', 'Not voting phase');
    if (slot.voted) return socket.emit('error', 'Already voted');
    if (choice !== 'ally' && choice !== 'betray') return socket.emit('error', 'Invalid vote');
    slot.voted = true;
    slot.vote = choice;
    socket.emit('vote-confirmed', choice);

    const activeSlots = slots.filter(s => s.playerIds.length > 0);
    const allVoted = pairings.every(p => {
      const s1 = slots.find(s => s.id === p.slot1Id);
      const s2 = slots.find(s => s.id === p.slot2Id);
      return s1 && s2 && s1.voted && s2.voted;
    });
    if (allVoted) {
      allResults = pairings.map(p => {
        const s1 = slots.find(s => s.id === p.slot1Id);
        const s2 = slots.find(s => s.id === p.slot2Id);
        const { c1, c2 } = computePairResult(s1.vote, s2.vote);
        s1.roundChange = c1;
        s2.roundChange = c2;
        const s1PlayerResults = s1.playerIds.map(pid => ({ playerId: pid, result: getPlayerPoints(pid) + c1 }));
        const s2PlayerResults = s2.playerIds.map(pid => ({ playerId: pid, result: getPlayerPoints(pid) + c2 }));
        return {
          slot1Id: p.slot1Id,
          slot2Id: p.slot2Id,
          slot1Vote: s1.vote,
          slot2Vote: s2.vote,
          slot1Change: c1,
          slot2Change: c2,
          slot1PlayerResults: s1PlayerResults,
          slot2PlayerResults: s2PlayerResults,
        };
      });
      phase = 'results';
    }
    broadcast();
  });

  socket.on('finish-round', () => {
    if (socket.id !== hostSocketId) return;
    if (phase !== 'results') return;
    allResults.forEach(r => {
      r.slot1PlayerResults.forEach(pr => setPlayerPoints(pr.playerId, pr.result));
      r.slot2PlayerResults.forEach(pr => setPlayerPoints(pr.playerId, pr.result));
    });
    phase = 'roundEnd';
    broadcast();
  });

  socket.on('next-round', () => {
    if (socket.id !== hostSocketId) return;
    phase = 'roundSetup';
    initSlots();
    pairings = [];
    allResults = [];
    broadcast();
  });

  socket.on('back-to-lobby', () => {
    if (socket.id !== hostSocketId) return;
    phase = 'lobby';
    broadcast();
  });

  socket.on('reset-game', () => {
    if (socket.id !== hostSocketId) return;
    resetGame();
    broadcast();
  });

  socket.on('disconnect', () => {
    if (socket.id === hostSocketId) {
      hostSocketId = null;
      hostDisconnectTimer = setTimeout(() => {
        server.close(() => process.exit(0));
      }, 10000);
    }
    const slot = slots.find(s => s.socketId === socket.id);
    if (slot) {
      slot.socketId = null;
      slot.voted = false;
      slot.vote = null;
    }
    broadcast();
  });
});

function launchAppWindow() {
  const url = `http://127.0.0.1:${PORT}`;
  const la = process.env.LOCALAPPDATA || '';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const browsers = [
    la + '\\Google\\Chrome\\Application\\chrome.exe',
    pf + '\\Google\\Chrome\\Application\\chrome.exe',
    pfx86 + '\\Google\\Chrome\\Application\\chrome.exe',
    pfx86 + '\\Microsoft\\Edge\\Application\\msedge.exe',
    pf + '\\Microsoft\\Edge\\Application\\msedge.exe',
    la + '\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const b of browsers) {
    try { fs.accessSync(b); exec(`"${b}" --app="${url}"`, { windowsHide: true }); return; } catch (_) {}
  }
  exec(`start "" "${url}"`);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    launchAppWindow();
    process.exit(0);
  } else {
    console.error('Server error:', err);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ambidex game server running on http://0.0.0.0:${PORT}`);
  launchAppWindow();
});
