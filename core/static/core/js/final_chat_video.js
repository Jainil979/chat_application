
// let VideoCallBtn = document.getElementById('videoCallBtn');
// let VideoCallSocket;


// // When Message Occur in this video call scoket
// function webSocketOnMessage(event) {
//     let parsedData = JSON.parse(event.data);

//     let message = parsedData['message'];
// }


// function openVideoCallUI() {

//     let localStream = new MediaStream();

//     const constraints = {
//         'video': true,
//         'audio': true
//     }

//     let localVideo = document.getElementById('localVideo');

//     let userMedia = navigator.mediaDevices.getUserMedia(constraints)
//         .then(stream => {
//             localStream = stream;
//             localVideo.srcObject = localStream;
//             localVideo.muted = true;
//         })
//         .catch(error => {
//             console.log("Error accessing media devices : ", error);
//         })

//     document.getElementById('videoModal').style.display = 'block';
// }



// VideoCallBtn.addEventListener('click', () => {

//     // Create WebSocket EndPoint For VideoCall
//     let location = window.location;
//     let webSocketStart = 'ws://';

//     if (location.protocol == 'https:') {
//         webSocketStart = 'wss://';
//     }

//     let VideoCallSocketUrl = webSocketStart + location.host + '/ws/videocall/';


//     VideoCallSocket = new WebSocket(VideoCallSocketUrl);


//     VideoCallSocket.addEventListener('open', (event) => {
//         console.log("Conection Opened");

//         let JsonStr = JSON.stringify({
//             'message': 'This is a message',
//         })

//         VideoCallSocket.send(JsonStr);
//     });

//     openVideoCallUI();

//     VideoCallSocket.addEventListener('message', webSocketOnMessage);

//     VideoCallSocket.addEventListener('close', (event) => {
//         console.log("Conection Closed");
//     });

//     VideoCallSocket.addEventListener('error', (event) => {
//         console.log("Error Occured");
//     });

// });



// class VideoCallManager {
//     constructor() {
//         this.socket = null;
//         this.peerConnection = null;
//         this.localStream = null;
//         this.remoteStream = null;
//         this.isCallActive = false;
//         this.isCaller = false;
//         this.currentUserId = window.CURRENT_USER_ID; // Replace with actual current user ID
//         this.otherUserId = window.OTHER_USER_ID; // Replace with actual other user ID
//         this.callState = 'idle'; // idle, calling, ringing, connected
//         this.iceCandidateQueue = []; // Queue for ICE candidates


//         this.setupPeerConnectionConfig();

//         this.setupEventListeners();
//     }

//     setupPeerConnectionConfig() {
//         this.pcConfig = {
//             iceServers: [
//                 { urls: 'stun:stun.l.google.com:19302' },
//                 { urls: 'stun:stun1.l.google.com:19302' }
//             ]
//         };
//     }

//     setupEventListeners() {
//         // Video call button
//         document.getElementById('videoCallBtn').addEventListener('click', () => {
//             this.initiateCall();
//         });

//         // Call controls
//         document.getElementById('endCallBtn').addEventListener('click', () => {
//             this.endCall();
//         });

//         document.getElementById('muteBtn').addEventListener('click', () => {
//             this.toggleMute();
//         });

//         document.getElementById('videoToggleBtn').addEventListener('click', () => {
//             this.toggleVideo();
//         });

//         // Incoming call controls
//         document.getElementById('acceptCallBtn').addEventListener('click', () => {
//             this.acceptCall();
//         });

//         document.getElementById('declineCallBtn').addEventListener('click', () => {
//             this.declineCall();
//         });
//     }

//     async initiateCall() {
//         if (this.isCallActive || this.callState !== 'idle') {
//             this.showStatus('Call already in progress');
//             return;
//         }

//         try {
//             this.callState = 'calling';
//             this.isCaller = true;

//             console.log('step 1');
//             // Create socket connection
//             await this.createSocketConnection();

//             // Get user media
//             await this.getUserMedia();
//             console.log('step 4');

//             // Create peer connection
//             this.createPeerConnection();

//             // Create and send offer
//             const offer = await this.peerConnection.createOffer({
//                 offerToReceiveAudio: true,
//                 offerToReceiveVideo: true
//             });
//             console.log('step 5');

//             await this.peerConnection.setLocalDescription(offer);
//             console.log('step 6');

//             // Send offer through WebSocket
//             this.sendSignal({
//                 type: 'offer',
//                 sdp: offer
//             });

//             this.showVideoModal();
//             this.updateConnectionStatus('Calling...');

//         } catch (error) {
//             console.error('Error initiating call:', error);
//             this.showStatus('Failed to start call: ' + error.message);
//             this.resetCall();
//         }
//     }

//     async createSocketConnection() {
//         return new Promise((resolve, reject) => {
//             const wsUrl = `wss://127.0.0.1:8443/ws/signaling/${this.otherUserId}/`;
//             this.socket = new WebSocket(wsUrl);

//             this.socket.onopen = () => {
//                 console.log('WebSocket connected');
//                 console.log('step 2');
//                 resolve();
//             };

//             this.socket.onerror = (error) => {
//                 console.error('WebSocket error:', error);
//                 reject(new Error('WebSocket connection failed'));
//             };

//             this.socket.onmessage = (event) => {
//                 const message = JSON.parse(event.data);

//                 console.log('step 3');

//                 // Ignore messages from ourselves
//                 if (message.sender_id && message.sender_id === this.currentUserId) {
//                     return;
//                 }

//                 this.handleSignalingMessage(message);
//             };

//             this.socket.onclose = () => {
//                 console.log('WebSocket closed');
//                 if (this.isCallActive) {
//                     this.showStatus('Connection lost');
//                     this.endCall();
//                 }
//             };
//         });
//     }

//     async getUserMedia() {
//         try {
//             this.localStream = await navigator.mediaDevices.getUserMedia({
//                 video: true,
//                 audio: true
//             });

//             document.getElementById('localVideo').srcObject = this.localStream;

//         } catch (error) {
//             console.error('Error getting user media:', error);
//             throw new Error('Camera/microphone access denied');
//         }
//     }

//     createPeerConnection() {
//         this.peerConnection = new RTCPeerConnection(this.pcConfig);

//         // Add local stream tracks
//         if (this.localStream) {
//             this.localStream.getTracks().forEach(track => {
//                 this.peerConnection.addTrack(track, this.localStream);
//                 console.log('step 5');
//             });
//         }

//         // Handle remote stream
//         this.peerConnection.ontrack = (event) => {
//             console.log('Received remote stream');
//             this.remoteStream = event.streams[0];
//             document.getElementById('remoteVideo').srcObject = this.remoteStream;
//             this.updateConnectionStatus('Connected');
//         };

//         // Handle ICE candidates
//         this.peerConnection.onicecandidate = (event) => {
//             if (event.candidate) {
//                 this.sendSignal({
//                     type: 'ice-candidate',
//                     candidate: event.candidate
//                 });
//             }
//         };

//         // Handle connection state changes
//         this.peerConnection.onconnectionstatechange = () => {
//             console.log('Connection state:', this.peerConnection.connectionState);

//             switch (this.peerConnection.connectionState) {
//                 case 'connected':
//                     this.isCallActive = true;
//                     this.callState = 'connected';
//                     this.updateConnectionStatus('Connected');
//                     break;
//                 case 'disconnected':
//                 case 'failed':
//                 case 'closed':
//                     this.endCall();
//                     break;
//             }
//         };
//     }

//     async handleSignalingMessage(message) {
//         console.log('Received signaling message:', message.type);

//         try {
//             switch (message.type) {
//                 case 'offer':
//                     await this.handleOffer(message);
//                     break;
//                 case 'answer':
//                     await this.handleAnswer(message);
//                     break;
//                 case 'ice-candidate':
//                     await this.handleIceCandidate(message);
//                     break;
//                 case 'call-declined':
//                     this.handleCallDeclined();
//                     break;
//                 case 'call-ended':
//                     this.endCall();
//                     break;
//             }
//         } catch (error) {
//             console.error('Error handling signaling message:', error);
//         }
//     }

//     async handleOffer(message) {
//         // Only handle offer if we're not already in a call
//         if (this.callState !== 'idle') {
//             console.log('Ignoring offer, already in call state:', this.callState);
//             return;
//         }

//         this.callState = 'ringing';
//         this.isCaller = false;

//         // Show incoming call modal
//         this.showIncomingCallModal();

//         // Store the offer for later use
//         this.pendingOffer = message;
//     }

//     async acceptCall() {
//         try {
//             this.hideIncomingCallModal();

//             // Get user media
//             await this.getUserMedia();

//             // Create peer connection
//             this.createPeerConnection();

//             // Set remote description (the offer)
//             await this.peerConnection.setRemoteDescription(
//                 new RTCSessionDescription(this.pendingOffer.sdp)
//             );

//             // Process any queued ICE candidates now that remote description is set
//             await this.processQueuedIceCandidates();

//             // Create and send answer
//             const answer = await this.peerConnection.createAnswer();
//             await this.peerConnection.setLocalDescription(answer);

//             // Create socket connection if not exists
//             if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
//                 await this.createSocketConnection();
//             }

//             this.sendSignal({
//                 type: 'answer',
//                 sdp: answer
//             });

//             this.showVideoModal();
//             this.updateConnectionStatus('Connecting...');
//             this.callState = 'connected';

//         } catch (error) {
//             console.error('Error accepting call:', error);
//             this.showStatus('Failed to accept call: ' + error.message);
//             this.resetCall();
//         }
//     }

//     async handleAnswer(message) {
//         if (this.callState !== 'calling' || !this.peerConnection) {
//             console.log('Received unexpected answer in state:', this.callState);
//             return;
//         }

//         try {
//             await this.peerConnection.setRemoteDescription(
//                 new RTCSessionDescription(message.sdp)
//             );

//             // Process any queued ICE candidates now that remote description is set
//             await this.processQueuedIceCandidates();

//             this.callState = 'connected';
//             this.updateConnectionStatus('Connecting...');

//         } catch (error) {
//             console.error('Error handling answer:', error);
//             this.showStatus('Call connection failed');
//             this.endCall();
//         }
//     }

//     async handleIceCandidate(message) {
//         if (!this.peerConnection || !message.candidate) {
//             return;
//         }

//         // If remote description is not set, queue the candidate
//         if (!this.peerConnection.remoteDescription) {
//             console.log('Queueing ICE candidate - remote description not set yet');
//             this.iceCandidateQueue.push(message.candidate);
//             return;
//         }

//         try {
//             await this.peerConnection.addIceCandidate(
//                 new RTCIceCandidate(message.candidate)
//             );
//         } catch (error) {
//             console.error('Error adding ICE candidate:', error);
//         }
//     }

//     async processQueuedIceCandidates() {
//         while (this.iceCandidateQueue.length > 0) {
//             const candidate = this.iceCandidateQueue.shift();
//             try {
//                 await this.peerConnection.addIceCandidate(
//                     new RTCIceCandidate(candidate)
//                 );
//                 console.log('Processed queued ICE candidate');
//             } catch (error) {
//                 console.error('Error processing queued ICE candidate:', error);
//             }
//         }
//     }

//     declineCall() {
//         this.hideIncomingCallModal();

//         if (this.socket && this.socket.readyState === WebSocket.OPEN) {
//             this.sendSignal({ type: 'call-declined' });
//         }

//         this.resetCall();
//     }

//     handleCallDeclined() {
//         this.showStatus('Call declined');
//         this.hideVideoModal();
//         this.resetCall();
//     }

//     endCall() {
//         // Send end call signal
//         if (this.socket && this.socket.readyState === WebSocket.OPEN) {
//             this.sendSignal({ type: 'call-ended' });
//         }

//         this.hideVideoModal();
//         this.hideIncomingCallModal();
//         this.resetCall();
//     }

//     resetCall() {
//         // Clean up peer connection
//         if (this.peerConnection) {
//             this.peerConnection.close();
//             this.peerConnection = null;
//         }

//         // Stop local stream
//         if (this.localStream) {
//             this.localStream.getTracks().forEach(track => track.stop());
//             this.localStream = null;
//         }

//         // Close socket
//         if (this.socket) {
//             this.socket.close();
//             this.socket = null;
//         }

//         // Reset state
//         this.isCallActive = false;
//         this.isCaller = false;
//         this.callState = 'idle';
//         this.remoteStream = null;
//         this.pendingOffer = null;
//         this.iceCandidateQueue = []; // Clear ICE candidate queue
//     }

//     toggleMute() {
//         if (this.localStream) {
//             const audioTrack = this.localStream.getAudioTracks()[0];
//             if (audioTrack) {
//                 audioTrack.enabled = !audioTrack.enabled;
//                 const btn = document.getElementById('muteBtn');
//                 const icon = btn.querySelector('i');

//                 if (audioTrack.enabled) {
//                     btn.classList.remove('active');
//                     icon.className = 'fas fa-microphone';
//                 } else {
//                     btn.classList.add('active');
//                     icon.className = 'fas fa-microphone-slash';
//                 }
//             }
//         }
//     }

//     toggleVideo() {
//         if (this.localStream) {
//             const videoTrack = this.localStream.getVideoTracks()[0];
//             if (videoTrack) {
//                 videoTrack.enabled = !videoTrack.enabled;
//                 const btn = document.getElementById('videoToggleBtn');
//                 const icon = btn.querySelector('i');

//                 if (videoTrack.enabled) {
//                     btn.classList.remove('active');
//                     icon.className = 'fas fa-video';
//                 } else {
//                     btn.classList.add('active');
//                     icon.className = 'fas fa-video-slash';
//                 }
//             }
//         }
//     }

//     sendSignal(message) {
//         if (this.socket && this.socket.readyState === WebSocket.OPEN) {
//             // Add sender_id to identify who sent the message
//             message.sender_id = this.currentUserId;
//             console.log('step 6');
//             this.socket.send(JSON.stringify(message));
//         }
//     }

//     showVideoModal() {
//         document.getElementById('videoModal').style.display = 'block';
//         console.log('step 8');
//     }

//     hideVideoModal() {
//         document.getElementById('videoModal').style.display = 'none';
//     }

//     showIncomingCallModal() {
//         document.getElementById('callerName').textContent = document.getElementById('currentChatName').textContent;
//         document.getElementById('incomingCallModal').style.display = 'block';
//     }

//     hideIncomingCallModal() {
//         document.getElementById('incomingCallModal').style.display = 'none';
//     }

//     updateConnectionStatus(status) {
//         const statusEl = document.getElementById('connectionStatus');
//         statusEl.textContent = status;

//         statusEl.className = 'connection-status';
//         if (status === 'Connected') {
//             statusEl.classList.add('connected');
//         } else if (status.includes('Connecting') || status.includes('Calling')) {
//             statusEl.classList.add('connecting');
//         } else {
//             statusEl.classList.add('disconnected');
//         }
//     }

//     showStatus(message) {
//         const statusEl = document.getElementById('statusMessage');
//         statusEl.textContent = message;
//         statusEl.style.display = 'block';

//         setTimeout(() => {
//             statusEl.style.display = 'none';
//         }, 3000);
//     }
// }











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

        this.socket.onopen = () => console.log('[Signaling] connected');
        this.socket.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            this.otherUserName = msg.otherUserName;
            this.otherUserId = msg.sender_id;

            if (msg.sender_id === this.currentUserId) {
                console.log('yes');
                return;
            }
            this.handleSignal(msg);
        };
        this.socket.onerror = e => console.error('[Signaling] error', e);
        this.socket.onclose = () => console.warn('[Signaling] closed');
    }

    sendSignal(payload) {
        payload.otherUserName = window.CURRENT_USERNAME;
        payload.sender_id = this.currentUserId;
        payload.target_user_id = this.otherUserId;
        console.log(payload);
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
        if (this.callState !== 'idle') return this.showStatus('Already in call');
        this.callState = 'calling'; this.isCaller = true;
        try {
            await this.getUserMedia();
            this.buildPeerConnection();
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            this.sendSignal({ type: 'offer', sdp: offer });
            this.showVideoModal();
            this.updateConnectionStatus('Calling…');
        } catch (e) {
            console.error(e);
            this.showStatus('Call failed: ' + e.message);
            this.reset();
        }
    }

    async getUserMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true, audio: true
        });
        document.getElementById('localVideo').srcObject = this.localStream;

        const btn1 = document.getElementById('muteBtn');
        const icon1 = btn1.querySelector('i');
        btn1.classList.remove('active');
        icon1.className = 'fas fa-microphone';

        const btn2 = document.getElementById('videoToggleBtn');
        const icon2 = btn2.querySelector('i');
        btn2.classList.remove('active');
        icon2.className = 'fas fa-video';
    }


    buildPeerConnection() {
        this.pc = new RTCPeerConnection(this.pcConfig);
        this.localStream.getTracks()
            .forEach(t => this.pc.addTrack(t, this.localStream));

        this.pc.onicecandidate = e => {
            if (e.candidate) {
                this.sendSignal({ type: 'ice', candidate: e.candidate });
            }
        };

        this.pc.ontrack = e => {
            document.getElementById('remoteVideo').srcObject = e.streams[0];
            this.updateConnectionStatus('Connected');
        };

        this.pc.onconnectionstatechange = () => {
            if (this.pc.connectionState === 'connected') {
                this.callState = 'connected';
                this.updateConnectionStatus('Connected');
            } else if (['disconnected', 'failed', 'closed']
                .includes(this.pc.connectionState)) {
                this.reset();
            }
        };
    }

    // ─── 2) SIGNALING MESSAGE ROUTER ────────────────────────────────────────────
    async handleSignal(msg) {
        switch (msg.type) {
            case 'offer': return this.onOffer(msg);
            case 'answer': return this.onAnswer(msg);
            case 'ice': return this.onIce(msg);
            case 'call-ended':
            case 'call-declined':
                return this.reset();
        }
    }

    async onOffer({ sdp }) {
        if (this.callState !== 'idle') return;
        console.log('yes');
        this.callState = 'ringing'; this.isCaller = false;
        this.pendingOffer = sdp;
        this.showIncomingCallModal();
    }

    async acceptCall() {
        this.hideIncomingCallModal();
        await this.getUserMedia();
        this.buildPeerConnection();
        await this.pc.setRemoteDescription(
            new RTCSessionDescription(this.pendingOffer)
        );
        for (let c of this.iceQueue) {
            await this.pc.addIceCandidate(new RTCIceCandidate(c));
        }
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        // payload = ;
        this.sendSignal({ type: 'answer', sdp: answer });
        this.showVideoModal();
        this.callState = 'connected';
    }

    async onAnswer({ sdp }) {
        if (this.callState !== 'calling') return;
        await this.pc.setRemoteDescription(
            new RTCSessionDescription(sdp)
        );
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

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.sendSignal({ type: 'call-declined' });
        }

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
        this.iceCandidateQueue = []; // Clear ICE candidate queue
    }


    toggleMute() {
        if (!this.localStream) return;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;

        // flip the track
        audioTrack.enabled = !audioTrack.enabled;

        // update button & icon

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

        // flip the track
        videoTrack.enabled = !videoTrack.enabled;

        // update button & icon

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


    // ─── UI HELPERS (unchanged) ─────────────────────────────────────────────────
    showVideoModal() { document.getElementById('videoModal').style.display = 'block'; }
    hideVideoModal() { document.getElementById('videoModal').style.display = 'none'; }
    showIncomingCallModal() {
        document.getElementById('callerName').textContent = this.otherUserName;
        document.getElementById('incomingCallModal').style.display = 'block';
    }
    hideIncomingCallModal() { document.getElementById('incomingCallModal').style.display = 'none'; }
    // updateConnectionStatus(s) { document.getElementById('connectionStatus').textContent = s; }
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = status;

        statusEl.className = 'connection-status';
        if (status === 'Connected') {
            statusEl.classList.add('connected');
        } else if (status.includes('Connecting') || status.includes('Calling')) {
            statusEl.classList.add('connecting');
        } else {
            statusEl.classList.add('disconnected');
        }
    }
    showStatus(msg) {
        const el = document.getElementById('statusMessage');
        el.textContent = msg;

        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }
}

// Finally: instantiate it once your DOM + CURRENT_USER_ID/OTHER_USER_ID are set
document.addEventListener('DOMContentLoaded', () => {
    window.videoCallManager = new VideoCallManager();
});
