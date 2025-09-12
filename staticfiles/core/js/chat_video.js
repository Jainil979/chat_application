// // chat_video.js

// // DOM elements
// const videoBtn     = document.getElementById('videoCallBtn');
// const hangupBtn    = document.getElementById('hangupBtn');
// const videoContainer = document.getElementById('videoContainer');
// const myVideo      = document.getElementById('myVideo');
// const theirVideo   = document.getElementById('theirVideo');

// // ICE servers (Google STUN)
// const ICE_CONFIG = [{ urls: 'stun:stun.l.google.com:19302' }];

// // state
// let signalingSocket = null;
// let pc              = null;
// let localStream     = null;

// // click handlers
// videoBtn.addEventListener('click', startCall);
// hangupBtn.addEventListener('click', endCall);

// async function startCall() {
//   // 1) open signaling WebSocket
//   signalingSocket = new WebSocket(`ws://${window.location.host}/ws/signaling/${currentChatId}/`);

//   // 2) once socket is open, get media & set up PC
//   signalingSocket.addEventListener('open', async () => {
//     let stream;
//     try {
//       stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     } catch (err) {
//       console.error("📷 getUserMedia failed", err);
//       alert("Cannot start video call: camera/mic permission denied or unavailable.");
//       return;    // stop here
//     }

//     // 2) set up UI & peer‐connection
//     localStream = stream;
//     myVideo.srcObject = localStream;
//     videoContainer.classList.remove('hidden');

//     // build peer connection
//     setupPeerConnection();

//     // add our tracks to PC
//     localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

//     // create & send SDP offer
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     signalingSocket.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
//   });

//   // handle incoming messages
//   signalingSocket.addEventListener('message', async ev => {
//     const msg = JSON.parse(ev.data);

//     if (msg.type === 'offer') {
//       // incoming call: set remote, answer
//       await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       signalingSocket.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
//     }
//     else if (msg.type === 'answer') {
//       // answer to our offer
//       await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
//     }
//     else if (msg.type === 'candidate') {
//       // add ICE candidate
//       await pc.addIceCandidate(msg.candidate);
//     }
//   });
// }

// function setupPeerConnection() {
//   // tear down any old PC
//   if (pc) {
//     pc.close();
//     pc = null;
//   }
//   pc = new RTCPeerConnection({ iceServers: ICE_CONFIG });

//   // when remote track arrives
//   pc.addEventListener('track', ev => {
//     theirVideo.srcObject = ev.streams[0];
//   });

//   // send ICE candidates over signaling
//   pc.addEventListener('icecandidate', ev => {
//     if (ev.candidate && signalingSocket.readyState === WebSocket.OPEN) {
//       signalingSocket.send(JSON.stringify({ type: 'candidate', candidate: ev.candidate }));
//     }
//   });
// }

// function endCall() {
//   // close peer connection
//   if (pc) pc.close();
//   pc = null;

//   // stop our media tracks
//   if (localStream) {
//     localStream.getTracks().forEach(t => t.stop());
//     localStream = null;
//   }

//   // hide UI
//   videoContainer.classList.add('hidden');

//   // close signaling socket
//   if (signalingSocket) {
//     signalingSocket.close();
//     signalingSocket = null;
//   }
// }






















// chat_video.js

// const ICE_CONFIG = [{ urls: 'stun:stun.l.google.com:19302' }];
// let pc, localStream, signalingSocket;

// const videoBtn   = document.getElementById('videoCallBtn');
// const hangupBtn  = document.getElementById('hangupBtn');
// const videoUI    = document.getElementById('videoContainer');
// const myVideo    = document.getElementById('myVideo');
// const theirVideo = document.getElementById('theirVideo');

// videoBtn.addEventListener('click', startCall);
// hangupBtn.addEventListener('click', endCall);

// // 1) shared setup
// async function createPeerConnection() {
//   pc = new RTCPeerConnection({ iceServers: ICE_CONFIG });

//   // send any ICE candidates
//   pc.onicecandidate = e => {
//     if (e.candidate) {
//       signalingSocket.send(JSON.stringify({
//         type: 'candidate',
//         candidate: e.candidate
//       }));
//     }
//   };

//   // when remote track arrives
//   pc.ontrack = e => {
//     theirVideo.srcObject = e.streams[0];
//   };

//   // getMedia if not already
//   if (!localStream) {
//     localStream = await navigator.mediaDevices.getUserMedia({
//       video: true, audio: true
//     }).catch(err => {
//       console.error("Cannot start video call:", err);
//       throw err;
//     });
//     myVideo.srcObject = localStream;
//   }

//   // add your tracks
//   localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
// }

// // 2) start the call (offerer)
// async function startCall() {
//   // open or reuse the socket
//   signalingSocket = new WebSocket(`ws://${window.location.host}/ws/signaling/${currentChatId}/`);

//   signalingSocket.onmessage = handleSignalingMessage;
//   signalingSocket.onopen    = async () => {
//     await createPeerConnection();
//     videoUI.classList.remove('hidden');

//     // make the offer
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     signalingSocket.send(JSON.stringify({
//       type: 'offer',
//       sdp:  offer.sdp
//     }));
//   };
// }

// // 3) common message handler
// async function handleSignalingMessage({ data }) {
//   const msg = JSON.parse(data);

//   switch (msg.type) {
//     case 'offer':
//       // incoming call → answerer
//       await createPeerConnection();
//       await pc.setRemoteDescription(
//         new RTCSessionDescription({ type: 'offer', sdp: msg.sdp })
//       );

//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       signalingSocket.send(JSON.stringify({
//         type: 'answer',
//         sdp:  answer.sdp
//       }));
//       videoUI.classList.remove('hidden');
//       break;

//     case 'answer':
//       // only apply answer if we're waiting for one
//       if (pc && pc.signalingState === 'have-local-offer') {
//         await pc.setRemoteDescription(
//           new RTCSessionDescription({ type: 'answer', sdp: msg.sdp })
//         );
//       } else {
//         console.warn("Received unexpected answer in state:", pc.signalingState);
//       }
//       break;

//     case 'candidate':
//       if (pc) {
//         try {
//           await pc.addIceCandidate(msg.candidate);
//         } catch (e) {
//           console.warn("Error adding ICE candidate:", e);
//         }
//       }
//       break;

//     default:
//       console.warn("Unknown signaling message type:", msg.type);
//   }
// }

// // 4) hang up
// function endCall() {
//   if (pc) {
//     pc.close();
//     pc = null;
//   }
//   if (localStream) {
//     localStream.getTracks().forEach(t => t.stop());
//     localStream = null;
//   }
//   if (signalingSocket) {
//     signalingSocket.close();
//     signalingSocket = null;
//   }
//   videoUI.classList.add('hidden');
// }












// VV : 1

// class VideoCallManager {
//     constructor() {
//         this.socket = null;
//         this.peerConnection = null;
//         this.localStream = null;1
//         this.remoteStream = null;
//         this.isCallActive = false;
//         this.isCaller = false;
//         this.currentUserId = null; // Replace with actual current user ID
//         this.otherUserId = currentChatId; // Replace with actual other user ID
//         this.callState = 'idle'; // idle, calling, ringing, connected

//         this.setupEventListeners();
//         this.setupPeerConnectionConfig();
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

//             // Create socket connection
//             await this.createSocketConnection();

//             // Get user media
//             await this.getUserMedia();

//             // Create peer connection
//             this.createPeerConnection();

//             // Create and send offer
//             const offer = await this.peerConnection.createOffer({
//                 offerToReceiveAudio: true,
//                 offerToReceiveVideo: true
//             });

//             await this.peerConnection.setLocalDescription(offer);

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
//             const wsUrl = `ws://${window.location.host}/ws/signaling/${currentChatId}/`;
//             this.socket = new WebSocket(wsUrl);

//             this.socket.onopen = () => {
//                 console.log('WebSocket connected');
//                 resolve();
//             };

//             this.socket.onerror = (error) => {
//                 console.error('WebSocket error:', error);
//                 reject(new Error('WebSocket connection failed'));
//             };

//             this.socket.onmessage = (event) => {
//                 this.handleSignalingMessage(JSON.parse(event.data));
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

//             this.callState = 'connected';
//             this.updateConnectionStatus('Connecting...');

//         } catch (error) {
//             console.error('Error handling answer:', error);
//             this.showStatus('Call connection failed');
//             this.endCall();
//         }
//     }

//     async handleIceCandidate(message) {
//         if (this.peerConnection && message.candidate) {
//             try {
//                 await this.peerConnection.addIceCandidate(
//                     new RTCIceCandidate(message.candidate)
//                 );
//             } catch (error) {
//                 console.error('Error adding ICE candidate:', error);
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
//             this.socket.send(JSON.stringify(message));
//         }
//     }

//     showVideoModal() {
//         document.getElementById('videoModal').style.display = 'block';
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

// // Initialize video call manager when page loads
// document.addEventListener('DOMContentLoaded', () => {
//     window.videoCallManager = new VideoCallManager();
// });















// VV : 2

class VideoCallManager {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCallActive = false;
        this.isCaller = false;
        this.currentUserId = window.CURRENT_USER_ID; // Replace with actual current user ID
        this.otherUserId = window.OTHER_USER_ID; // Replace with actual other user ID
        this.callState = 'idle'; // idle, calling, ringing, connected
        this.iceCandidateQueue = []; // Queue for ICE candidates

        console.log(this.currentUserId , this.otherUserId);

        this.setupEventListeners();
        this.setupPeerConnectionConfig();
    }

    setupPeerConnectionConfig() {
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    setupEventListeners() {
        // Video call button
        document.getElementById('videoCallBtn').addEventListener('click', () => {
            this.initiateCall();
        });

        // Call controls
        document.getElementById('endCallBtn').addEventListener('click', () => {
            this.endCall();
        });

        document.getElementById('muteBtn').addEventListener('click', () => {
            this.toggleMute();
        });

        document.getElementById('videoToggleBtn').addEventListener('click', () => {
            this.toggleVideo();
        });

        // Incoming call controls
        document.getElementById('acceptCallBtn').addEventListener('click', () => {
            this.acceptCall();
        });

        document.getElementById('declineCallBtn').addEventListener('click', () => {
            this.declineCall();
        });
    }

    async initiateCall() {
        if (this.isCallActive || this.callState !== 'idle') {
            this.showStatus('Call already in progress');
            return;
        }

        try {
            this.callState = 'calling';
            this.isCaller = true;

            // Create socket connection
            await this.createSocketConnection();

            // Get user media
            await this.getUserMedia();

            // Create peer connection
            this.createPeerConnection();

            // Create and send offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await this.peerConnection.setLocalDescription(offer);

            // Send offer through WebSocket
            this.sendSignal({
                type: 'offer',
                sdp: offer
            });

            this.showVideoModal();
            this.updateConnectionStatus('Calling...');

        } catch (error) {
            console.error('Error initiating call:', error);
            this.showStatus('Failed to start call: ' + error.message);
            this.resetCall();
        }
    }

    async createSocketConnection() {
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://${window.location.host}/ws/signaling/${currentChatId}/`;
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                resolve();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(new Error('WebSocket connection failed'));
            };

            this.socket.onmessage = (event) => {
                this.handleSignalingMessage(JSON.parse(event.data));
            };

            this.socket.onclose = () => {
                console.log('WebSocket closed');
                if (this.isCallActive) {
                    this.showStatus('Connection lost');
                    this.endCall();
                }
            };
        });
    }

    async getUserMedia() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            document.getElementById('localVideo').srcObject = this.localStream;

        } catch (error) {
            console.error('Error getting user media:', error);
            throw new Error('Camera/microphone access denied');
        }
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.pcConfig);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream');
            this.remoteStream = event.streams[0];
            document.getElementById('remoteVideo').srcObject = this.remoteStream;
            this.updateConnectionStatus('Connected');
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);

            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.isCallActive = true;
                    this.callState = 'connected';
                    this.updateConnectionStatus('Connected');
                    break;
                case 'disconnected':
                case 'failed':
                case 'closed':
                    this.endCall();
                    break;
            }
        };
    }

    async handleSignalingMessage(message) {
        console.log('Received signaling message:', message.type);

        try {
            switch (message.type) {
                case 'offer':
                    await this.handleOffer(message);
                    break;
                case 'answer':
                    await this.handleAnswer(message);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(message);
                    break;
                case 'call-declined':
                    this.handleCallDeclined();
                    break;
                case 'call-ended':
                    this.endCall();
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    async handleOffer(message) {
        // Only handle offer if we're not already in a call
        if (this.callState !== 'idle') {
            console.log('Ignoring offer, already in call state:', this.callState);
            return;
        }

        this.callState = 'ringing';
        this.isCaller = false;

        // Show incoming call modal
        this.showIncomingCallModal();

        // Store the offer for later use
        this.pendingOffer = message;
    }

    async acceptCall() {
        try {
            this.hideIncomingCallModal();

            // Get user media
            await this.getUserMedia();

            // Create peer connection
            this.createPeerConnection();

            // Set remote description (the offer)
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(this.pendingOffer.sdp)
            );

            // Process any queued ICE candidates now that remote description is set
            await this.processQueuedIceCandidates();

            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Create socket connection if not exists
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                await this.createSocketConnection();
            }

            this.sendSignal({
                type: 'answer',
                sdp: answer
            });

            this.showVideoModal();
            this.updateConnectionStatus('Connecting...');
            this.callState = 'connected';

        } catch (error) {
            console.error('Error accepting call:', error);
            this.showStatus('Failed to accept call: ' + error.message);
            this.resetCall();
        }
    }

    async handleAnswer(message) {
        if (this.callState !== 'calling' || !this.peerConnection) {
            console.log('Received unexpected answer in state:', this.callState);
            return;
        }

        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
            );

            // Process any queued ICE candidates now that remote description is set
            await this.processQueuedIceCandidates();

            this.callState = 'connected';
            this.updateConnectionStatus('Connecting...');

        } catch (error) {
            console.error('Error handling answer:', error);
            this.showStatus('Call connection failed');
            this.endCall();
        }
    }

    async handleIceCandidate(message) {
        if (!this.peerConnection || !message.candidate) {
            return;
        }

        // If remote description is not set, queue the candidate
        if (!this.peerConnection.remoteDescription) {
            console.log('Queueing ICE candidate - remote description not set yet');
            this.iceCandidateQueue.push(message.candidate);
            return;
        }

        try {
            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(message.candidate)
            );
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    async processQueuedIceCandidates() {
        while (this.iceCandidateQueue.length > 0) {
            const candidate = this.iceCandidateQueue.shift();
            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
                console.log('Processed queued ICE candidate');
            } catch (error) {
                console.error('Error processing queued ICE candidate:', error);
            }
        }
    }

    declineCall() {
        this.hideIncomingCallModal();

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.sendSignal({ type: 'call-declined' });
        }

        this.resetCall();
    }

    handleCallDeclined() {
        this.showStatus('Call declined');
        this.hideVideoModal();
        this.resetCall();
    }

    endCall() {
        // Send end call signal
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.sendSignal({ type: 'call-ended' });
        }

        this.hideVideoModal();
        this.hideIncomingCallModal();
        this.resetCall();
    }

    resetCall() {
        // Clean up peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close socket
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        // Reset state
        this.isCallActive = false;
        this.isCaller = false;
        this.callState = 'idle';
        this.remoteStream = null;
        this.pendingOffer = null;
        this.iceCandidateQueue = []; // Clear ICE candidate queue
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
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
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
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
        }
    }

    sendSignal(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    showVideoModal() {
        document.getElementById('videoModal').style.display = 'block';
    }

    hideVideoModal() {
        document.getElementById('videoModal').style.display = 'none';
    }

    showIncomingCallModal() {
        document.getElementById('callerName').textContent = document.getElementById('currentChatName').textContent;
        document.getElementById('incomingCallModal').style.display = 'block';
    }

    hideIncomingCallModal() {
        document.getElementById('incomingCallModal').style.display = 'none';
    }

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

    showStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.style.display = 'block';

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

// Initialize video call manager when page loads
// document.addEventListener('DOMContentLoaded', () => {
//     window.videoCallManager = new VideoCallManager();
// });