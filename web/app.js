// ConGrowing Client Web Application
const API_BASE = (window.location.origin && window.location.origin.startsWith('http')) 
  ? window.location.origin 
  : 'http://127.0.0.1:5000';

let socket = null;
let currentUsers = [];
let currentCategory = 'All';

// Current Logged-in User State (null if unauthenticated visitor)
let currentUser = JSON.parse(localStorage.getItem('cg_user')) || null;
let authToken = localStorage.getItem('cg_token') || null;

// Call State
let activeCallPartner = null;
let callTimerInterval = null;
let callSeconds = 0;
let isMuted = false;
let audioContext = null;
let analyser = null;
let micStream = null;
let animFrameId = null;

// WebRTC Peer-to-Peer Voice Call State
let peerConnection = null;
let currentRoomId = null;
let remoteAudioEl = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Initialize on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  updateAuthUI();
  fetchLiveUsers();
  fetchLeaderboard();
  setupEventListeners();
  drawRadarChart();
});

let currentEarnedPoints = 15;

let ringtoneInterval = null;
let ringAudioContext = null;

// Synthesize Real Phone Ringtone Sound & Phone Vibration
function startRingtone() {
  stopRingtone();
  try {
    if (navigator.vibrate) {
      navigator.vibrate([500, 300, 500, 300, 500, 300, 500, 300]);
    }
  } catch (e) {}

  function playToneBurst() {
    try {
      if (!ringAudioContext || ringAudioContext.state === 'closed') {
        ringAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (ringAudioContext.state === 'suspended') {
        ringAudioContext.resume().catch(() => {});
      }

      const osc1 = ringAudioContext.createOscillator();
      const osc2 = ringAudioContext.createOscillator();
      const gain = ringAudioContext.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ringAudioContext.currentTime); // Standard phone ringtone 440Hz
      osc2.frequency.setValueAtTime(480, ringAudioContext.currentTime); // 480Hz

      gain.gain.setValueAtTime(0.35, ringAudioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ringAudioContext.currentTime + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ringAudioContext.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ringAudioContext.currentTime + 1.4);
      osc2.stop(ringAudioContext.currentTime + 1.4);
    } catch (e) {
      console.log('Ringtone sound error:', e);
    }
  }

  playToneBurst();
  ringtoneInterval = setInterval(playToneBurst, 2500);
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringAudioContext) {
    try { ringAudioContext.close(); } catch (e) {}
    ringAudioContext = null;
  }
  if (navigator.vibrate) {
    try { navigator.vibrate(0); } catch (e) {}
  }
}

// Global Audio Unlocking for Mobile & Browser Autoplay Policies
function unlockAudioOnUserGesture() {
  const unlock = () => {
    if (ringAudioContext && ringAudioContext.state === 'suspended') {
      ringAudioContext.resume().catch(() => {});
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    if (remoteAudioEl && remoteAudioEl.paused && remoteAudioEl.srcObject) {
      remoteAudioEl.play().catch(() => {});
    }
  };
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
}
unlockAudioOnUserGesture();

// Socket.io initialization & WebRTC Signaling
function initSocket() {
  try {
    if (typeof io !== 'undefined') {
      socket = io(API_BASE);
      socket.on('connect', () => {
        console.log('⚡ Connected to Socket.io server with ID:', socket.id);
        if (currentUser && currentUser.id) {
          socket.emit('register_user', { userId: currentUser.id, name: currentUser.name, username: currentUser.username });
        }
      });
      socket.on('live_count', (data) => {
        if (data && typeof data.count === 'number') {
          const liveVal = Math.max(1, data.count);
          const liveTextEl = document.getElementById('liveCounterText');
          const statLiveEl = document.getElementById('statLiveUsers');
          if (liveTextEl) liveTextEl.innerText = `${liveVal.toLocaleString()} Live Online`;
          if (statLiveEl) statLiveEl.innerText = liveVal.toLocaleString();
        }
      });
      socket.on('speakers_updated', () => {
        console.log('⚡ Live speakers list updated in real-time');
        fetchLiveUsers();
      });

      socket.on('call_ended_by_partner', ({ message }) => {
        console.log('⏹️ Call ended by partner:', message);
        stopRingtone();
        endVoiceCall(true); // true = call ended by remote partner
      });

      socket.on('user_left', () => {
        console.log('⏹️ Partner left room');
        stopRingtone();
        const modal = document.getElementById('callModal');
        if (modal && modal.classList.contains('active')) {
          endVoiceCall(true);
        }
      });

      // --- INCOMING CALL & DIRECT CALL SIGNALING ---
      socket.on('incoming_call', ({ caller, roomId }) => {
        console.log('📞 Incoming call from:', caller);
        pendingIncomingCall = { caller, roomId };

        const avatarEl = document.getElementById('incomingCallerAvatar');
        const nameEl = document.getElementById('incomingCallerName');
        const criEl = document.getElementById('incomingCallerCri');

        if (avatarEl) avatarEl.src = caller.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${caller.username || 'user'}`;
        if (nameEl) nameEl.innerText = caller.name;
        if (criEl) criEl.innerText = `CRI ${caller.cri_score || 750} · Calling you for a live 1-on-1 voice session`;

        const modal = document.getElementById('incomingCallModal');
        if (modal) modal.classList.add('active');

        // Play phone ringtone audio sound & trigger phone vibration
        startRingtone();
      });

      socket.on('call_accepted', async ({ recipient, roomId }) => {
        console.log('✅ Call accepted by recipient:', recipient);
        stopRingtone();
        const statusTag = document.getElementById('callStatusHeaderTag');
        if (statusTag) {
          statusTag.innerHTML = `<i class="fa-solid fa-circle"></i> LIVE VOICE CALL IN PROGRESS`;
        }
        if (socket && roomId) {
          socket.emit('join_room', { roomId, userId: currentUser ? currentUser.id : 0 });
        }
      });

      socket.on('call_declined', ({ reason }) => {
        console.log('❌ Call declined:', reason);
        stopRingtone();
        alert(reason || 'Call was declined by user.');
        endVoiceCall(true);
      });

      socket.on('user_offline', ({ recipientId, message }) => {
        console.log('⚠️ Recipient offline:', message);
        const statusTag = document.getElementById('callStatusHeaderTag');
        if (statusTag) {
          statusTag.innerHTML = `<i class="fa-solid fa-phone-volume"></i> CALLING... (OFFLINE PRACTICE MODE ACTIVE)`;
        }
      });

      // --- WebRTC Real-Time 2-Way Voice Signaling ---
      socket.on('user_joined', async ({ socketId }) => {
        console.log('🎙️ Partner joined call room:', socketId);
        if (currentRoomId) {
          createPeerConnection(currentRoomId);
          await ensureMicStreamAndTracks();
          try {
            const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
            await peerConnection.setLocalDescription(offer);
            socket.emit('webrtc_offer', { offer, roomId: currentRoomId });
          } catch (e) {
            console.log('WebRTC offer creation error', e);
          }
        }
      });

      socket.on('webrtc_offer', async ({ offer }) => {
        console.log('🎙️ Received WebRTC audio offer');
        if (currentRoomId) {
          createPeerConnection(currentRoomId);
          await ensureMicStreamAndTracks();
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer({ offerToReceiveAudio: true });
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc_answer', { answer, roomId: currentRoomId });
          } catch (e) {
            console.log('WebRTC answer creation error', e);
          }
        }
      });

      socket.on('webrtc_answer', async ({ answer }) => {
        console.log('🎙️ Received WebRTC audio answer');
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('🎙️ 2-Way Bidirectional WebRTC Audio Connection Established!');
          } catch (e) {}
        }
      });

      socket.on('webrtc_ice', async ({ candidate }) => {
        if (peerConnection && candidate) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {}
        }
      });
    }
  } catch (err) {
    console.log('Socket connection warning, using HTTP fallback', err);
  }
}

// Ensure local microphone stream is captured and attached to RTCPeerConnection for 2-way audio
async function ensureMicStreamAndTracks() {
  if (!micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser);
      analyser.fftSize = 64;
      renderWaveformCanvas();
    } catch (e) {
      console.log('Mic stream capture error:', e);
    }
  }

  if (peerConnection && micStream) {
    const senders = peerConnection.getSenders();
    micStream.getAudioTracks().forEach(track => {
      track.enabled = true;
      const alreadySent = senders.some(s => s.track && s.track.kind === 'audio');
      if (!alreadySent) {
        console.log('🎙️ Attaching local audio track to WebRTC peer connection:', track.label);
        peerConnection.addTrack(track, micStream);
      }
    });
  }
}

function getRemoteAudioElement() {
  if (!remoteAudioEl) {
    remoteAudioEl = document.createElement('audio');
    remoteAudioEl.id = 'remoteVoiceAudio';
    remoteAudioEl.autoplay = true;
    remoteAudioEl.playsInline = true;
    remoteAudioEl.volume = 1.0;
    remoteAudioEl.muted = false;
    remoteAudioEl.setAttribute('playsinline', '');
    remoteAudioEl.setAttribute('autoplay', '');
    document.body.appendChild(remoteAudioEl);
  }
  return remoteAudioEl;
}

function createPeerConnection(roomId) {
  if (peerConnection) return peerConnection;
  try {
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (micStream) {
      micStream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('🎙️ Attaching local mic track to WebRTC:', track.label);
        peerConnection.addTrack(track, micStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('🎙️ Real remote voice stream track received!', event.streams, event.track);
      const audioEl = getRemoteAudioElement();
      
      if (event.track) {
        event.track.enabled = true;
      }

      let stream = null;
      if (event.streams && event.streams[0]) {
        stream = event.streams[0];
      } else if (event.track) {
        stream = new MediaStream([event.track]);
      }

      if (stream) {
        audioEl.srcObject = stream;
        audioEl.volume = 1.0;
        audioEl.muted = false;

        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('🔊 Remote audio stream is playing live out loud through speakers!');
          }).catch(err => {
            console.log('🔊 Remote audio autoplay prevented, registering tap fallback listener:', err);
            const forcePlay = () => {
              audioEl.play().catch(e => console.log('Force play error:', e));
            };
            window.addEventListener('touchstart', forcePlay, { once: true });
            window.addEventListener('click', forcePlay, { once: true });
          });
        }
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice', { candidate: event.candidate, roomId });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('📡 WebRTC connection state changed:', peerConnection ? peerConnection.connectionState : 'null');
      if (peerConnection && (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed')) {
        const modal = document.getElementById('callModal');
        if (modal && modal.classList.contains('active')) {
          console.log('⚠️ WebRTC connection lost/dropped. Stopping call on both ends.');
          endVoiceCall(true);
        }
      }
    };
  } catch (e) {
    console.log('RTCPeerConnection error:', e);
  }
  return peerConnection;
}

// Update Header UI based on Logged In User
function updateAuthUI() {
  const btnOpenAuth = document.getElementById('btnOpenAuth');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const guestNoticeBar = document.getElementById('guestNoticeBar');

  if (currentUser && currentUser.name) {
    // Register socket ID for logged-in user to receive incoming calls
    if (socket && currentUser.id) {
      socket.emit('register_user', { userId: currentUser.id, name: currentUser.name, username: currentUser.username });
    }

    // Logged In State
    if (btnOpenAuth) btnOpenAuth.classList.add('hidden');
    if (guestNoticeBar) guestNoticeBar.classList.add('hidden');
    if (userProfileBadge) {
      userProfileBadge.classList.remove('hidden');
      document.getElementById('navUserName').innerText = currentUser.name;
      document.getElementById('navUserCri').innerText = `CRI ${currentUser.cri_score || 750} ⭐`;
      document.getElementById('navUserAvatar').src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
    }
    document.getElementById('userCriDisplay').innerText = currentUser.cri_score || 750;
    document.getElementById('meName').innerText = currentUser.name;
    document.getElementById('meCri').innerText = `CRI ${currentUser.cri_score || 750}`;
    document.getElementById('meAvatar').src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
  } else {
    // Guest / Logged Out State
    if (btnOpenAuth) btnOpenAuth.classList.remove('hidden');
    if (guestNoticeBar) guestNoticeBar.classList.remove('hidden');
    if (userProfileBadge) userProfileBadge.classList.add('hidden');
  }
}

// Guard function: Requires user to be logged in before using any feature
function requireAuth(onSuccess) {
  if (!currentUser) {
    // Show mandatory login modal popup
    showAuthError('Login required to access this feature. Please login or register.');
    document.getElementById('authModal').classList.add('active');
    return false;
  }
  if (onSuccess) onSuccess();
  return true;
}

// Fetch Live Users from Backend API
async function fetchLiveUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users/live`);
    const data = await res.json();
    if (data && data.users) {
      currentUsers = data.users;
      renderSpeakersGrid(currentUsers);
    }
  } catch (err) {
    console.log('API offline, rendering initial speakers list');
    currentUsers = [
      { id: 1, name: 'Elena Rostova', username: 'elena_r', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', cri_score: 845, topic: 'AI Tech & Future', is_online: 1, compatibility: 98 },
      { id: 2, name: 'Arjun Mehta', username: 'arjun_m', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', cri_score: 812, topic: 'Public Speaking & Debate', is_online: 1, compatibility: 95 },
      { id: 3, name: 'Sofia Loren', username: 'sofia_l', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', cri_score: 790, topic: 'English Fluency & Practice', is_online: 1, compatibility: 91 },
      { id: 4, name: 'David Kim', username: 'david_k', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', cri_score: 830, topic: 'Startup & Business Pitching', is_online: 1, compatibility: 89 },
      { id: 5, name: 'Maya Patel', username: 'maya_p', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80', cri_score: 765, topic: 'Job Interview Mock Calls', is_online: 1, compatibility: 87 },
      { id: 6, name: 'Alex Vance', username: 'alex_v', avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80', cri_score: 880, topic: 'Confidence Building', is_online: 1, compatibility: 96 }
    ];
    renderSpeakersGrid(currentUsers);
  }
}

// Render Live Speakers Cards
function renderSpeakersGrid(users) {
  const grid = document.getElementById('speakersGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const searchVal = document.getElementById('searchInput')?.value.toLowerCase() || '';

  const filtered = users.filter(user => {
    const topicStr = user.topic || '';
    const matchSearch = user.name.toLowerCase().includes(searchVal) || topicStr.toLowerCase().includes(searchVal);
    const matchCat = currentCategory === 'All' || 
                     (currentCategory === 'English' && topicStr.toLowerCase().includes('english')) ||
                     (currentCategory === 'Speaking' && (topicStr.toLowerCase().includes('speaking') || topicStr.toLowerCase().includes('confidence'))) ||
                     (currentCategory === 'Business' && (topicStr.toLowerCase().includes('business') || topicStr.toLowerCase().includes('tech'))) ||
                     (currentCategory === 'Interview' && topicStr.toLowerCase().includes('interview'));
    return matchSearch && matchCat;
  });

  filtered.forEach(user => {
    const card = document.createElement('div');
    const isOnline = !!user.is_online;
    const isSelf = currentUser && (currentUser.id == user.id);
    const statusText = isOnline ? (isSelf ? 'YOU (ONLINE)' : 'ONLINE NOW') : 'OFFLINE';
    const statusClass = isOnline ? 'online' : 'offline';

    card.className = `glass-card speaker-card ${isOnline ? 'is-online' : 'is-offline'}`;
    card.innerHTML = `
      <div class="speaker-card-top">
        <div class="speaker-avatar">
          <img src="${user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`}" alt="${user.name}">
          <span class="speaker-status-dot ${statusClass}"></span>
        </div>
        <div class="speaker-info">
          <div class="speaker-header-row">
            <h3>${user.name}</h3>
            <span class="status-badge ${statusClass}">
              <i class="fa-solid fa-circle"></i> ${statusText}
            </span>
          </div>
          <p class="speaker-topic"><i class="fa-solid fa-comments"></i> ${user.topic || 'General Voice Practice'}</p>
          <div class="speaker-meta">
            <span class="cri-chip"><i class="fa-solid fa-award"></i> CRI ${user.cri_score || 750}</span>
            <span class="match-chip"><i class="fa-solid fa-fire"></i> ${user.compatibility || 92}% Match</span>
          </div>
        </div>
      </div>
      <div class="speaker-card-actions">
        <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-block btnStartVoiceCall" data-id="${user.id}">
          <i class="fa-solid ${isOnline ? 'fa-phone-volume' : 'fa-phone'}"></i> ${isSelf ? 'Your Profile (Online)' : (isOnline ? 'Voice Call & Connect (LIVE)' : 'Call Speaker')}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach Call Button Listeners (guarded by login requirement)
  document.querySelectorAll('.btnStartVoiceCall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = parseInt(e.currentTarget.getAttribute('data-id')) || e.currentTarget.getAttribute('data-id');
      const partner = currentUsers.find(u => u.id == uid) || currentUsers[0];
      requireAuth(() => startVoiceCall(partner));
    });
  });
}

// Fetch Leaderboard
async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/api/users/leaderboard`);
    const data = await res.json();
    if (data && data.leaderboard) {
      renderLeaderboard(data.leaderboard);
    }
  } catch (err) {
    renderLeaderboard(currentUsers);
  }
}

function renderLeaderboard(list) {
  const container = document.getElementById('leaderboardRows');
  if (!container) return;
  container.innerHTML = '';

  const sorted = [...list].sort((a, b) => (b.cri_score || 0) - (a.cri_score || 0));

  sorted.forEach((user, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
    const hrsNum = parseFloat(user.speaking_hours);
    const hrsFormatted = (!isNaN(hrsNum) && hrsNum >= 0) ? hrsNum.toFixed(2) : '0.00';
    const avatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`;

    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div><span class="rank-badge ${rankClass}">${rank}</span></div>
      <div class="speaker-user-cell">
        <img src="${avatar}" alt="${user.name}">
        <span>${user.name}</span>
      </div>
      <div><strong style="color: var(--teal);">CRI ${user.cri_score || 750}</strong></div>
      <div><strong>${hrsFormatted} hrs</strong></div>
      <div>
        <button class="btn btn-sm btn-outline btnLbCall" data-id="${user.id}"><i class="fa-solid fa-phone"></i> Call</button>
      </div>
    `;
    container.appendChild(row);
  });

  document.querySelectorAll('.btnLbCall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = parseInt(e.currentTarget.getAttribute('data-id'));
      const partner = currentUsers.find(u => u.id === uid) || currentUsers[0];
      requireAuth(() => startVoiceCall(partner));
    });
  });
}

// Start Interactive Voice Call
async function startVoiceCall(partner) {
  activeCallPartner = partner;
  
  // Set modal UI
  document.getElementById('partnerAvatar').src = partner.avatar_url;
  document.getElementById('partnerName').innerText = partner.name;
  document.getElementById('partnerCri').innerText = `CRI ${partner.cri_score}`;
  document.getElementById('meAvatar').src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
  document.getElementById('meName').innerText = currentUser.name;
  document.getElementById('meCri').innerText = `CRI ${currentUser.cri_score || 750}`;

  const statusTag = document.getElementById('callStatusHeaderTag');
  if (statusTag) {
    statusTag.innerHTML = `<i class="fa-solid fa-phone-volume"></i> CALLING ${partner.name.toUpperCase()}... WAITING FOR ANSWER`;
  }

  document.getElementById('callModal').classList.add('active');

  // Compute WebRTC Room ID between current user and partner
  const myId = currentUser ? currentUser.id : 0;
  const partnerId = partner ? partner.id : 0;
  const minId = Math.min(myId, partnerId);
  const maxId = Math.max(myId, partnerId);
  currentRoomId = `call_room_${minId}_${maxId}`;

  // FIRST capture local mic stream and attach tracks!
  await ensureMicStreamAndTracks();

  // Emit outgoing call notification to partner's phone
  if (socket && currentUser) {
    socket.emit('call_user', { caller: currentUser, recipientId: partnerId, roomId: currentRoomId });
  }

  // Join WebRTC Call Room
  if (socket) {
    socket.emit('join_room', { roomId: currentRoomId, userId: myId });
  }

  // Start Call Timer
  callSeconds = 0;
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    document.getElementById('callTimer').innerText = `${m}:${s}`;
  }, 1000);
}

// Render Real or Simulated Audio Canvas Waveform
function renderWaveformCanvas() {
  const canvas = document.getElementById('waveformCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser ? analyser.frequencyBinCount : 32;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
    } else {
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = Math.floor(Math.random() * 180) + 40;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 1.8;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#7c3aed');
      gradient.addColorStop(1, '#2dd4bf');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  }
  draw();
}

function renderSimulatedWaveform() {
  renderWaveformCanvas();
}

// End Voice Call (handles both manual end and remote partner call drop)
function endVoiceCall(isRemoteEnd = false) {
  stopRingtone();
  clearInterval(callTimerInterval);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  
  const isRemote = (isRemoteEnd === true);

  if (micStream) {
    try {
      micStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    micStream = null;
  }

  // If local user initiated the end call, notify partner over socket
  if (!isRemote && currentRoomId && socket) {
    socket.emit('end_call_session', { 
      roomId: currentRoomId, 
      endedBy: currentUser ? currentUser.id : 'user' 
    });
  }

  // Cleanup WebRTC P2P connection
  if (peerConnection) {
    try {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    } catch (e) {}
    peerConnection = null;
  }

  if (currentRoomId && socket) {
    socket.emit('leave_room', { roomId: currentRoomId });
    currentRoomId = null;
  }

  if (remoteAudioEl) {
    try {
      remoteAudioEl.pause();
      remoteAudioEl.srcObject = null;
    } catch (e) {}
  }

  // Hide active call modals
  const callModal = document.getElementById('callModal');
  if (callModal) callModal.classList.remove('active');
  const incomingCallModal = document.getElementById('incomingCallModal');
  if (incomingCallModal) incomingCallModal.classList.remove('active');

  // Compute dynamic performance reward points based on exact call duration
  const durSec = Math.max(1, callSeconds);
  const basePoints = 10;
  const bonusPoints = Math.floor(durSec / 5);
  currentEarnedPoints = basePoints + bonusPoints;

  // Show Reward Modal if there was an active call partner
  if (activeCallPartner) {
    const partnerNameEl = document.getElementById('rewardPartnerName');
    if (partnerNameEl) partnerNameEl.innerText = activeCallPartner.name;
    const pointsBadge = document.querySelector('.points-gain-badge');
    if (pointsBadge) {
      pointsBadge.innerHTML = `<i class="fa-solid fa-circle-plus"></i> +${currentEarnedPoints} CRI Score Earned! (${durSec}s call)`;
    }
    const rewardModal = document.getElementById('rewardModal');
    if (rewardModal) rewardModal.classList.add('active');
  }

  if (isRemote) {
    console.log('⏹️ Call ended by remote partner or connection dropped.');
  }
}

// Event Listeners
function setupEventListeners() {
  // Mobile Nav Toggle
  document.getElementById('btnMobileMenu')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('mobile-open');
  });

  // Hero & Nav CTAs (Guarded by Login Requirement)
  document.getElementById('btnHeroConnect')?.addEventListener('click', () => {
    requireAuth(() => startVoiceCall(currentUsers[0]));
  });
  document.getElementById('btnNavQuickCall')?.addEventListener('click', () => {
    requireAuth(() => startVoiceCall(currentUsers[Math.floor(Math.random() * currentUsers.length)]));
  });
  document.getElementById('btnCallHeroUser')?.addEventListener('click', () => {
    requireAuth(() => startVoiceCall(currentUsers[0]));
  });
  document.getElementById('btnHeroExplore')?.addEventListener('click', () => {
    document.getElementById('speakers')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Notice Bar Login Button
  document.getElementById('btnNoticeLogin')?.addEventListener('click', () => {
    showAuthError('');
    document.getElementById('authModal').classList.add('active');
  });

  // Category Filtering
  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentCategory = e.currentTarget.getAttribute('data-cat');
      renderSpeakersGrid(currentUsers);
    });
  });

  // Search Input
  document.getElementById('searchInput')?.addEventListener('input', () => {
    renderSpeakersGrid(currentUsers);
  });

  // Incoming Call Action Buttons (Recipient Phone)
  document.getElementById('btnAcceptCall')?.addEventListener('click', async () => {
    stopRingtone();
    document.getElementById('incomingCallModal').classList.remove('active');
    if (pendingIncomingCall && currentUser) {
      const { caller, roomId } = pendingIncomingCall;
      activeCallPartner = caller;
      currentRoomId = roomId;

      // Set call modal UI for recipient
      document.getElementById('partnerAvatar').src = caller.avatar_url;
      document.getElementById('partnerName').innerText = caller.name;
      document.getElementById('partnerCri').innerText = `CRI ${caller.cri_score}`;
      document.getElementById('meAvatar').src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
      document.getElementById('meName').innerText = currentUser.name;
      document.getElementById('meCri').innerText = `CRI ${currentUser.cri_score || 750}`;

      const statusTag = document.getElementById('callStatusHeaderTag');
      if (statusTag) {
        statusTag.innerHTML = `<i class="fa-solid fa-circle"></i> LIVE VOICE CALL IN PROGRESS`;
      }

      document.getElementById('callModal').classList.add('active');

      // FIRST capture local mic stream and attach tracks!
      await ensureMicStreamAndTracks();

      // Emit accept call & join room to socket
      if (socket) {
        socket.emit('accept_call', { callerId: caller.id, recipient: currentUser, roomId });
        socket.emit('join_room', { roomId, userId: currentUser.id });
      }

      // Start Call Timer
      callSeconds = 0;
      clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        callSeconds++;
        const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const s = String(callSeconds % 60).padStart(2, '0');
        document.getElementById('callTimer').innerText = `${m}:${s}`;
      }, 1000);
    }
  });

  document.getElementById('btnDeclineCall')?.addEventListener('click', () => {
    stopRingtone();
    document.getElementById('incomingCallModal').classList.remove('active');
    if (pendingIncomingCall && socket) {
      socket.emit('decline_call', { callerId: pendingIncomingCall.caller.id, reason: `${currentUser ? currentUser.name : 'User'} declined the call.` });
    }
    pendingIncomingCall = null;
  });

  // Call Controls (Explicitly pass false so local end emits end_call_session to partner)
  document.getElementById('btnEndCall')?.addEventListener('click', () => endVoiceCall(false));
  document.getElementById('btnCloseCallModal')?.addEventListener('click', () => endVoiceCall(false));

  document.getElementById('btnToggleMic')?.addEventListener('click', (e) => {
    isMuted = !isMuted;
    e.currentTarget.classList.toggle('muted', isMuted);
    e.currentTarget.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
    if (micStream) {
      micStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    }
  });

  // Stage Join Buttons (Guarded by Login Requirement)
  document.querySelectorAll('.btnListenStage').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.currentTarget.getAttribute('data-title');
      requireAuth(() => {
        alert(`🎉 You joined the voice stage "${title}". Speaker stage is active!`);
      });
    });
  });

  // Reward Modal Action (Saves to Supabase Cloud & Updates Local & Leaderboard State dynamically)
  document.getElementById('btnClaimReward')?.addEventListener('click', async () => {
    document.getElementById('rewardModal').classList.remove('active');
    if (currentUser) {
      const durSec = callSeconds || 10;
      const pointsToGain = currentEarnedPoints || 15;

      try {
        const res = await fetch(`${API_BASE}/api/calls/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, durationSeconds: durSec, scoreGained: pointsToGain })
        });
        
        const data = await res.json();
        if (data && data.user) {
          currentUser = data.user;
          localStorage.setItem('cg_user', JSON.stringify(currentUser));
        } else {
          currentUser.cri_score = (currentUser.cri_score || 750) + pointsToGain;
          currentUser.speaking_hours = (currentUser.speaking_hours || 0) + (durSec / 3600);
          localStorage.setItem('cg_user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.log('Completion update fallback', err);
        currentUser.cri_score = (currentUser.cri_score || 750) + pointsToGain;
        currentUser.speaking_hours = (currentUser.speaking_hours || 0) + (durSec / 3600);
        localStorage.setItem('cg_user', JSON.stringify(currentUser));
      }

      updateAuthUI();
      fetchLeaderboard();
      fetchLiveUsers();
    }
  });

  // Auth Modals Toggle
  document.getElementById('btnOpenAuth')?.addEventListener('click', () => {
    showAuthError('');
    document.getElementById('authModal').classList.add('active');
  });
  document.getElementById('btnCloseAuthModal')?.addEventListener('click', () => {
    document.getElementById('authModal').classList.remove('active');
  });
  document.getElementById('tabLogin')?.addEventListener('click', () => setAuthTab('login'));
  document.getElementById('tabSignup')?.addEventListener('click', () => setAuthTab('signup'));

  // Logout Event Listener (Clears active session in backend)
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    if (currentUser && currentUser.id) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (e) {}
    }
    if (socket && currentUser && currentUser.id) {
      socket.emit('user_logout', { userId: currentUser.id });
    }
    currentUser = null;
    authToken = null;
    localStorage.removeItem('cg_user');
    localStorage.removeItem('cg_token');
    updateAuthUI();
    alert('Logged out successfully. Account is now unlocked for login on any device.');
  });

  // Auth Form Submit (Strict Login & Register with MySQL Verification)
  document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAuthError('');
    const isSignup = document.getElementById('tabSignup').classList.contains('active');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const name = document.getElementById('authName').value.trim();
    const username = document.getElementById('authUsername').value.trim();

    if (!email || !password) {
      showAuthError('Please fill in both email and password.');
      return;
    }

    if (isSignup && !name) {
      showAuthError('Please enter your Full Name to register.');
      return;
    }

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignup ? { name, username, email, password } : { email, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (!res.ok) {
        // Strict error display (Account Not Found or Incorrect Password)
        showAuthError(data.error || 'Authentication error.');
        return;
      }

      if (data.user) {
        currentUser = data.user;
        authToken = data.token;
        localStorage.setItem('cg_user', JSON.stringify(currentUser));
        if (authToken) localStorage.setItem('cg_token', authToken);

        updateAuthUI();
        document.getElementById('authModal').classList.remove('active');
        alert(`Welcome, ${currentUser.name}! Your account is verified in the backend and ready.`);
      }
    } catch (err) {
      showAuthError('Unable to connect to backend server. Please make sure server is running.');
    }
  });
}

function showAuthError(msg) {
  const errEl = document.getElementById('authErrorMsg');
  if (!errEl) return;
  if (msg) {
    errEl.innerText = msg;
    errEl.classList.remove('hidden');
  } else {
    errEl.innerText = '';
    errEl.classList.add('hidden');
  }
}

function setAuthTab(tab) {
  showAuthError('');
  if (tab === 'login') {
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabSignup').classList.remove('active');
    document.querySelectorAll('.signup-only').forEach(el => el.classList.add('hidden'));
    document.getElementById('btnAuthSubmit').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login to ConGrowing';
  } else {
    document.getElementById('tabSignup').classList.add('active');
    document.getElementById('tabLogin').classList.remove('active');
    document.querySelectorAll('.signup-only').forEach(el => el.classList.remove('hidden'));
    document.getElementById('btnAuthSubmit').innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Free Account';
  }
}

// Draw Radar Chart for CRI Analytics
function drawRadarChart() {
  const canvas = document.getElementById('criRadarCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const center = { x: width / 2, y: height / 2 };
  const radius = width / 2 - 30;

  const labels = ['Fluency', 'Vocabulary', 'Confidence', 'Listening', 'Engagement'];
  const values = [0.88, 0.81, 0.92, 0.86, 0.90];
  const numPoints = labels.length;

  ctx.clearRect(0, 0, width, height);

  // Draw Web Radar Circles
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let r = 1; r <= 3; r++) {
    const curRadius = (radius / 3) * r;
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
      const x = center.x + curRadius * Math.cos(angle);
      const y = center.y + curRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw Data Polygon
  ctx.beginPath();
  for (let i = 0; i < numPoints; i++) {
    const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
    const valRadius = radius * values[i];
    const x = center.x + valRadius * Math.cos(angle);
    const y = center.y + valRadius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  ctx.fillStyle = 'rgba(45, 212, 191, 0.25)';
  ctx.fill();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Metric Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < numPoints; i++) {
    const angle = (Math.PI * 2 / numPoints) * i - Math.PI / 2;
    const labelRadius = radius + 18;
    const x = center.x + labelRadius * Math.cos(angle);
    const y = center.y + labelRadius * Math.sin(angle) + 4;
    ctx.fillText(labels[i], x, y);
  }
}
