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

// Socket.io initialization & WebRTC Signaling
function initSocket() {
  try {
    if (typeof io !== 'undefined') {
      socket = io(API_BASE);
      socket.on('connect', () => {
        console.log('⚡ Connected to Socket.io server with ID:', socket.id);
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
      socket.on('leaderboard_update', (data) => {
        console.log('⚡ Real-time Leaderboard update received:', data);
        fetchLeaderboard();
        fetchLiveUsers();
      });

      // --- WebRTC Real-Time Voice Signaling ---
      socket.on('user_joined', async ({ socketId }) => {
        console.log('🎙️ Partner joined call room:', socketId);
        if (currentRoomId && micStream) {
          createPeerConnection(currentRoomId);
          try {
            const offer = await peerConnection.createOffer();
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
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
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

function createPeerConnection(roomId) {
  if (peerConnection) return;
  try {
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (micStream) {
      micStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, micStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('🎙️ Real remote voice stream connected!');
      if (!remoteAudioEl) {
        remoteAudioEl = document.createElement('audio');
        remoteAudioEl.autoplay = true;
        document.body.appendChild(remoteAudioEl);
      }
      remoteAudioEl.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice', { candidate: event.candidate, roomId });
      }
    };
  } catch (e) {
    console.log('RTCPeerConnection error:', e);
  }
}

// Update Header UI based on Logged In User
function updateAuthUI() {
  const btnOpenAuth = document.getElementById('btnOpenAuth');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const guestNoticeBar = document.getElementById('guestNoticeBar');

  if (currentUser && currentUser.name) {
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
    const matchSearch = user.name.toLowerCase().includes(searchVal) || user.topic.toLowerCase().includes(searchVal);
    const matchCat = currentCategory === 'All' || 
                     (currentCategory === 'English' && user.topic.toLowerCase().includes('english')) ||
                     (currentCategory === 'Speaking' && (user.topic.toLowerCase().includes('speaking') || user.topic.toLowerCase().includes('confidence'))) ||
                     (currentCategory === 'Business' && (user.topic.toLowerCase().includes('business') || user.topic.toLowerCase().includes('tech'))) ||
                     (currentCategory === 'Interview' && user.topic.toLowerCase().includes('interview'));
    return matchSearch && matchCat;
  });

  filtered.forEach(user => {
    const card = document.createElement('div');
    card.className = 'glass-card speaker-card';
    card.innerHTML = `
      <div class="speaker-card-top">
        <div class="speaker-avatar">
          <img src="${user.avatar_url}" alt="${user.name}">
          <span class="speaker-status-dot"></span>
        </div>
        <div class="speaker-info">
          <h3>${user.name}</h3>
          <p class="speaker-topic"><i class="fa-solid fa-comments"></i> ${user.topic}</p>
          <div class="speaker-meta">
            <span class="cri-chip"><i class="fa-solid fa-award"></i> CRI ${user.cri_score}</span>
            <span class="match-chip"><i class="fa-solid fa-fire"></i> ${user.compatibility || 92}%</span>
          </div>
        </div>
      </div>
      <div class="speaker-card-actions">
        <button class="btn btn-primary btn-block btnStartVoiceCall" data-id="${user.id}">
          <i class="fa-solid fa-phone"></i> Voice Call & Connect
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach Call Button Listeners (guarded by login requirement)
  document.querySelectorAll('.btnStartVoiceCall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = parseInt(e.currentTarget.getAttribute('data-id'));
      const partner = currentUsers.find(u => u.id === uid) || currentUsers[0];
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

  document.getElementById('callModal').classList.add('active');

  // Compute WebRTC Room ID between current user and partner
  const myId = currentUser ? currentUser.id : 0;
  const partnerId = partner ? partner.id : 0;
  const minId = Math.min(myId, partnerId);
  const maxId = Math.max(myId, partnerId);
  currentRoomId = `call_room_${minId}_${maxId}`;

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

  // Microphone Web Audio capture & visualizer
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser);
      analyser.fftSize = 64;
      renderWaveformCanvas();
    }
  } catch (err) {
    console.log('Mic permission not granted, running visualizer in simulation mode');
    renderSimulatedWaveform();
  }
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

// End Voice Call
function endVoiceCall() {
  clearInterval(callTimerInterval);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
  }

  // Cleanup WebRTC P2P connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (currentRoomId && socket) {
    socket.emit('leave_room', { roomId: currentRoomId });
    currentRoomId = null;
  }
  if (remoteAudioEl) {
    remoteAudioEl.pause();
    remoteAudioEl.srcObject = null;
  }

  document.getElementById('callModal').classList.remove('active');

  // Compute dynamic performance reward points based on exact call duration
  const durSec = Math.max(1, callSeconds);
  const basePoints = 10;
  const bonusPoints = Math.floor(durSec / 5);
  currentEarnedPoints = basePoints + bonusPoints;

  // Show Reward Modal
  if (activeCallPartner) {
    document.getElementById('rewardPartnerName').innerText = activeCallPartner.name;
    const pointsBadge = document.querySelector('.points-gain-badge');
    if (pointsBadge) {
      pointsBadge.innerHTML = `<i class="fa-solid fa-circle-plus"></i> +${currentEarnedPoints} CRI Score Earned! (${durSec}s call)`;
    }
    document.getElementById('rewardModal').classList.add('active');
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

  // Call Controls
  document.getElementById('btnEndCall')?.addEventListener('click', endVoiceCall);
  document.getElementById('btnCloseCallModal')?.addEventListener('click', endVoiceCall);

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

  // Logout Event Listener
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('cg_user');
    localStorage.removeItem('cg_token');
    updateAuthUI();
    alert('Logged out successfully.');
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
