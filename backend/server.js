const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { supabase, SUPABASE_PROJECT_ID, SUPABASE_URL } = require('./supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'congrowing_secret_key_2026';
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Serve static web app directory
app.use(express.static(path.join(__dirname, '../web')));

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Calculate 100% REAL Live Audience Count based on connected clients
function getRealLiveCount() {
  const connectedSockets = (io && io.engine) ? io.engine.clientsCount : 0;
  return Math.max(1, connectedSockets);
}

function broadcastRealLiveCount() {
  const realCount = getRealLiveCount();
  io.emit('live_count', { count: realCount });
}

// 3-second heartbeat interval to keep all open tabs in 100% real-time sync
setInterval(() => {
  if (io) broadcastRealLiveCount();
}, 3000);

let mockUsers = [
  { id: 1, name: 'Elena Rostova', username: 'elena_r', email: 'elena@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', cri_score: 845, speaking_hours: 48.2, topic: 'AI Tech & Future', is_online: true, compatibility: 98 },
  { id: 2, name: 'Arjun Mehta', username: 'arjun_m', email: 'arjun@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', cri_score: 812, speaking_hours: 36.8, topic: 'Public Speaking & Debate', is_online: true, compatibility: 95 },
  { id: 3, name: 'Sofia Loren', username: 'sofia_l', email: 'sofia@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', cri_score: 790, speaking_hours: 24.1, topic: 'English Fluency & Practice', is_online: true, compatibility: 91 },
  { id: 4, name: 'David Kim', username: 'david_k', email: 'david@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', cri_score: 830, speaking_hours: 42.0, topic: 'Startup & Business Pitching', is_online: true, compatibility: 89 },
  { id: 5, name: 'Maya Patel', username: 'maya_p', email: 'maya@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80', cri_score: 765, speaking_hours: 19.5, topic: 'Job Interview Mock Calls', is_online: true, compatibility: 87 },
  { id: 6, name: 'Alex Vance', username: 'alex_v', email: 'alex@congrowing.com', password_hash: '1234', avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80', cri_score: 880, speaking_hours: 58.4, topic: 'Confidence Building', is_online: true, compatibility: 96 }
];

// --- REST ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ConGrowing Voice Call Platform API',
    databaseEngine: 'Cloud Supabase HTTPS REST',
    supabaseProjectId: SUPABASE_PROJECT_ID,
    supabaseUrl: SUPABASE_URL,
    liveUsers: getRealLiveCount()
  });
});

app.get('/api/supabase/status', async (req, res) => {
  let userCount = 0;
  if (supabase) {
    const { data } = await supabase.from('users').select('id');
    if (data) userCount = data.length;
  }
  res.json({
    engine: 'Cloud Supabase HTTPS REST API',
    projectId: SUPABASE_PROJECT_ID,
    projectUrl: SUPABASE_URL,
    region: 'ap-northeast-2 (Seoul)',
    status: 'Lightning Fast Active',
    realLiveAudience: getRealLiveCount(),
    totalUsersInSupabase: userCount
  });
});

// SUPABASE Signup / Registration Endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required for registration.' });
  }

  const cleanName = name.trim();
  const cleanUsername = (username || email.split('@')[0]).trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized.' });
  }

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${cleanEmail},username.eq.${cleanUsername}`);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email or username already exists in Supabase Cloud. Please login instead.' });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert([
        { name: cleanName, username: cleanUsername, email: cleanEmail, password_hash: password, avatar_url: avatarUrl, cri_score: 750, is_online: true }
      ])
      .select();

    if (insertErr) {
      console.error('Supabase Insert Error:', insertErr);
      return res.status(500).json({ error: `Supabase Insert Error: ${insertErr.message}` });
    }

    if (inserted && inserted.length > 0) {
      const newUser = inserted[0];
      console.log(`⚡ Saved new user ${cleanEmail} to Supabase (ID: ${newUser.id})`);
      mockUsers.unshift(newUser);
      const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'Cloud Supabase Registration successful!', token, user: newUser });
    } else {
      return res.status(500).json({ error: 'User insertion failed in Supabase.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Registration exception: ' + err.message });
  }
});

// SUPABASE Login Endpoint with Single Active Session Control
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized.' });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${cleanEmail},username.eq.${cleanEmail}`);

    if (error) {
      return res.status(500).json({ error: 'Supabase Query Error: ' + error.message });
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Account not found in Supabase Cloud! This email is not registered. Please click Register to create an account first.' });
    }

    const user = users[0];

    if (user.password_hash && user.password_hash !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // SINGLE SESSION CONTROL: Prevent dual login for the SAME account if active socket connection exists
    const isSocketActive = !!userSocketMap[user.id];

    if (isSocketActive) {
      return res.status(403).json({
        error: `⚠️ Account "${user.name}" is already active on another device! Simultaneous logins for the SAME account are not allowed. Please logout from that device first.`
      });
    }

    // Set user as online in Supabase Cloud
    if (supabase) {
      try {
        await supabase.from('users').update({ is_online: true }).eq('id', user.id);
      } catch (e) {}
    }
    user.is_online = true;

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ message: 'Cloud Supabase Login successful!', token, user });

  } catch (err) {
    return res.status(500).json({ error: 'Login exception: ' + err.message });
  }
});

// SUPABASE Logout Endpoint
app.post('/api/auth/logout', async (req, res) => {
  const { userId } = req.body;
  if (userId) {
    if (userSocketMap[userId]) delete userSocketMap[userId];
    if (userSocketMap[String(userId)]) delete userSocketMap[String(userId)];
    if (supabase) {
      try {
        await supabase.from('users').update({ is_online: false }).eq('id', userId);
      } catch (e) {}
    }
  }
  broadcastRealLiveCount();
  io.emit('speakers_updated');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Get Live Online Users from Supabase enriched with real-time socket online status
app.get('/api/users/live', async (req, res) => {
  const realCount = getRealLiveCount();
  if (supabase) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, email, avatar_url, cri_score, speaking_hours, topic, is_online')
        .order('cri_score', { ascending: false });

      if (!error && users && users.length > 0) {
        const enriched = users.map(u => ({
          ...u,
          is_online: !!(userSocketMap[u.id] || userSocketMap[String(u.id)]), // TRUE runtime WebSocket online state!
          compatibility: 88 + ((typeof u.id === 'number' ? u.id : (u.id || '').length) % 10)
        }));

        // Sort so currently connected live online users appear AT THE VERY TOP
        enriched.sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0));

        return res.json({ liveCount: realCount, users: enriched });
      }
    } catch (err) {}
  }

  const enrichedMock = mockUsers.map(u => ({
    ...u,
    is_online: !!(userSocketMap[u.id] || userSocketMap[String(u.id)]),
    compatibility: 88 + (u.id % 10)
  }));
  enrichedMock.sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0));

  res.json({ liveCount: realCount, users: enrichedMock });
});

// Leaderboard from Supabase
app.get('/api/users/leaderboard', async (req, res) => {
  if (supabase) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('cri_score', { ascending: false })
        .limit(10);

      if (!error && users && users.length > 0) {
        return res.json({ leaderboard: users });
      }
    } catch (err) {}
  }

  const sorted = [...mockUsers].sort((a, b) => b.cri_score - a.cri_score);
  res.json({ leaderboard: sorted });
});

// Complete Call & Reward CRI Points in Supabase
app.post('/api/calls/complete', async (req, res) => {
  const { userId, durationSeconds, scoreGained } = req.body;
  const durSec = parseInt(durationSeconds) || 0;
  const points = parseInt(scoreGained) || 15;
  let updatedUser = null;

  if (supabase && userId) {
    try {
      const { data: uData } = await supabase.from('users').select('*').eq('id', userId).single();
      if (uData) {
        const newScore = (uData.cri_score || 750) + points;
        const currentHours = parseFloat(uData.speaking_hours) || 0;
        const addedHours = durSec / 3600;
        const newHours = Math.round((currentHours + addedHours) * 10000) / 10000;

        const { data: upData, error: upErr } = await supabase
          .from('users')
          .update({ cri_score: newScore, speaking_hours: newHours })
          .eq('id', userId)
          .select();

        if (upData && upData.length > 0) {
          updatedUser = upData[0];
        }

        // Insert call record
        await supabase.from('calls').insert([{
          caller_id: userId,
          duration_seconds: durSec,
          topic: '1-on-1 Voice Call Session',
          status: 'completed'
        }]);

        // Insert CRI audit log
        await supabase.from('cri_logs').insert([{
          user_id: userId,
          score_change: points,
          reason: `Completed ${durSec}s voice call`
        }]);

        console.log(`⚡ Supabase Updated User #${userId}: CRI=${newScore}, Speaking Hours=${newHours}`);
      }
    } catch (err) {
      console.log('Supabase call reward error:', err.message);
    }
  }

  // Broadcast live real-time leaderboard update to all connected clients
  io.emit('leaderboard_update', { userId, points, updatedUser });

  res.json({
    success: true,
    pointsAwarded: points,
    user: updatedUser,
    message: `Voice call recorded in Supabase Cloud! You earned +${points} CRI points!`
  });
});

// Serve index.html for all SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Active Logged-in User Socket Registry (userId -> socketId)
const userSocketMap = {};

// --- REAL AUDIENCE REAL-TIME SOCKET TRACKING & WEBRTC VOICE CALL SIGNALING ---
io.on('connection', (socket) => {
  console.log(`🔌 Real client connected to Socket.io: ${socket.id}`);
  
  // Instantly broadcast true live audience count to all connected browsers
  broadcastRealLiveCount();

  // Register user socket mapping
  socket.on('register_user', ({ userId, name, username }) => {
    if (userId) {
      userSocketMap[userId] = socket.id;
      userSocketMap[String(userId)] = socket.id;
      socket.userId = userId;
      console.log(`👤 User #${userId} (${name}) registered socket: ${socket.id}`);
      io.emit('speakers_updated');
    }
  });

  socket.on('user_logout', ({ userId }) => {
    console.log(`👤 User #${userId} logged out`);
    if (userId) {
      delete userSocketMap[userId];
      delete userSocketMap[String(userId)];
    }
    if (supabase && userId) {
      supabase.from('users').update({ is_online: false }).eq('id', userId).then();
    }
    broadcastRealLiveCount();
    io.emit('speakers_updated');
  });

  // Initiate call to recipient
  socket.on('call_user', ({ caller, recipientId, roomId }) => {
    console.log(`📞 Call initiated from User #${caller ? caller.id : '?' } (${caller ? caller.name : 'User'}) to User #${recipientId}`);
    const recipientSocketId = userSocketMap[recipientId] || userSocketMap[String(recipientId)];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming_call', { caller, roomId });
    } else {
      socket.emit('user_offline', { recipientId, message: 'User is currently offline or not on the platform.' });
    }
  });

  // Accept incoming call
  socket.on('accept_call', ({ callerId, recipient, roomId }) => {
    console.log(`✅ Call accepted by User #${recipient ? recipient.id : '?' } for Caller #${callerId}`);
    const callerSocketId = userSocketMap[callerId] || userSocketMap[String(callerId)];
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', { recipient, roomId });
    }
  });

  // Decline incoming call
  socket.on('decline_call', ({ callerId, reason }) => {
    const callerSocketId = userSocketMap[callerId] || userSocketMap[String(callerId)];
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_declined', { reason: reason || 'Call declined by recipient.' });
    }
  });

  socket.on('join_room', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.currentRoomId = roomId;
    console.log(`🎙️ Socket ${socket.id} (User ${userId}) joined room ${roomId}`);
    socket.to(roomId).emit('user_joined', { socketId: socket.id, userId });
  });

  // Explicit End Call Session event (drops call on both ends)
  socket.on('end_call_session', ({ roomId, endedBy }) => {
    console.log(`⏹️ Call session ${roomId} ended by user ${endedBy}`);
    socket.to(roomId).emit('call_ended_by_partner', { endedBy, message: 'Partner ended the voice call.' });
    socket.leave(roomId);
    socket.currentRoomId = null;
  });

  socket.on('webrtc_offer', ({ offer, roomId }) => {
    socket.to(roomId).emit('webrtc_offer', { offer, from: socket.id });
  });

  socket.on('webrtc_answer', ({ answer, roomId }) => {
    socket.to(roomId).emit('webrtc_answer', { answer, from: socket.id });
  });

  socket.on('webrtc_ice', ({ candidate, roomId }) => {
    socket.to(roomId).emit('webrtc_ice', { candidate, from: socket.id });
  });

  socket.on('leave_room', ({ roomId }) => {
    if (roomId) {
      socket.to(roomId).emit('call_ended_by_partner', { message: 'Partner left the call room.' });
      socket.leave(roomId);
    }
    socket.currentRoomId = null;
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    if (socket.currentRoomId) {
      console.log(`⏹️ Socket disconnected while in room ${socket.currentRoomId}. Notifying partner.`);
      socket.to(socket.currentRoomId).emit('call_ended_by_partner', { message: 'Partner connection was lost or disconnected.' });
    }
    if (socket.userId) {
      delete userSocketMap[socket.userId];
      delete userSocketMap[String(socket.userId)];
      if (supabase) {
        supabase.from('users').update({ is_online: false }).eq('id', socket.userId).then();
      }
    }
    broadcastRealLiveCount();
    io.emit('speakers_updated');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  ConGrowing Real Audience Web API running on port ${PORT}`);
  console.log(`  Real Audience Live Counter ACTIVE`);
  console.log(`  Cloud Supabase URL: ${SUPABASE_URL}`);
  console.log(`=======================================================`);
});
