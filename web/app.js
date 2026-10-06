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
let isLoudSpeaker = false; // Default: false = Normal Call Volume (Earpiece), true = Loud Speaker Mode
let audioContext = null;
let analyser = null;
let micStream = null;
let animFrameId = null;

// Helper to update Loudspeaker Button UI and Audio Volume
function updateSpeakerButtonUI() {
  const audioEl = document.getElementById('remoteVoiceAudio');
  const spkBtn = document.getElementById('btnToggleSpeaker');
  const targetVol = isLoudSpeaker ? 1.0 : 0.35;

  if (audioEl) {
    audioEl.volume = targetVol;
  }

  if (spkBtn) {
    spkBtn.classList.toggle('active-speaker', isLoudSpeaker);
    spkBtn.innerHTML = isLoudSpeaker 
      ? '<i class="fa-solid fa-volume-high"></i>' 
      : '<i class="fa-solid fa-volume-low"></i>';
    spkBtn.setAttribute('title', isLoudSpeaker ? 'Loud Speaker Mode (ON)' : 'Normal Call Volume (OFF)');
  }
}

// WebRTC Peer-to-Peer Voice Call State
let peerConnection = null;
let currentRoomId = null;
let remoteAudioEl = null;
let pendingIncomingCall = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

let pendingIceCandidates = [];
let remoteAudioSourceNode = null;
let ringtoneBlobUrl = null;

// Generate 100% Native, High-Quality PCM WAV Phone Ringtone Sound (440Hz + 480Hz dual tone)
function createRingtoneAudioBlob() {
  if (ringtoneBlobUrl) return ringtoneBlobUrl;
  try {
    const sampleRate = 8000;
    const duration = 1.6;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.sin((i / numSamples) * Math.PI);
      const sample = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * 0.4 * env;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    ringtoneBlobUrl = URL.createObjectURL(blob);
    return ringtoneBlobUrl;
  } catch (e) {
    console.log('Ringtone blob creation warning:', e);
    return null;
  }
}

// Deterministic, string-safe WebRTC Call Room ID Generator for any user IDs (numbers, strings, UUIDs)
function getCallRoomId(userAId, userBId) {
  const a = String(userAId || '0');
  const b = String(userBId || '0');
  const sorted = [a, b].sort();
  return `call_room_${sorted[0]}_${sorted[1]}`;
}

async function addIceCandidateSafely(candidateObj) {
  if (!peerConnection || !candidateObj) return;

  let candidate = null;
  if (candidateObj instanceof RTCIceCandidate) {
    candidate = candidateObj;
  } else if (candidateObj.candidate) {
    try {
      candidate = new RTCIceCandidate({
        candidate: candidateObj.candidate,
        sdpMid: candidateObj.sdpMid,
        sdpMLineIndex: candidateObj.sdpMLineIndex
      });
    } catch (e) {
      console.log('RTCIceCandidate constructor notice:', e);
    }
  }

  if (!candidate) return;

  if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
    try {
      await peerConnection.addIceCandidate(candidate);
      console.log('📡 Added WebRTC ICE candidate successfully');
    } catch (e) {
      console.log('ICE candidate addition warning:', e);
    }
  } else {
    console.log('📡 Queuing ICE candidate (remote description not ready yet)');
    pendingIceCandidates.push(candidate);
  }
}

async function processPendingIceCandidates() {
  if (peerConnection && peerConnection.remoteDescription && pendingIceCandidates.length > 0) {
    console.log(`📡 Flushing ${pendingIceCandidates.length} queued ICE candidates...`);
    while (pendingIceCandidates.length > 0) {
      const candidate = pendingIceCandidates.shift();
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (e) {}
    }
  }
}

// Initialize on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  updateAuthUI();
  fetchLiveUsers();
  fetchLeaderboard();
  setupEventListeners();
  drawRadarChart();
  
  // Attach generated WAV ringtone to ringtoneAudio player
  const ringEl = document.getElementById('ringtoneAudio');
  if (ringEl) {
    const srcUrl = createRingtoneAudioBlob();
    if (srcUrl) ringEl.src = srcUrl;
  }
});

let ringtoneInterval = null;

let activeRingtoneCtxList = [];

// Dual Phone Ringtone Sound Engine (HTML5 Audio + Web Audio Synthesizer) & Phone Vibration
function startRingtone() {
  stopRingtone();

  // 1. Play HTML5 Audio Ringtone
  const ringEl = document.getElementById('ringtoneAudio');
  if (ringEl) {
    if (!ringEl.src) {
      const srcUrl = createRingtoneAudioBlob();
      if (srcUrl) ringEl.src = srcUrl;
    }
    ringEl.currentTime = 0;
    ringEl.play().catch(e => console.log('HTML5 ringtone play notice:', e));
  }

  // 2. Play Web Audio API Oscillator Tone Burst as backup
  function playToneBurst() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      activeRingtoneCtxList.push(ctx);
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

      setTimeout(() => {
        try {
          if (ctx && ctx.state !== 'closed') ctx.close();
        } catch (e) {}
        activeRingtoneCtxList = activeRingtoneCtxList.filter(c => c !== ctx);
      }, 1300);
    } catch (e) {}
  }

  playToneBurst();
  ringtoneInterval = setInterval(playToneBurst, 2500);

  // 3. Vibration
  if (navigator.vibrate) {
    try { navigator.vibrate([500, 300, 500, 300, 500, 300]); } catch (e) {}
  }
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  while (activeRingtoneCtxList.length > 0) {
    const c = activeRingtoneCtxList.pop();
    try {
      if (c && c.state !== 'closed') c.close();
    } catch (e) {}
  }
  const ringEl = document.getElementById('ringtoneAudio');
  if (ringEl) {
    try {
      ringEl.pause();
      ringEl.currentTime = 0;
    } catch (e) {}
  }
  if (navigator.vibrate) {
    try { navigator.vibrate(0); } catch (e) {}
  }
}

// Global Audio Unlocking for Mobile & Desktop Browsers
function unlockAudioOnUserGesture() {
  const unlock = () => {
    const voiceEl = document.getElementById('remoteVoiceAudio');
    if (voiceEl && voiceEl.paused && voiceEl.srcObject) {
      voiceEl.play().catch(() => {});
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  };
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('click', unlock, { passive: true, once: true });
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

      socket.on('session_replaced', ({ message }) => {
        console.log('⚠️ Single Device Session Notice:', message);
        stopRingtone();
        endVoiceCall(true);
        localStorage.removeItem('cg_user');
        localStorage.removeItem('cg_token');
        currentUser = null;
        authToken = null;
        updateAuthUI();

        const msgEl = document.getElementById('singleDeviceMsg');
        if (msgEl) msgEl.innerText = message || 'You have been logged out because your account was signed in from another device or browser tab.';
        const modal = document.getElementById('singleDeviceModal');
        if (modal) modal.classList.add('active');
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

      socket.on('call_cancelled', ({ callerId, message }) => {
        console.log('🚫 Incoming call cancelled by caller:', message);
        stopRingtone();
        pendingIncomingCall = null;
        const incModal = document.getElementById('incomingCallModal');
        if (incModal) incModal.classList.remove('active');
        const activeModal = document.getElementById('callModal');
        if (activeModal && activeModal.classList.contains('active')) {
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
        
        // Caller generates the single SDP offer for the voice call session
        if (currentRoomId) {
          console.log('🎙️ Caller initiating WebRTC offer...');
          await ensureMicStreamAndTracks();
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
      socket.on('webrtc_offer', async ({ offer }) => {
        console.log('🎙️ Received WebRTC audio offer from caller');
        if (currentRoomId) {
          await ensureMicStreamAndTracks();
          createPeerConnection(currentRoomId);
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            await ensureMicStreamAndTracks(); // Bind mic tracks to transceivers and set direction='sendrecv'
            await processPendingIceCandidates();
            const answer = await peerConnection.createAnswer({ offerToReceiveAudio: true });
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc_answer', { answer, roomId: currentRoomId });
          } catch (e) {
            console.log('WebRTC answer creation error', e);
          }
        }
      });

      socket.on('webrtc_answer', async ({ answer }) => {
        console.log('🎙️ Received WebRTC audio answer from recipient');
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            await ensureMicStreamAndTracks(); // Ensure caller transceivers stay active in sendrecv mode
            await processPendingIceCandidates();
            console.log('🎙️ 2-Way Bidirectional WebRTC Audio Connection Established Successfully!');
          } catch (e) {}
        }
      });

      socket.on('webrtc_ice', async ({ candidate }) => {
        if (candidate) {
          await addIceCandidateSafely(candidate);
        }
      });
    }
  } catch (err) {
    console.log('Socket connection warning, using HTTP fallback', err);
  }
}

// Helper to bind local microphone track to WebRTC transceiver sender
async function attachMicTrackToPeerConnection(pc, stream) {
  if (!pc || !stream) return;
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !isMuted;

  try {
    const senders = pc.getSenders ? pc.getSenders() : [];
    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
    
    if (audioSender) {
      if (audioSender.track !== audioTrack) {
        console.log('🎙️ Replacing WebRTC mic track sender:', audioTrack.label);
        await audioSender.replaceTrack(audioTrack);
      }
    } else {
      console.log('🎙️ Adding local mic track to WebRTC peer connection:', audioTrack.label);
      pc.addTrack(audioTrack, stream);
    }

    // Force transceiver direction to sendrecv to guarantee 2-way audio stream
    if (pc.getTransceivers) {
      pc.getTransceivers().forEach(tr => {
        if (tr.receiver && tr.receiver.track && tr.receiver.track.kind === 'audio') {
          tr.direction = 'sendrecv';
        } else if (tr.sender && tr.sender.track && tr.sender.track.kind === 'audio') {
          tr.direction = 'sendrecv';
        }
      });
    }
  } catch (e) {
    console.log('attachMicTrackToPeerConnection warning:', e);
  }
}

function showMicPermissionGuidanceModal() {
  stopRingtone();
  const modal = document.getElementById('micPermissionModal');
  if (modal) modal.classList.add('active');
}

// Ensure local microphone stream is captured and attached to RTCPeerConnection for 2-way audio
async function ensureMicStreamAndTracks() {
  if (!micStream || !micStream.active || micStream.getAudioTracks().length === 0) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('🎙️ Local mic stream captured:', micStream.getAudioTracks()[0].label);
    } catch (e) {
      console.error('Mic capture error:', e);
      showMicPermissionGuidanceModal();
      return false;
    }
  }

  if (micStream && micStream.getAudioTracks().length > 0) {
    micStream.getAudioTracks()[0].enabled = !isMuted;
  }

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume().catch(() => {});
  }

  if (audioContext && micStream && !analyser) {
    try {
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser);
      analyser.fftSize = 64;
      renderWaveformCanvas();
    } catch (e) {}
  }

  if (peerConnection && micStream) {
    await attachMicTrackToPeerConnection(peerConnection, micStream);
  }
  return true;
}

function getRemoteAudioElement() {
  let audioEl = document.getElementById('remoteVoiceAudio');
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'remoteVoiceAudio';
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.volume = isLoudSpeaker ? 1.0 : 0.35;
    audioEl.muted = false;
    audioEl.setAttribute('playsinline', '');
    audioEl.setAttribute('autoplay', '');
    document.body.appendChild(audioEl);
  }
  return audioEl;
}

function createPeerConnection(roomId) {
  if (peerConnection) return peerConnection;
  try {
    console.log('📡 Creating new RTCPeerConnection for room:', roomId);
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (micStream && micStream.getAudioTracks().length > 0) {
      micStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
        console.log('🎙️ Attaching local mic track to RTCPeerConnection:', track.label);
        peerConnection.addTrack(track, micStream);
      });
    }

    peerConnection.ontrack = (event) => {
      console.log('🎙️ Remote WebRTC audio track received!', event.streams, event.track);
      const audioEl = getRemoteAudioElement();
      
      if (event.track) {
        event.track.enabled = true;
      }

      let stream = (event.streams && event.streams[0]) 
        ? event.streams[0] 
        : (event.track ? new MediaStream([event.track]) : null);

      if (stream) {
        console.log('🔊 Binding remote audio stream to player element...');
        audioEl.srcObject = stream;
        audioEl.volume = isLoudSpeaker ? 1.0 : 0.35;
        audioEl.muted = false;

        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('🔊 Remote audio stream is playing live out loud through speakers!');
          }).catch(err => {
            console.log('🔊 Audio playback notice:', err);
            audioEl.play().catch(() => {});
          });
        }
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const candidateData = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        };
        socket.emit('webrtc_ice', { candidate: candidateData, roomId });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection ? peerConnection.connectionState : 'null';
      console.log('📡 WebRTC connection state changed:', state);
      if (state === 'failed') {
        const modal = document.getElementById('callModal');
        if (modal && modal.classList.contains('active')) {
          console.log('⚠️ WebRTC connection failed. Stopping call.');
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

  if (currentUsers && currentUsers.length > 0) {
    renderSpeakersGrid(currentUsers);
  }
}

// Open Interactive Profile Modal
function openProfileModal() {
  if (!currentUser) return;
  const avatarEl = document.getElementById('profileModalAvatar');
  const nameEl = document.getElementById('profileModalName');
  const userEl = document.getElementById('profileModalUsername');
  const emailEl = document.getElementById('profileModalEmail');
  const criEl = document.getElementById('profileModalCri');
  const hrsEl = document.getElementById('profileModalHours');

  if (avatarEl) avatarEl.src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
  if (nameEl) nameEl.innerText = currentUser.name || 'User Profile';
  if (userEl) userEl.innerText = `@${currentUser.username || (currentUser.email || '').split('@')[0] || 'user'}`;
  if (emailEl) emailEl.innerHTML = `<i class="fa-solid fa-envelope"></i> ${currentUser.email || 'Registered User'}`;
  if (criEl) criEl.innerText = currentUser.cri_score || 750;

  const hrsNum = parseFloat(currentUser.speaking_hours);
  const hrsFormatted = (!isNaN(hrsNum) && hrsNum >= 0) ? hrsNum.toFixed(2) : '0.00';
  if (hrsEl) hrsEl.innerText = hrsFormatted;

  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('active');
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

let heroFeaturedPartner = null;

function updateHeroSpeakerCard(users) {
  if (!users || users.length === 0) return;
  const onlineOthers = users.filter(u => 
    (!currentUser || String(u.id) !== String(currentUser.id)) && u.is_online
  );

  if (onlineOthers.length === 0) return;

  // Prefer Elena Rostova if online and not current user, otherwise pick top online speaker
  let featured = onlineOthers.find(u => u.name.toLowerCase().includes('elena'));
  if (!featured) featured = onlineOthers[0];

  heroFeaturedPartner = featured;

  const imgEl = document.getElementById('heroUserImg');
  const nameEl = document.getElementById('heroUserName');
  const topicEl = document.getElementById('heroUserTopic');
  const btnEl = document.getElementById('btnCallHeroUser');

  if (imgEl) imgEl.src = featured.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${featured.username || 'user'}`;
  if (nameEl) nameEl.innerText = featured.name;
  if (topicEl) topicEl.innerHTML = `<i class="fa-solid fa-comments"></i> ${featured.topic || 'Voice Call & Fluency Practice'}`;
  if (btnEl) {
    const firstName = featured.name.split(' ')[0] || 'Speaker';
    btnEl.innerHTML = `<i class="fa-solid fa-phone"></i> Call ${firstName} Now`;
  }
}

// Fetch Live Users from Backend API
async function fetchLiveUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users/live`);
    const data = await res.json();
    if (data && data.users) {
      currentUsers = data.users;
      renderSpeakersGrid(currentUsers);
      updateHeroSpeakerCard(currentUsers);
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
    updateHeroSpeakerCard(currentUsers);
  }
}

// Render Live Speakers Cards
function renderSpeakersGrid(users) {
  const grid = document.getElementById('speakersGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const searchVal = document.getElementById('searchInput')?.value.toLowerCase() || '';

  const filtered = users.filter(user => {
    // Hide logged in user's own profile card from speakers grid (users call OTHER speakers, not themselves!)
    if (currentUser && currentUser.id && String(user.id) === String(currentUser.id)) {
      return false;
    }
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
    const statusText = isOnline ? 'ONLINE NOW' : 'OFFLINE';
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
          <i class="fa-solid ${isOnline ? 'fa-phone-volume' : 'fa-phone'}"></i> ${isOnline ? 'Voice Call & Connect (LIVE)' : 'Call Speaker'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach Call Button Listeners (guarded by login requirement & online state)
  document.querySelectorAll('.btnStartVoiceCall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.currentTarget.getAttribute('data-id');
      const partner = currentUsers.find(u => String(u.id) === String(uid));
      if (partner) {
        if (!partner.is_online) {
          alert(`⚠️ ${partner.name} is currently offline. You can only place voice calls to users who are currently online!`);
          return;
        }
        requireAuth(() => startVoiceCall(partner));
      }
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
    const isSelf = currentUser && currentUser.id && String(user.id) === String(currentUser.id);

    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div><span class="rank-badge ${rankClass}">${rank}</span></div>
      <div class="speaker-user-cell">
        <img src="${avatar}" alt="${user.name}">
        <span>${user.name} ${isSelf ? '<small style="color:var(--teal); font-weight:bold; margin-left:4px;">(You)</small>' : ''}</span>
      </div>
      <div><strong style="color: var(--teal);">CRI ${user.cri_score || 750}</strong></div>
      <div><strong>${hrsFormatted} hrs</strong></div>
      <div>
        ${isSelf ? '<span class="status-badge online" style="font-size:0.75rem;"><i class="fa-solid fa-user"></i> You</span>' : `<button class="btn btn-sm btn-outline btnLbCall" data-id="${user.id}"><i class="fa-solid fa-phone"></i> Call</button>`}
      </div>
    `;
    container.appendChild(row);
  });

  document.querySelectorAll('.btnLbCall').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.currentTarget.getAttribute('data-id');
      const partner = currentUsers.find(u => String(u.id) === String(uid));
      if (partner) {
        if (!partner.is_online) {
          alert(`⚠️ ${partner.name} is currently offline. You can only place voice calls to users who are currently online!`);
          return;
        }
        requireAuth(() => startVoiceCall(partner));
      }
    });
  });
}

// Start Interactive Voice Call
async function startVoiceCall(partner) {
  if (!partner) return;

  if (!partner.is_online) {
    alert(`⚠️ ${partner.name} is currently offline. Voice calls can only be established with active online users!`);
    return;
  }

  activeCallPartner = partner;
  
  // Play outgoing phone ringtone sound for caller
  startRingtone();

  // Unlock audio player element in DOM inside direct user gesture
  const voiceEl = getRemoteAudioElement();
  if (voiceEl) {
    voiceEl.volume = isLoudSpeaker ? 1.0 : 0.35;
    voiceEl.muted = false;
    voiceEl.play().catch(() => {});
  }

  // Reset mute & speaker state (Default: Normal Call Volume Mode)
  isMuted = false;
  isLoudSpeaker = false;
  updateSpeakerButtonUI();
  const micBtn = document.getElementById('btnToggleMic');
  if (micBtn) {
    micBtn.classList.remove('muted');
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
  }

  // Set modal UI
  document.getElementById('partnerAvatar').src = partner.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.username || 'user'}`;
  document.getElementById('partnerName').innerText = partner.name;
  document.getElementById('partnerCri').innerText = `CRI ${partner.cri_score || 750}`;
  document.getElementById('meAvatar').src = currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || 'user'}`;
  document.getElementById('meName').innerText = currentUser.name;
  document.getElementById('meCri').innerText = `CRI ${currentUser.cri_score || 750}`;

  const statusTag = document.getElementById('callStatusHeaderTag');
  if (statusTag) {
    statusTag.innerHTML = `<i class="fa-solid fa-phone-volume"></i> CALLING ${partner.name.toUpperCase()}... WAITING FOR ANSWER`;
  }

  // FIRST capture local mic stream and verify permissions!
  const hasMic = await ensureMicStreamAndTracks();
  if (hasMic === false) {
    stopRingtone();
    return;
  }

  document.getElementById('callModal').classList.add('active');

  // Compute WebRTC Room ID safely for any user IDs (numbers, strings, UUIDs)
  const myId = currentUser ? currentUser.id : 0;
  const partnerId = partner ? partner.id : 0;
  currentRoomId = getCallRoomId(myId, partnerId);

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
  pendingIceCandidates = [];

  if (analyser) {
    try { analyser.disconnect(); } catch (e) {}
    analyser = null;
  }

  if (audioContext) {
    try {
      if (audioContext.state !== 'closed') audioContext.close();
    } catch (e) {}
    audioContext = null;
  }

  if (micStream) {
    try {
      micStream.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });
    } catch (e) {}
    micStream = null;
  }

  // If local user initiated the end call, notify partner over socket
  if (!isRemote && socket) {
    if (activeCallPartner) {
      socket.emit('cancel_call', { 
        callerId: currentUser ? currentUser.id : 'user',
        recipientId: activeCallPartner.id,
        roomId: currentRoomId
      });
    }
    if (currentRoomId) {
      socket.emit('end_call_session', { 
        roomId: currentRoomId, 
        endedBy: currentUser ? currentUser.id : 'user' 
      });
    }
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

  if (remoteAudioSourceNode) {
    try { remoteAudioSourceNode.disconnect(); } catch (e) {}
    remoteAudioSourceNode = null;
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

  // Close mobile nav when clicking any nav link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('navLinks')?.classList.remove('mobile-open');
    });
  });

  // Helper to get an available ONLINE target partner excluding the logged-in user
  const getOtherOnlineUser = (random = true) => {
    const onlineOthers = currentUsers.filter(u => 
      (!currentUser || String(u.id) !== String(currentUser.id)) && u.is_online
    );
    if (onlineOthers.length === 0) return null;
    if (random) return onlineOthers[Math.floor(Math.random() * onlineOthers.length)];
    return onlineOthers[0];
  };

  // Hero & Nav CTAs (Guarded by Login Requirement & Online User Availability)
  document.getElementById('btnHeroConnect')?.addEventListener('click', () => {
    requireAuth(() => {
      const partner = getOtherOnlineUser(true);
      if (!partner) {
        alert('⚠️ No other speakers are currently online right now. Please wait for an online user to join or invite a friend!');
        return;
      }
      startVoiceCall(partner);
    });
  });
  document.getElementById('btnNavQuickCall')?.addEventListener('click', () => {
    requireAuth(() => {
      const partner = getOtherOnlineUser(true);
      if (!partner) {
        alert('⚠️ No other speakers are currently online right now. Please wait for an online user to join or invite a friend!');
        return;
      }
      startVoiceCall(partner);
    });
  });
  document.getElementById('btnCallHeroUser')?.addEventListener('click', () => {
    requireAuth(() => {
      if (heroFeaturedPartner && heroFeaturedPartner.is_online) {
        startVoiceCall(heroFeaturedPartner);
      } else {
        const partner = getOtherOnlineUser(true);
        if (!partner) {
          alert('⚠️ No other speakers are currently online right now. Please wait for an online user to join or invite a friend!');
          return;
        }
        startVoiceCall(partner);
      }
    });
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

    // Unlock audio player element in DOM inside direct user gesture
    const voiceEl = getRemoteAudioElement();
    if (voiceEl) {
      voiceEl.volume = isLoudSpeaker ? 1.0 : 0.35;
      voiceEl.muted = false;
      voiceEl.play().catch(() => {});
    }

    // Reset mute & speaker state (Default: Normal Call Volume Mode)
    isMuted = false;
    isLoudSpeaker = false;
    updateSpeakerButtonUI();
    const micBtn = document.getElementById('btnToggleMic');
    if (micBtn) {
      micBtn.classList.remove('muted');
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    }

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

  // Loudspeaker Mode Toggle Button
  document.getElementById('btnToggleSpeaker')?.addEventListener('click', () => {
    isLoudSpeaker = !isLoudSpeaker;
    updateSpeakerButtonUI();
    console.log('🔊 Speaker mode toggled:', isLoudSpeaker ? 'LOUDSPEAKER (100%)' : 'NORMAL CALL EARPIECE (35%)');
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

  // Microphone Permission Guidance Modal Listeners
  document.getElementById('btnCloseMicPermModal')?.addEventListener('click', () => {
    document.getElementById('micPermissionModal')?.classList.remove('active');
  });
  document.getElementById('btnRetryMicPermission')?.addEventListener('click', async () => {
    document.getElementById('micPermissionModal')?.classList.remove('active');
    const ok = await ensureMicStreamAndTracks();
    if (ok) {
      alert('✅ Microphone permission confirmed! You can now place and answer voice calls seamlessly.');
    }
  });

  // Single Device Active Session Logout Modal Listener
  document.getElementById('btnAckSingleDeviceLogout')?.addEventListener('click', () => {
    document.getElementById('singleDeviceModal')?.classList.remove('active');
    showAuthError('');
    document.getElementById('authModal')?.classList.add('active');
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

  // Interactive Profile Badge Click -> Opens Profile Modal
  document.getElementById('userProfileBadge')?.addEventListener('click', (e) => {
    // If logout button clicked directly inside badge, handle logout directly
    if (e.target.closest('#btnLogout')) {
      return;
    }
    openProfileModal();
  });

  document.getElementById('btnCloseProfileModal')?.addEventListener('click', () => {
    document.getElementById('profileModal')?.classList.remove('active');
  });

  document.getElementById('btnProfileViewStats')?.addEventListener('click', () => {
    document.getElementById('profileModal')?.classList.remove('active');
    document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Unified Logout Handler Function (Clears sessions, updates state, opens Login Modal)
  async function performLogout() {
    document.getElementById('profileModal')?.classList.remove('active');
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
    sessionStorage.clear();

    updateAuthUI();
    fetchLeaderboard();
    fetchLiveUsers();

    alert('Logged out successfully.');

    // Auto-open Login Modal
    showAuthError('');
    setAuthTab('login');
    document.getElementById('authModal').classList.add('active');
  }

  // Logout Listeners for inline logout button and Profile Modal logout button
  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.stopPropagation();
    performLogout();
  });

  document.getElementById('btnLogoutModal')?.addEventListener('click', () => {
    performLogout();
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
