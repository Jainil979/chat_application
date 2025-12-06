// Audio Call Manager
class AudioCallManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCaller = false;
        this.callState = 'idle'; // idle, calling, ringing, connected, ended
        this.callType = 'audio';
        this.callDuration = 0;
        this.callTimer = null;
        this.iceQueue = [];
        this.currentUserId = window.CURRENT_USER_ID;
        this.otherUserId = null;
        this.otherUserName = null;
        this.otherUserAvatar = null;
        
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.audioLevelInterval = null;
        
        this.initialize();
    }

    initialize() {
        this.setupPeerConfig();
        this.setupEventListeners();
        this.setupAudioVisualization();
        this.enumerateDevices();
    }

    setupPeerConfig() {
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
    }

    setupEventListeners() {
        // Phone button in chat header
        document.querySelector('.fa-phone').closest('button').addEventListener('click', () => {
            this.initiateCall();
        });

        // Modal buttons
        document.getElementById('endAudioCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('audioMuteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('audioSpeakerBtn').addEventListener('click', () => this.toggleSpeaker());
        document.getElementById('audioHoldBtn').addEventListener('click', () => this.toggleHold());
        document.getElementById('audioKeypadBtn').addEventListener('click', () => this.showKeypad());
        document.getElementById('audioCallClose').addEventListener('click', () => this.closeCallModal());
        
        // Incoming call buttons
        document.getElementById('acceptAudioCallBtn').addEventListener('click', () => this.acceptCall());
        document.getElementById('declineAudioCallBtn').addEventListener('click', () => this.declineCall());
        
        // Device selection
        document.getElementById('audioInputSelect').addEventListener('change', (e) => this.changeAudioInput(e.target.value));
        document.getElementById('audioOutputSelect').addEventListener('change', (e) => this.changeAudioOutput(e.target.value));
    }

    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputSelect = document.getElementById('audioInputSelect');
            const audioOutputSelect = document.getElementById('audioOutputSelect');
            
            // Clear existing options
            audioInputSelect.innerHTML = '<option>Select Microphone</option>';
            audioOutputSelect.innerHTML = '<option>Select Speaker</option>';
            
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Device ${device.deviceId.slice(0, 5)}...`;
                
                if (device.kind === 'audioinput') {
                    audioInputSelect.appendChild(option.cloneNode(true));
                } else if (device.kind === 'audiooutput') {
                    audioOutputSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error enumerating devices:', error);
        }
    }

    async initiateCall() {
        if (this.callState !== 'idle') {
            this.showNotification('Already in a call');
            return;
        }

        this.callState = 'calling';
        this.isCaller = true;
        this.otherUserId = window.OTHER_USER_ID;

        try {
            // Get user media (audio only)
            await this.getUserMedia();
            
            // Setup peer connection
            this.buildPeerConnection();
            
            // Create and send offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            // Send signaling message through existing signaling socket
            this.sendSignal({
                type: 'audio-offer',
                sdp: offer,
                caller_id: this.currentUserId,
                call_type: 'audio'
            });
            
            // Show call modal
            this.showCallModal();
            this.updateCallStatus('Calling...');
            this.showNotification('Calling...');
            
        } catch (error) {
            console.error('Error initiating call:', error);
            this.showNotification('Failed to start call');
            this.reset();
        }
    }

    async getUserMedia(deviceId = null) {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    ...(deviceId && { deviceId: { exact: deviceId } })
                },
                video: false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupAudioVisualization();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    }

    buildPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.pcConfig);
        
        // Add local tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        // Setup event handlers
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'audio-ice',
                    candidate: event.candidate
                });
            }
        };
        
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.playRemoteAudio();
        };
        
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.callState = 'connected';
                    this.startCallTimer();
                    this.updateCallStatus('Connected');
                    this.showNotification('Call connected');
                    break;
                    
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.endCall();
                    break;
            }
        };
        
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
    }

    playRemoteAudio() {
        // Create an audio element for remote stream
        const remoteAudio = new Audio();
        remoteAudio.srcObject = this.remoteStream;
        remoteAudio.autoplay = true;
        remoteAudio.volume = 1.0;
        
        // Store reference
        this.remoteAudioElement = remoteAudio;
    }

    setupAudioVisualization() {
        if (!this.localStream || !window.AudioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.localStream);
            
            this.analyser.fftSize = 256;
            this.microphone.connect(this.analyser);
            
            // Start audio level monitoring
            this.startAudioLevelMonitoring();
            
        } catch (error) {
            console.error('Error setting up audio visualization:', error);
        }
    }

    startAudioLevelMonitoring() {
        if (this.audioLevelInterval) clearInterval(this.audioLevelInterval);
        
        this.audioLevelInterval = setInterval(() => {
            if (!this.analyser) return;
            
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

    // Handle incoming signaling messages
    handleSignal(message) {
        // Ignore our own messages
        if (message.sender_id === this.currentUserId) return;
        
        console.log('Received audio signal:', message.type);
        
        switch (message.type) {
            case 'audio-offer':
                this.handleIncomingCall(message);
                break;
                
            case 'audio-answer':
                this.handleAnswer(message);
                break;
                
            case 'audio-ice':
                this.handleIceCandidate(message);
                break;
                
            case 'audio-call-ended':
                this.handleCallEnded();
                break;
                
            case 'audio-call-declined':
                this.handleCallDeclined();
                break;
        }
    }

    async handleIncomingCall(message) {
        if (this.callState !== 'idle') {
            // Busy - send busy signal
            this.sendSignal({ type: 'audio-call-declined', reason: 'busy' });
            return;
        }
        
        this.callState = 'ringing';
        this.isCaller = false;
        this.otherUserId = message.caller_id;
        this.pendingOffer = message.sdp;
        
        // Fetch caller info from contacts
        await this.fetchCallerInfo(this.otherUserId);
        
        // Show incoming call modal
        this.showIncomingCallModal();
        
        // Play ringtone
        this.playRingtone();
    }

    async fetchCallerInfo(userId) {
        try {
            const contacts = await this.loadContacts();
            const contact = contacts.find(c => c.contact_id == userId);
            
            if (contact) {
                this.otherUserName = contact.name;
                this.otherUserAvatar = contact.avatar;
                
                // Update UI
                document.getElementById('incomingAudioCallName').textContent = contact.name;
                if (contact.avatar) {
                    document.getElementById('incomingAudioCallAvatar').innerHTML = 
                        `<img src="${contact.avatar}" alt="${contact.name}" class="w-full h-full rounded-full object-cover">`;
                }
            }
        } catch (error) {
            console.error('Error fetching caller info:', error);
        }
    }

    async loadContacts() {
        try {
            const response = await fetch('/chat/api/contacts/', {
                credentials: 'same-origin'
            });
            
            if (!response.ok) throw new Error('Failed to load contacts');
            return await response.json();
        } catch (error) {
            console.error('Error loading contacts:', error);
            return [];
        }
    }

    async acceptCall() {
        this.stopRingtone();
        this.hideIncomingCallModal();
        
        try {
            await this.getUserMedia();
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
                type: 'audio-answer',
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
        this.sendSignal({ type: 'audio-call-ended' });
        
        // Show notification
        this.showNotification('Call ended');
        
        // Reset everything
        this.reset();
    }

    declineCall() {
        this.stopRingtone();
        this.hideIncomingCallModal();
        
        // Send decline signal
        this.sendSignal({ type: 'audio-call-declined' });
        
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
        if (this.remoteAudioElement) {
            this.remoteAudioElement.pause();
            this.remoteAudioElement.srcObject = null;
            this.remoteAudioElement = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Clear pending data
        this.pendingOffer = null;
        this.iceQueue = [];
        
        // Hide modals
        this.hideCallModal();
        this.hideIncomingCallModal();
        
        // Reset state
        this.callState = 'idle';
        this.isCaller = false;
        this.callDuration = 0;
        this.otherUserId = null;
        this.otherUserName = null;
        this.otherUserAvatar = null;
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;
        
        audioTrack.enabled = !audioTrack.enabled;
        
        const button = document.getElementById('audioMuteBtn');
        const icon = button.querySelector('i');
        
        if (audioTrack.enabled) {
            button.classList.remove('active');
            icon.className = 'fas fa-microphone';
            this.showNotification('Microphone unmuted');
        } else {
            button.classList.add('active');
            icon.className = 'fas fa-microphone-slash';
            this.showNotification('Microphone muted');
        }
    }

    toggleSpeaker() {
        // This would typically control audio output device
        // For now, just toggle UI state
        const button = document.getElementById('audioSpeakerBtn');
        const icon = button.querySelector('i');
        
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            icon.className = 'fas fa-volume-up';
            this.showNotification('Speaker on');
        } else {
            button.classList.add('active');
            icon.className = 'fas fa-volume-off';
            this.showNotification('Speaker off');
        }
    }

    toggleHold() {
        const button = document.getElementById('audioHoldBtn');
        const icon = button.querySelector('i');
        
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            icon.className = 'fas fa-pause';
            this.showNotification('Call resumed');
            
            // Resume audio tracks
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = true;
                });
            }
        } else {
            button.classList.add('active');
            icon.className = 'fas fa-play';
            this.showNotification('Call on hold');
            
            // Mute audio tracks
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
            }
        }
    }

    showKeypad() {
        // Implement DTMF keypad if needed
        this.showNotification('Keypad activated');
    }

    async changeAudioInput(deviceId) {
        if (!deviceId || deviceId === 'Select Microphone') return;
        
        try {
            // Stop current stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            // Get new stream with selected device
            await this.getUserMedia(deviceId);
            
            // Replace audio track in peer connection
            if (this.peerConnection) {
                const audioTrack = this.localStream.getAudioTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'audio'
                );
                
                if (sender) {
                    sender.replaceTrack(audioTrack);
                }
            }
            
            this.showNotification('Microphone changed');
        } catch (error) {
            console.error('Error changing audio input:', error);
            this.showNotification('Failed to change microphone');
        }
    }

    async changeAudioOutput(deviceId) {
        if (!deviceId || deviceId === 'Select Speaker') return;
        
        // Note: This requires setSinkId() which may not be supported in all browsers
        if (this.remoteAudioElement && this.remoteAudioElement.setSinkId) {
            try {
                await this.remoteAudioElement.setSinkId(deviceId);
                this.showNotification('Speaker changed');
            } catch (error) {
                console.error('Error changing audio output:', error);
                this.showNotification('Failed to change speaker');
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
        const timerElement = document.getElementById('callDuration');
        
        if (timerElement) {
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateCallStatus(status) {
        const statusElement = document.getElementById('audioCallStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    playRingtone() {
        // Create a simple ringtone using Web Audio API
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

    // UI Methods
    showCallModal() {
        // Update modal with caller info
        
        this.otherUserName = window.OTHER_USER_NAME
        this.otherUserAvatar = window.OTHER_USER_AVATAR


        if (this.otherUserName) {
            document.getElementById('audioCallName').textContent = this.otherUserName;
        }
        
        if (this.otherUserAvatar) {
            document.getElementById('audioCallAvatar').innerHTML = 
                `<img src="${this.otherUserAvatar}" alt="${this.otherUserName}" class="w-full h-full rounded-full object-cover">`;
        }
        
        document.getElementById('audioCallModal').style.display = 'block';
    }

    hideCallModal() {
        document.getElementById('audioCallModal').style.display = 'none';
    }

    closeCallModal() {
        this.endCall();
    }

    showIncomingCallModal() {
        document.getElementById('incomingAudioCallModal').style.display = 'block';
    }

    hideIncomingCallModal() {
        document.getElementById('incomingAudioCallModal').style.display = 'none';
    }

    showNotification(message) {
        const notification = document.getElementById('callStatusNotification');
        const text = document.getElementById('callStatusText');
        const icon = document.getElementById('callStatusIcon');
        
        text.textContent = message;
        
        // Set icon based on message
        if (message.includes('Calling') || message.includes('ringing')) {
            icon.className = 'fas fa-phone';
        } else if (message.includes('connected')) {
            icon.className = 'fas fa-phone-volume';
        } else if (message.includes('ended') || message.includes('declined')) {
            icon.className = 'fas fa-phone-slash';
        } else if (message.includes('muted')) {
            icon.className = 'fas fa-microphone-slash';
        } else {
            icon.className = 'fas fa-info-circle';
        }
        
        notification.style.display = 'flex';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Send signal through existing WebSocket
    sendSignal(payload) {
        // Use the existing video call manager's signaling or create a new one
        if (window.videoCallManager && window.videoCallManager.sendSignal) {
            window.videoCallManager.sendSignal({
                ...payload,
                target_user_id: this.otherUserId
            });
        } else {
            console.log('Audio call signal:', payload);
            // Fallback: You might want to implement your own WebSocket connection here
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other managers to initialize
    setTimeout(() => {
        window.audioCallManager = new AudioCallManager();
        console.log('Audio Call Manager initialized');
    }, 1000);
});

// Helper function to integrate with existing signaling
function setupAudioCallSignaling(websocket) {
    if (!window.audioCallManager) return;
    
    websocket.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            
            // Check if it's an audio call message
            if (message.type && message.type.startsWith('audio-')) {
                window.audioCallManager.handleSignal(message);
            }
        } catch (error) {
            console.error('Error parsing audio call message:', error);
        }
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioCallManager, setupAudioCallSignaling };
}

// document.addEventListener('DOMContentLoaded', () => {
//     window.audioCallManager = new AudioCallManager();
// });