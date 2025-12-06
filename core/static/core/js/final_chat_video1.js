

// chat_video_global.js

class VideoCallManager {
    constructor() {
        this.socket = null;             // ← global signaling socket
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCaller = false;
        this.callState = 'idle';        // idle, calling, ringing, connected
        this.iceQueue = [];
        this.otherUserName = null;
        this.otherUserAvatar = null;

        this.currentUserId = window.CURRENT_USER_ID;
        this.otherUserId = null;

        this.setupPeerConfig();
        this.initSignalingSocket();     // ← connect immediately
        this.setupUIEventListeners();
    }

    setupPeerConfig() {
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    // ─── 1) GLOBAL SIGNALING SOCKET ──────────────────────────────────────────────
    initSignalingSocket() {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${proto}://${location.host}/ws/signaling/`;
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('[Video Signaling] connected');
            // Removed the status message display here
        };
        
        this.socket.onmessage = ev => {
            try {
                const msg = JSON.parse(ev.data);
                
                // Only handle video call messages (not audio ones)
                if (msg.type && (msg.type === 'offer' || msg.type === 'answer' || 
                    msg.type === 'ice' || msg.type === 'call-ended' || 
                    msg.type === 'call-declined')) {
                    
                    this.otherUserId = msg.sender_id;
                    this.otherUserName = msg.otherUserName;
                    this.handleSignal(msg);
                }
                // Audio call messages are handled by audio manager
            } catch (error) {
                console.error('[Video Signaling] Error parsing message:', error);
            }
        };
        
        this.socket.onerror = e => console.error('[Video Signaling] error', e);
        this.socket.onclose = () => console.warn('[Video Signaling] closed');
    }

    sendSignal(payload) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('[Video Signaling] Socket not open');
            return;
        }
        
        payload.otherUserName = window.CURRENT_USERNAME;
        payload.sender_id = this.currentUserId;
        payload.target_user_id = this.otherUserId;
        
        console.log('[Video Signaling] Sending:', payload.type);
        this.socket.send(JSON.stringify(payload));
    }
    // ─────────────────────────────────────────────────────────────────────────────

    setupUIEventListeners() {
        document.getElementById('videoCallBtn')
            .addEventListener('click', () => this.startCall());
        document.getElementById('acceptCallBtn')
            .addEventListener('click', () => this.acceptCall());
        document.getElementById('declineCallBtn')
            .addEventListener('click', () => this.declineCall());
        document.getElementById('endCallBtn')
            .addEventListener('click', () => this.endCall());
        document.getElementById('muteBtn')
            .addEventListener('click', () => this.toggleMute());
        document.getElementById('videoToggleBtn')
            .addEventListener('click', () => this.toggleVideo());
    }

    async startCall() {
        if (this.callState !== 'idle') return;
        
        // Fetch callee's information before starting the call
        await this.fetchCalleeInfo();
        
        if (!this.otherUserName) {
            this.showStatus('Unable to get user information');
            return;
        }
        
        this.callState = 'calling'; 
        this.isCaller = true;
        
        try {
            await this.getUserMedia();
            this.buildPeerConnection();
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            
            this.sendSignal({ 
                type: 'offer', 
                sdp: offer 
            });
            
            this.showVideoModal();
            this.updateConnectionStatus(`Calling ${this.otherUserName}...`);
        } catch (e) {
            console.error(e);
            this.showStatus('Call failed: ' + e.message);
            this.reset();
        }
    }

    // Fetch callee's information from the active chat
    async fetchCalleeInfo() {
        try {
            // Get the active chat item
            const activeChat = document.querySelector('.chat-item.active');
            if (activeChat) {
                this.otherUserName = activeChat.dataset.name;
                this.otherUserAvatar = activeChat.dataset.avatar;
                
                // Also get the user ID from the active chat
                if (activeChat.dataset.userId) {
                    this.otherUserId = parseInt(activeChat.dataset.userId);
                }
            } else if (window.OTHER_USER_ID) {
                // Fallback: fetch from API if not in DOM
                await this.fetchUserInfoFromAPI();
            }
        } catch (error) {
            console.error('Error fetching callee info:', error);
        }
    }

    async fetchUserInfoFromAPI() {
        try {
            const response = await fetch(`/chat/api/user/${window.OTHER_USER_ID}/`, {
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.otherUserName = userData.name;
                this.otherUserAvatar = userData.avatar;
            }
        } catch (error) {
            console.error('Error fetching user info from API:', error);
        }
    }

    async getUserMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true, 
            audio: true
        });
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = this.localStream;
        }

        // Reset UI controls
        const muteBtn = document.getElementById('muteBtn');
        const videoToggleBtn = document.getElementById('videoToggleBtn');
        
        if (muteBtn) {
            muteBtn.classList.remove('active');
            muteBtn.querySelector('i').className = 'fas fa-microphone';
        }
        
        if (videoToggleBtn) {
            videoToggleBtn.classList.remove('active');
            videoToggleBtn.querySelector('i').className = 'fas fa-video';
        }
    }

    buildPeerConnection() {
        this.pc = new RTCPeerConnection(this.pcConfig);
        
        // Add local tracks
        this.localStream.getTracks()
            .forEach(t => this.pc.addTrack(t, this.localStream));

        this.pc.onicecandidate = e => {
            if (e.candidate) {
                this.sendSignal({ type: 'ice', candidate: e.candidate });
            }
        };

        this.pc.ontrack = e => {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && e.streams[0]) {
                remoteVideo.srcObject = e.streams[0];
                this.updateConnectionStatus(`Connected with ${this.otherUserName}`);
            }
        };

        this.pc.onconnectionstatechange = () => {
            if (this.pc.connectionState === 'connected') {
                this.callState = 'connected';
                this.updateConnectionStatus(`Connected with ${this.otherUserName}`);
            } else if (['disconnected', 'failed', 'closed'].includes(this.pc.connectionState)) {
                this.reset();
            }
        };
    }

    // ─── 2) SIGNALING MESSAGE ROUTER ────────────────────────────────────────────
    async handleSignal(msg) {
        console.log('[Video] Handling signal:', msg.type);
        
        switch (msg.type) {
            case 'offer': 
                return this.onOffer(msg);
            case 'answer': 
                return this.onAnswer(msg);
            case 'ice': 
                return this.onIce(msg);
            case 'call-ended':
            case 'call-declined':
                return this.reset();
        }
    }

    async onOffer({ sdp, otherUserName }) {
        if (this.callState !== 'idle') return;
        
        this.callState = 'ringing'; 
        this.isCaller = false;
        this.pendingOffer = sdp;
        this.otherUserName = otherUserName;
        
        this.showIncomingCallModal();
    }

    async acceptCall() {
        this.hideIncomingCallModal();
        
        try {
            await this.getUserMedia();
            this.buildPeerConnection();
            
            await this.pc.setRemoteDescription(
                new RTCSessionDescription(this.pendingOffer)
            );
            
            // Process queued ICE candidates
            for (let c of this.iceQueue) {
                await this.pc.addIceCandidate(new RTCIceCandidate(c));
            }
            this.iceQueue = [];
            
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            
            this.sendSignal({ 
                type: 'answer', 
                sdp: answer 
            });
            
            this.showVideoModal();
            this.callState = 'connected';
            this.updateConnectionStatus(`Connected with ${this.otherUserName}`);
            
        } catch (error) {
            console.error('Error accepting call:', error);
            this.showStatus('Failed to accept call');
            this.reset();
        }
    }

    async onAnswer({ sdp }) {
        if (this.callState !== 'calling') return;
        
        try {
            await this.pc.setRemoteDescription(
                new RTCSessionDescription(sdp)
            );
            this.callState = 'connected';
            this.updateConnectionStatus(`Connected with ${this.otherUserName}`);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async onIce({ candidate }) {
        if (!this.pc || !this.pc.remoteDescription) {
            this.iceQueue.push(candidate);
        } else {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    declineCall() {
        this.hideIncomingCallModal();
        this.sendSignal({ type: 'call-declined' });
        this.reset();
    }

    endCall() {
        this.sendSignal({ type: 'call-ended' });
        this.reset();
    }

    reset() {
        // Clean up peer connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        // Reset state
        this.hideVideoModal();
        this.hideIncomingCallModal();
        this.isCaller = false;
        this.callState = 'idle';
        this.remoteStream = null;
        this.iceQueue = [];
        
        // Clear video elements
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }

    toggleMute() {
        if (!this.localStream) return;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;

        audioTrack.enabled = !audioTrack.enabled;

        const btn = document.getElementById('muteBtn');
        const icon = btn.querySelector('i');

        if (audioTrack.enabled) {
            btn.classList.remove('active');
            icon.className = 'fas fa-microphone';
        } else {
            btn.classList.add('active');
            icon.className = 'fas fa-microphone-slash';
        }
    }

    toggleVideo() {
        if (!this.localStream) return;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        videoTrack.enabled = !videoTrack.enabled;

        const btn = document.getElementById('videoToggleBtn');
        const icon = btn.querySelector('i');

        if (videoTrack.enabled) {
            btn.classList.remove('active');
            icon.className = 'fas fa-video';
        } else {
            btn.classList.add('active');
            icon.className = 'fas fa-video-slash';
        }
    }

    // ─── UI HELPERS (updated) ─────────────────────────────────────────────────
    showVideoModal() { 
        // Update modal with callee's information for caller
        if (this.isCaller && this.otherUserName) {
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.textContent = `Calling ${this.otherUserName}...`;
            }
        }
        
        document.getElementById('videoModal').style.display = 'block'; 
    }
    
    hideVideoModal() { 
        document.getElementById('videoModal').style.display = 'none'; 
    }
    
    showIncomingCallModal() {
        // Set caller's name in incoming call modal
        document.getElementById('callerName').textContent = this.otherUserName || 'Incoming Call';
        document.getElementById('incomingCallModal').style.display = 'block';
    }
    
    hideIncomingCallModal() { 
        document.getElementById('incomingCallModal').style.display = 'none'; 
    }
    
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = status;
            
            // Remove all status classes
            statusEl.className = 'connection-status';
            
            // Add appropriate class
            if (status.includes('Connected')) {
                statusEl.classList.add('connected');
            } else if (status.includes('Calling')) {
                statusEl.classList.add('connecting');
            } else {
                statusEl.classList.add('disconnected');
            }
        }
    }
    
    // Modified to not show signaling status messages
    showStatus(msg) {
        // Only show important status messages, not signaling connection status
        if (msg.includes('Signaling')) {
            return; // Don't show signaling messages
        }
        
        console.log('[Status]', msg);
        // You can optionally show other important messages
        // const notification = document.createElement('div');
        // notification.className = 'fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        // notification.textContent = msg;
        // document.body.appendChild(notification);
        
        // setTimeout(() => {
        //     notification.remove();
        // }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoCallManager = new VideoCallManager();
});