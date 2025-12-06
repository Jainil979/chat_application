// unified_call_manager.js

class UnifiedCallManager {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCaller = false;
        this.callState = 'idle'; // idle, calling, ringing, connected, ended
        this.callType = null; // 'audio' or 'video'
        this.iceQueue = [];
        this.currentUserId = window.CURRENT_USER_ID;
        this.currentUserName = window.CURRENT_USERNAME;
        this.otherUserId = null;
        this.otherUserName = null;
        this.otherUserAvatar = null;
        
        this.callDuration = 0;
        this.callTimer = null;
        this.audioLevelInterval = null;
        this.ringtoneAudio = null;
        
        this.initSignalingSocket();
        this.setupEventListeners();
        this.setupAudioVisualization();
    }

    initSignalingSocket() {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${proto}://${location.host}/ws/signaling/`;
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('[UnifiedCallManager] Signaling connected');
        };
        
        this.socket.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                console.log('Received signal:', msg.type);
                this.handleSignal(msg);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        this.socket.onerror = e => console.error('[UnifiedCallManager] Signaling error', e);
        this.socket.onclose = () => console.warn('[UnifiedCallManager] Signaling closed');
    }

    setupEventListeners() {
        // Phone button for audio calls
        document.getElementById('audioCallBtn')?.addEventListener('click', () => {
            this.startAudioCall();
        });

        // Video button for video calls
        document.getElementById('videoCallBtn')?.addEventListener('click', () => {
            this.startVideoCall();
        });

        // Video call controls
        document.getElementById('endVideoCallBtn')?.addEventListener('click', () => this.endCall());
        document.getElementById('videoMuteBtn')?.addEventListener('click', () => this.toggleMute());
        document.getElementById('videoToggleBtn')?.addEventListener('click', () => this.toggleVideo());
        
        // Audio call controls
        document.getElementById('endAudioCallBtn')?.addEventListener('click', () => this.endCall());
        document.getElementById('audioMuteBtn')?.addEventListener('click', () => this.toggleMute());
        
        // Incoming call buttons
        document.getElementById('acceptVideoCallBtn')?.addEventListener('click', () => this.acceptCall());
        document.getElementById('declineVideoCallBtn')?.addEventListener('click', () => this.declineCall());
        document.getElementById('acceptAudioCallBtn')?.addEventListener('click', () => this.acceptCall());
        document.getElementById('declineAudioCallBtn')?.addEventListener('click', () => this.declineCall());
    }

    setupAudioVisualization() {
        // Initialize audio visualization
        if (!window.AudioContext) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        // Start audio level monitoring
        this.startAudioLevelMonitoring();
    }

    startAudioLevelMonitoring() {
        if (this.audioLevelInterval) clearInterval(this.audioLevelInterval);
        
        this.audioLevelInterval = setInterval(() => {
            if (!this.analyser || !this.localStream) return;
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Update audio level bar (0-100%)
            const levelPercentage = Math.min(100, (average / 128) * 100);
            const levelBar = document.getElementById('audioLevelBar');
            if (levelBar) {
                levelBar.style.width = `${levelPercentage}%`;
            }
        }, 100);
    }

    async loadContactInfo(userId) {
        if (!userId) return null;
        
        try {
            const response = await fetch('/chat/api/contacts/', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) throw new Error('Failed to load contacts');
            const contacts = await response.json();
            const contact = contacts.find(c => c.contact_id == userId);
            return contact;
        } catch (error) {
            console.error('Error loading contact info:', error);
            return null;
        }
    }

    async startAudioCall() {
        if (this.callState !== 'idle') {
            this.showNotification('Already in a call');
            return;
        }

        const otherUserId = window.OTHER_USER_ID;
        if (!otherUserId) {
            this.showNotification('Please select a contact first');
            return;
        }

        this.callState = 'calling';
        this.isCaller = true;
        this.callType = 'audio';
        this.otherUserId = otherUserId;

        try {
            // Load contact info
            const contact = await this.loadContactInfo(otherUserId);
            if (contact) {
                this.otherUserName = contact.name;
                this.otherUserAvatar = contact.avatar;
            }

            await this.getUserMedia('audio');
            this.buildPeerConnection();
            
            // Update UI
            this.updateCallModal();
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            this.sendSignal({
                type: 'call-offer',
                sdp: offer,
                caller_id: this.currentUserId,
                caller_name: this.currentUserName,
                call_type: 'audio'
            });
            
            this.showCallModal();
            this.updateCallStatus('Calling...');
            this.showNotification('Starting audio call...');
            
        } catch (error) {
            console.error('Error starting audio call:', error);
            this.showNotification('Failed to start audio call');
            this.reset();
        }
    }

    async startVideoCall() {
        if (this.callState !== 'idle') {
            this.showNotification('Already in a call');
            return;
        }

        const otherUserId = window.OTHER_USER_ID;
        if (!otherUserId) {
            this.showNotification('Please select a contact first');
            return;
        }

        this.callState = 'calling';
        this.isCaller = true;
        this.callType = 'video';
        this.otherUserId = otherUserId;

        try {
            // Load contact info
            const contact = await this.loadContactInfo(otherUserId);
            if (contact) {
                this.otherUserName = contact.name;
                this.otherUserAvatar = contact.avatar;
            }

            await this.getUserMedia('video');
            this.buildPeerConnection();
            
            // Update UI
            this.updateCallModal();
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            this.sendSignal({
                type: 'call-offer',
                sdp: offer,
                caller_id: this.currentUserId,
                caller_name: this.currentUserName,
                call_type: 'video'
            });
            
            this.showCallModal();
            this.updateCallStatus('Calling...');
            this.showNotification('Starting video call...');
            
        } catch (error) {
            console.error('Error starting video call:', error);
            this.showNotification('Failed to start video call');
            this.reset();
        }
    }

    async getUserMedia(mediaType) {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: mediaType === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Connect to audio analyzer
            if (this.analyser && this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(this.localStream);
                source.connect(this.analyser);
            }
            
            // Update UI for video
            if (mediaType === 'video') {
                const localVideo = document.getElementById('localVideo');
                if (localVideo) {
                    localVideo.srcObject = this.localStream;
                }
            }
            
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    buildPeerConnection() {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        this.peerConnection = new RTCPeerConnection(config);
        
        // Add local tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        // Setup ICE candidate handler
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'call-ice',
                    candidate: event.candidate
                });
            }
        };
        
        // Handle incoming stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            
            if (this.callType === 'video') {
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = this.remoteStream;
                }
            } else {
                // For audio calls
                const remoteAudio = new Audio();
                remoteAudio.srcObject = this.remoteStream;
                remoteAudio.autoplay = true;
                remoteAudio.volume = 1.0;
                this.remoteAudio = remoteAudio;
            }
            
            this.callState = 'connected';
            this.updateCallStatus('Connected');
            this.startCallTimer();
            this.showNotification('Call connected');
        };
        
        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.callState = 'connected';
                    this.updateCallStatus('Connected');
                    break;
                    
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.endCall();
                    break;
            }
        };
        
        // ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
    }

    handleSignal(message) {
        // Ignore own messages
        if (message.sender_id === this.currentUserId) return;
        
        switch (message.type) {
            case 'call-offer':
                this.handleIncomingCall(message);
                break;
                
            case 'call-answer':
                this.handleAnswer(message);
                break;
                
            case 'call-ice':
                this.handleIceCandidate(message);
                break;
                
            case 'call-ended':
                this.handleCallEnded();
                break;
                
            case 'call-declined':
                this.handleCallDeclined();
                break;
        }
    }

    async handleIncomingCall(message) {
        if (this.callState !== 'idle') {
            this.sendSignal({ type: 'call-declined', reason: 'busy' });
            return;
        }
        
        this.callState = 'ringing';
        this.isCaller = false;
        this.otherUserId = message.caller_id;
        this.callType = message.call_type || 'audio';
        this.pendingOffer = message.sdp;
        
        // Set caller info
        this.otherUserName = message.caller_name || 'Unknown User';
        
        // Fetch more contact details
        const contact = await this.loadContactInfo(this.otherUserId);
        if (contact) {
            this.otherUserName = contact.name;
            this.otherUserAvatar = contact.avatar;
        }
        
        // Show appropriate incoming call modal
        this.showIncomingCallModal();
        
        // Play ringtone for audio calls
        if (this.callType === 'audio') {
            this.playRingtone();
        }
    }

    async acceptCall() {
        this.stopRingtone();
        this.hideIncomingCallModal();
        
        try {
            await this.getUserMedia(this.callType);
            this.buildPeerConnection();
            
            // Set remote description from offer
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(this.pendingOffer)
            );
            
            // Process queued ICE candidates
            for (const candidate of this.iceQueue) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            this.iceQueue = [];
            
            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.sendSignal({
                type: 'call-answer',
                sdp: answer
            });
            
            // Show call modal
            this.showCallModal();
            this.callState = 'connected';
            this.updateCallStatus('Connected');
            this.startCallTimer();
            
        } catch (error) {
            console.error('Error accepting call:', error);
            this.showNotification('Failed to accept call');
            this.reset();
        }
    }

    async handleAnswer(message) {
        if (this.callState !== 'calling') return;
        
        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
            );
            
            this.callState = 'connected';
            this.updateCallStatus('Connected');
            this.startCallTimer();
            this.showNotification('Call connected');
            
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(message) {
        try {
            const candidate = new RTCIceCandidate(message.candidate);
            
            if (this.peerConnection && this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate);
            } else {
                this.iceQueue.push(candidate);
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    handleCallEnded() {
        this.showNotification('Call ended');
        this.reset();
    }

    handleCallDeclined() {
        this.showNotification('Call declined');
        this.reset();
    }

    endCall() {
        if (this.callState === 'idle') return;
        
        // Send end call signal
        this.sendSignal({ type: 'call-ended' });
        
        // Show notification
        this.showNotification('Call ended');
        
        // Reset everything
        this.reset();
    }

    declineCall() {
        this.stopRingtone();
        this.hideIncomingCallModal();
        
        // Send decline signal
        this.sendSignal({ type: 'call-declined' });
        
        // Show notification
        this.showNotification('Call declined');
        
        this.reset();
    }

    reset() {
        // Stop call timer
        this.stopCallTimer();
        
        // Stop audio level monitoring
        if (this.audioLevelInterval) {
            clearInterval(this.audioLevelInterval);
            this.audioLevelInterval = null;
        }
        
        // Stop ringtone
        this.stopRingtone();
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Stop remote audio
        if (this.remoteAudio) {
            this.remoteAudio.pause();
            this.remoteAudio.srcObject = null;
            this.remoteAudio = null;
        }
        
        // Clear pending data
        this.pendingOffer = null;
        this.iceQueue = [];
        
        // Hide all modals
        this.hideAllModals();
        
        // Reset state
        this.callState = 'idle';
        this.isCaller = false;
        this.callType = null;
        this.callDuration = 0;
        this.otherUserId = null;
        this.otherUserName = null;
        this.otherUserAvatar = null;
    }

    updateCallModal() {
        if (this.callType === 'video') {
            // Update video call modal
            const callerName = document.getElementById('videoCallerName');
            const callerAvatar = document.getElementById('videoCallerAvatar');
            
            if (callerName) {
                callerName.textContent = this.isCaller ? 
                    `Calling ${this.otherUserName || '...'}` : 
                    this.otherUserName || 'Incoming Call';
            }
            
            if (callerAvatar && this.otherUserAvatar) {
                callerAvatar.innerHTML = `<img src="${this.otherUserAvatar}" alt="${this.otherUserName}" class="w-full h-full rounded-full object-cover">`;
            }
        } else if (this.callType === 'audio') {
            // Update audio call modal
            const callerName = document.getElementById('audioCallerName');
            const callerAvatar = document.getElementById('audioCallerAvatar');
            
            if (callerName) {
                callerName.textContent = this.isCaller ? 
                    `Calling ${this.otherUserName || '...'}` : 
                    this.otherUserName || 'Incoming Call';
            }
            
            if (callerAvatar && this.otherUserAvatar) {
                callerAvatar.innerHTML = `<img src="${this.otherUserAvatar}" alt="${this.otherUserName}" class="w-full h-full rounded-full object-cover">`;
            }
        }
    }

    showCallModal() {
        if (this.callType === 'video') {
            document.getElementById('videoCallModal').style.display = 'block';
        } else if (this.callType === 'audio') {
            document.getElementById('audioCallModal').style.display = 'block';
        }
    }

    hideCallModal() {
        document.getElementById('videoCallModal').style.display = 'none';
        document.getElementById('audioCallModal').style.display = 'none';
    }

    showIncomingCallModal() {
        if (this.callType === 'video') {
            const modal = document.getElementById('incomingVideoCallModal');
            const callerName = document.getElementById('incomingVideoCallerName');
            const callerAvatar = document.getElementById('incomingVideoCallerAvatar');
            
            if (callerName) {
                callerName.textContent = this.otherUserName || 'Incoming Video Call';
            }
            
            if (callerAvatar && this.otherUserAvatar) {
                callerAvatar.innerHTML = `<img src="${this.otherUserAvatar}" alt="${this.otherUserName}" class="w-full h-full rounded-full object-cover">`;
            }
            
            modal.style.display = 'block';
        } else if (this.callType === 'audio') {
            const modal = document.getElementById('incomingAudioCallModal');
            const callerName = document.getElementById('incomingAudioCallerName');
            const callerAvatar = document.getElementById('incomingAudioCallerAvatar');
            
            if (callerName) {
                callerName.textContent = this.otherUserName || 'Incoming Audio Call';
            }
            
            if (callerAvatar && this.otherUserAvatar) {
                callerAvatar.innerHTML = `<img src="${this.otherUserAvatar}" alt="${this.otherUserName}" class="w-full h-full rounded-full object-cover">`;
            }
            
            modal.style.display = 'block';
        }
    }

    hideIncomingCallModal() {
        document.getElementById('incomingVideoCallModal').style.display = 'none';
        document.getElementById('incomingAudioCallModal').style.display = 'none';
    }

    hideAllModals() {
        this.hideCallModal();
        this.hideIncomingCallModal();
    }

    updateCallStatus(status) {
        if (this.callType === 'video') {
            const statusElement = document.getElementById('videoCallStatus');
            if (statusElement) {
                statusElement.textContent = status;
            }
        } else if (this.callType === 'audio') {
            const statusElement = document.getElementById('audioCallStatus');
            if (statusElement) {
                statusElement.textContent = status;
            }
        }
    }

    startCallTimer() {
        this.callDuration = 0;
        this.updateCallTimer();
        
        if (this.callTimer) clearInterval(this.callTimer);
        
        this.callTimer = setInterval(() => {
            this.callDuration++;
            this.updateCallTimer();
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    updateCallTimer() {
        const minutes = Math.floor(this.callDuration / 60);
        const seconds = this.callDuration % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update video call timer
        const videoTimer = document.getElementById('videoCallDuration');
        if (videoTimer) {
            videoTimer.textContent = timeString;
        }
        
        // Update audio call timer
        const audioTimer = document.getElementById('audioCallDuration');
        if (audioTimer) {
            audioTimer.textContent = timeString;
        }
    }

    sendSignal(payload) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            payload.sender_id = this.currentUserId;
            payload.target_user_id = this.otherUserId;
            console.log('Sending signal:', payload);
            this.socket.send(JSON.stringify(payload));
        } else {
            console.error('WebSocket not connected');
        }
    }

    showNotification(message) {
        const notification = document.getElementById('callNotification');
        const text = document.getElementById('notificationText');
        const icon = document.getElementById('notificationIcon');
        
        if (!notification || !text || !icon) return;
        
        text.textContent = message;
        
        // Set icon based on message
        if (message.includes('Calling') || message.includes('ringing')) {
            icon.className = 'fas fa-phone notification-icon';
        } else if (message.includes('connected')) {
            icon.className = 'fas fa-phone-volume notification-icon';
        } else if (message.includes('ended') || message.includes('declined')) {
            icon.className = 'fas fa-phone-slash notification-icon';
        } else if (message.includes('muted')) {
            icon.className = 'fas fa-microphone-slash notification-icon';
        } else {
            icon.className = 'fas fa-info-circle notification-icon';
        }
        
        notification.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;
        
        audioTrack.enabled = !audioTrack.enabled;
        
        // Update mute button UI
        let muteButton;
        if (this.callType === 'video') {
            muteButton = document.getElementById('videoMuteBtn');
        } else {
            muteButton = document.getElementById('audioMuteBtn');
        }
        
        if (muteButton) {
            const icon = muteButton.querySelector('i');
            if (audioTrack.enabled) {
                muteButton.classList.remove('active');
                icon.className = 'fas fa-microphone';
                this.showNotification('Microphone unmuted');
            } else {
                muteButton.classList.add('active');
                icon.className = 'fas fa-microphone-slash';
                this.showNotification('Microphone muted');
            }
        }
    }

    toggleVideo() {
        if (!this.localStream || this.callType !== 'video') return;
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        videoTrack.enabled = !videoTrack.enabled;
        
        const videoButton = document.getElementById('videoToggleBtn');
        if (videoButton) {
            const icon = videoButton.querySelector('i');
            if (videoTrack.enabled) {
                videoButton.classList.remove('active');
                icon.className = 'fas fa-video';
                this.showNotification('Camera on');
            } else {
                videoButton.classList.add('active');
                icon.className = 'fas fa-video-slash';
                this.showNotification('Camera off');
            }
        }
    }

    playRingtone() {
        // Simple ringtone using Web Audio API
        try {
            this.ringtoneContext = new (window.AudioContext || window.webkitAudioContext)();
            this.ringtoneOscillator = this.ringtoneContext.createOscillator();
            this.ringtoneGain = this.ringtoneContext.createGain();
            
            this.ringtoneOscillator.connect(this.ringtoneGain);
            this.ringtoneGain.connect(this.ringtoneContext.destination);
            
            this.ringtoneOscillator.type = 'sine';
            this.ringtoneOscillator.frequency.value = 800;
            
            this.ringtoneGain.gain.setValueAtTime(0.3, this.ringtoneContext.currentTime);
            
            // Create a beeping pattern
            this.ringtoneOscillator.start();
            
            // Beep pattern: beep-beep-pause
            const beepDuration = 0.2;
            const pauseDuration = 0.1;
            const cycleDuration = (beepDuration * 2) + pauseDuration;
            
            let startTime = this.ringtoneContext.currentTime;
            
            // First beep
            this.ringtoneGain.gain.setValueAtTime(0.3, startTime);
            this.ringtoneGain.gain.setValueAtTime(0, startTime + beepDuration);
            
            // Second beep
            startTime += beepDuration + pauseDuration;
            this.ringtoneGain.gain.setValueAtTime(0.3, startTime);
            this.ringtoneGain.gain.setValueAtTime(0, startTime + beepDuration);
            
            // Repeat
            this.ringtoneInterval = setInterval(() => {
                startTime = this.ringtoneContext.currentTime;
                
                // First beep
                this.ringtoneGain.gain.setValueAtTime(0.3, startTime);
                this.ringtoneGain.gain.setValueAtTime(0, startTime + beepDuration);
                
                // Second beep
                startTime += beepDuration + pauseDuration;
                this.ringtoneGain.gain.setValueAtTime(0.3, startTime);
                this.ringtoneGain.gain.setValueAtTime(0, startTime + beepDuration);
            }, cycleDuration * 1000);
            
        } catch (error) {
            console.error('Error playing ringtone:', error);
        }
    }

    stopRingtone() {
        if (this.ringtoneOscillator) {
            this.ringtoneOscillator.stop();
            this.ringtoneOscillator = null;
        }
        
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
        
        if (this.ringtoneContext) {
            this.ringtoneContext.close();
            this.ringtoneContext = null;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedCallManager = new UnifiedCallManager();
    console.log('Unified Call Manager initialized');
});