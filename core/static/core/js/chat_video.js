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

//         console.log(this.currentUserId , this.otherUserId);

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
//             const wsUrl = `wss://${window.location.host}/ws/signaling/${currentChatId}/`;
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

// Initialize video call manager when page loads
// document.addEventListener('DOMContentLoaded', () => {
//     window.videoCallManager = new VideoCallManager();
// });








class VideoCallManager {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCallActive = false;
        this.isCaller = false;
        this.currentUserId = window.CURRENT_USER_ID; // Replace with actual current user ID
        this.otherUserId = window.OTHER_USER_ID;
        this.callState = 'idle'; // idle, calling, ringing, connected
        this.iceCandidateQueue = []; // Queue for ICE candidates

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
            // await this.createSocketConnection();

            // Get user media
            await this.getUserMedia();

            console.log('Local tracks:', this.localStream.getVideoTracks());


            // Create peer connection
            this.createPeerConnection();

            // Create and send offer
            // const offer = await this.peerConnection.createOffer({
            //     offerToReceiveAudio: true,
            //     offerToReceiveVideo: true
            // });

            // await this.peerConnection.setLocalDescription(offer);

            // // Send offer through WebSocket
            // this.sendSignal({
            //     type: 'offer',
            //     sdp: offer
            // });

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
            const host = window.location.hostname;
            const port = window.location.protocol === 'https:' ? '8443' : '8000';
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${host}:${port}/ws/signaling/${this.otherUserId}/`;
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
                const message = JSON.parse(event.data);

                // Ignore messages from ourselves
                if (message.sender_id && message.sender_id === this.currentUserId) {
                    return;
                }

                this.handleSignalingMessage(message);
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
        // if (this.localStream) {
        //     this.localStream.getTracks().forEach(track => {
        //         this.peerConnection.addTrack(track, this.localStream);
        //     });
        // }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream');
            this.remoteStream = event.streams[0];
            console.log('got remote stream', event.streams[0]);
            document.getElementById('remoteVideo').srcObject = this.remoteStream;
            document.getElementById('remoteVideo').onloadedmetadata = () => {
                // Many browsers require an explicit play() call
                document.getElementById('remoteVideo').play().catch(err => {
                    console.warn('remoteVideoEl.play() failed:', err);
                });
            };
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


        this.peerConnection.onnegotiationneeded = async () => {
            try {
                console.log('🛠️ negotiationneeded fired – creating + sending offer');
                // await this.peerConnection.setLocalDescription(
                //     await this.peerConnection.createOffer({
                //         offerToReceiveAudio: true,
                //         offerToReceiveVideo: true
                //     })
                // );
                const offer = await this.peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });

                await this.peerConnection.setLocalDescription(offer);

                this.sendSignal({
                    type: 'offer',
                    sdp: this.peerConnection.localDescription
                });
            } catch (err) {
                console.error('❌ negotiation failed:', err);
            }
        };

        // ② only add tracks *after* wiring up negotiationneeded
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
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
            // console.log(this.localStream.getVideoTracks())


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
                sdp: this.peerConnection.localDescription
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
            // Add sender_id to identify who sent the message
            message.sender_id = this.currentUserId;
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


























// Google gemini Saved Version


// --- DOM Elements ---
// const videoCallBtn = document.getElementById('videoCallBtn');
// const videoModal = document.getElementById('videoModal');
// const incomingCallModal = document.getElementById('incomingCallModal');
// const acceptCallBtn = document.getElementById('acceptCallBtn');
// const declineCallBtn = document.getElementById('declineCallBtn');
// const endCallBtn = document.getElementById('endCallBtn');
// const muteBtn = document.getElementById('muteBtn');
// const videoToggleBtn = document.getElementById('videoToggleBtn');
// const localVideo = document.getElementById('localVideo');
// const remoteVideo = document.getElementById('remoteVideo');
// const callerNameEl = document.getElementById('callerName');
// const connectionStatusEl = document.getElementById('connectionStatus');
// const statusMessageEl = document.getElementById('statusMessage');

// // --- State Variables ---
// let localStream;
// let remoteStream;
// let peerConnection;
// let signalingSocket;
// let otherUserId = null; // This should be set when a chat is opened
// let isCallInitiator = false;

// // --- WebRTC Configuration ---
// // Using a public STUN server for NAT traversal.
// // For production, you might want to deploy your own TURN server.
// const configuration = {
//     iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun1.l.google.com:19302' }
//     ]
// };

// // --- Helper Functions ---
// const showStatusMessage = (message) => {
//     statusMessageEl.textContent = message;
//     statusMessageEl.classList.add('show');
//     setTimeout(() => {
//         statusMessageEl.classList.remove('show');
//     }, 3000);
// };

// const resetCallState = () => {
//     console.log("Resetting call state.");
//     if (localStream) {
//         localStream.getTracks().forEach(track => track.stop());
//         localStream = null;
//     }
//     if (peerConnection) {
//         peerConnection.close();
//         peerConnection = null;
//     }
//     if (signalingSocket) {
//         signalingSocket.close();
//         signalingSocket = null;
//     }
//     videoModal.style.display = 'none';
//     incomingCallModal.style.display = 'none';
//     localVideo.srcObject = null;
//     remoteVideo.srcObject = null;
//     isCallInitiator = false;
//     otherUserId = null; // Reset until a new chat is selected
// };

// const setupSignalingSocket = (targetUserId) => {
//     // This assumes you have a way to get the current user's ID
//     // and the ID of the user they are chatting with.
//     // For demonstration, let's assume `otherUserId` is set.
//     if (!targetUserId) {
//         console.error("Target user ID is not set.");
//         return;
//     }

//     // Construct the WebSocket URL. Replace with your actual domain.
//     const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
//     const wsURL = `${wsScheme}://${window.location.host}/ws/signaling/${targetUserId}/`;

//     console.log(`Connecting to signaling server: ${wsURL}`);
//     signalingSocket = new WebSocket(wsURL);

//     signalingSocket.onopen = () => {
//         console.log('Signaling socket connected.');
//     };

//     signalingSocket.onmessage = async (e) => {
//         const data = JSON.parse(e.data);
//         console.log('Signaling message received:', data);

//         switch (data.type) {
//             case 'call-offer':
//                 // This is an incoming call offer
//                 callerNameEl.textContent = `User ${data.from_user_id}`; // You can fetch the actual name
//                 otherUserId = data.from_user_id; // Set the other user for the duration of the call
//                 incomingCallModal.style.display = 'flex';
//                 // Store the offer to be used if the call is accepted
//                 peerConnection = createPeerConnection();
//                 await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
//                 break;
//             case 'call-answer':
//                 // The other user accepted our call
//                 connectionStatusEl.textContent = 'Connected';
//                 await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
//                 break;
//             case 'ice-candidate':
//                 // Add ICE candidate from the other peer
//                 if (peerConnection && data.candidate) {
//                     try {
//                         await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
//                     } catch (error) {
//                         console.error('Error adding received ice candidate', error);
//                     }
//                 }
//                 break;
//             case 'call-rejected':
//                 showStatusMessage('Call rejected.');
//                 resetCallState();
//                 break;
//             case 'call-ended':
//                 showStatusMessage('Call ended by the other user.');
//                 resetCallState();
//                 break;
//         }
//     };

//     signalingSocket.onclose = () => {
//         console.log('Signaling socket closed.');
//     };

//     signalingSocket.onerror = (error) => {
//         console.error('Signaling socket error:', error);
//     };
// };

// const createPeerConnection = () => {
//     const pc = new RTCPeerConnection(configuration);

//     pc.onicecandidate = (event) => {
//         if (event.candidate && signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
//             console.log('Sending ICE candidate:', event.candidate);
//             signalingSocket.send(JSON.stringify({
//                 type: 'ice-candidate',
//                 candidate: event.candidate,
//             }));
//         }
//     };

//     pc.ontrack = (event) => {
//         console.log('Remote track received:', event.streams[0]);
//         remoteVideo.srcObject = event.streams[0];
//         remoteStream = event.streams[0];
//     };

//     pc.onconnectionstatechange = () => {
//         console.log(`Connection state change: ${pc.connectionState}`);
//         if (pc.connectionState === 'connected') {
//             connectionStatusEl.textContent = 'Connected';
//         } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
//             showStatusMessage('Connection lost.');
//             resetCallState();
//         } else {
//             connectionStatusEl.textContent = pc.connectionState.charAt(0).toUpperCase() + pc.connectionState.slice(1) + '...';
//         }
//     };

//     // Add local stream tracks to the peer connection
//     if (localStream) {
//         localStream.getTracks().forEach(track => {
//             pc.addTrack(track, localStream);
//         });
//     }

//     return pc;
// };

// const startCall = async () => {
//     isCallInitiator = true;

//     // 1. Get local media
//     try {
//         localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         localVideo.srcObject = localStream;
//     } catch (error) {
//         console.error('Error accessing media devices.', error);
//         alert('Could not access your camera and microphone. Please check permissions.');
//         resetCallState();
//         return;
//     }

//     // 2. Show the video modal
//     videoModal.style.display = 'flex';
//     connectionStatusEl.textContent = 'Calling...';

//     // 3. Create peer connection
//     peerConnection = createPeerConnection();

//     // 4. Create and send offer
//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);

//     console.log('Sending call offer.');
//     signalingSocket.send(JSON.stringify({
//         type: 'call-offer',
//         offer: offer,
//     }));
// };

// // --- Event Listeners ---

// // This is a placeholder. You should call this when a user chat is opened.
// // For example, when you click on a user in your contact list.
// function setupForChatWithUser(userId) {
//     otherUserId = userId;
//     console.log("signal socket setup");
//     // Establish a signaling connection as soon as a chat is active
//     setupSignalingSocket(otherUserId);
// }

// // --- SIMULATION: Call this when a chat is selected ---
// // Replace `2` with the actual ID of the other user from your application logic.
// // This needs to be called *before* the video call button is clicked.
// // For a real app, you'd call this whenever the user switches to a different chat.
// // setTimeout(() => {
// //     // Let's pretend the user opened a chat with user ID 2
// //     const targetUserId = 2; // <<< IMPORTANT: SET THIS DYNAMICALLY
// //     console.log(`Setting up chat with user ${targetUserId}`);
// //     setupForChatWithUser(targetUserId);
// // }, 1000); // Simulate a delay for page load


// videoCallBtn.addEventListener('click', () => {
//     if (!otherUserId) {
//         alert("Please select a chat to start a call.");
//         return;
//     }
//     if (!signalingSocket || signalingSocket.readyState !== WebSocket.OPEN) {
//         alert("Not connected to the signaling server. Please wait.");
//         // Optionally, try to reconnect
//         setupSignalingSocket(otherUserId);
//         return;
//     }
//     startCall();
// });

// acceptCallBtn.addEventListener('click', async () => {
//     incomingCallModal.style.display = 'none';

//     // 1. Get local media
//     try {
//         localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         localVideo.srcObject = localStream;
//     } catch (error) {
//         console.error('Error accessing media devices.', error);
//         alert('Could not access your camera and microphone.');
//         resetCallState();
//         return;
//     }

//     // 2. Show video modal
//     videoModal.style.display = 'flex';

//     // 3. Add local stream to the existing peer connection
//     localStream.getTracks().forEach(track => {
//         peerConnection.addTrack(track, localStream);
//     });

//     // 4. Create and send answer
//     const answer = await peerConnection.createAnswer();
//     await peerConnection.setLocalDescription(answer);

//     console.log('Sending call answer.');
//     signalingSocket.send(JSON.stringify({
//         type: 'call-answer',
//         answer: answer,
//     }));
// });

// declineCallBtn.addEventListener('click', () => {
//     console.log('Call declined.');
//     signalingSocket.send(JSON.stringify({ type: 'call-rejected' }));
//     resetCallState();
// });

// endCallBtn.addEventListener('click', () => {
//     console.log('Ending call.');
//     if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
//         signalingSocket.send(JSON.stringify({ type: 'call-ended' }));
//     }
//     resetCallState();
// });

// muteBtn.addEventListener('click', () => {
//     if (!localStream) return;
//     const audioTrack = localStream.getAudioTracks()[0];
//     if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         muteBtn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
//         muteBtn.classList.toggle('muted', !audioTrack.enabled);
//     }
// });

// videoToggleBtn.addEventListener('click', () => {
//     if (!localStream) return;
//     const videoTrack = localStream.getVideoTracks()[0];
//     if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         videoToggleBtn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
//     }
// });


















// --- DOM Elements ---
const videoCallBtn = document.getElementById('videoCallBtn');
const videoModal = document.getElementById('videoModal');
const incomingCallModal = document.getElementById('incomingCallModal');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const declineCallBtn = document.getElementById('declineCallBtn');
const endCallBtn = document.getElementById('endCallBtn');
const muteBtn = document.getElementById('muteBtn');
const videoToggleBtn = document.getElementById('videoToggleBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callerNameEl = document.getElementById('callerName');
const connectionStatusEl = document.getElementById('connectionStatus');
const statusMessageEl = document.getElementById('statusMessage');

// --- State Variables ---
let localStream;
let peerConnection;
let signalingSocket;
let otherUserId = null; // This should be set when a chat is opened

// --- WebRTC Configuration ---
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// --- Helper Functions ---
const showStatusMessage = (message) => {
    statusMessageEl.textContent = message;
    statusMessageEl.classList.add('show');
    setTimeout(() => {
        statusMessageEl.classList.remove('show');
    }, 3000);
};

const resetCallState = () => {
    console.log("Resetting call state.");
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        peerConnection = null;
    }
    // Don't close the signaling socket here, it should be managed per-chat session
    // if (signalingSocket) {
    //     signalingSocket.close();
    //     signalingSocket = null;
    // }
    videoModal.style.display = 'none';
    incomingCallModal.style.display = 'none';
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
};

const setupSignalingSocket = (targetUserId) => {
    if (!targetUserId) {
        console.error("Target user ID is not set.");
        return;
    }

    // If a socket already exists for this user, don't create a new one.
    if (signalingSocket && signalingSocket.url.includes(`/${targetUserId}/`)) {
        console.log("Signaling socket for this user already exists.");
        return;
    }

    // If a socket exists for a *different* user, close it first.
    if (signalingSocket) {
        signalingSocket.close();
    }

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsURL = `${wsScheme}://${window.location.host}/ws/signaling/${targetUserId}/`;

    console.log(`Connecting to signaling server: ${wsURL}`);
    signalingSocket = new WebSocket(wsURL);

    signalingSocket.onopen = () => {
        console.log('Signaling socket connected.');
    };

    signalingSocket.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        console.log('Signaling message received:', data);

        switch (data.type) {
            case 'call-offer':
                // An incoming call is being offered.
                callerNameEl.textContent = `User ${data.from_user_id}`;
                otherUserId = data.from_user_id;
                incomingCallModal.style.display = 'flex';

                // Create peer connection and set remote description *before* user accepts.
                // This prepares the connection to receive ICE candidates early.
                peerConnection = createPeerConnection();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                break;

            case 'call-answer':
                // The other user accepted our call.
                connectionStatusEl.textContent = 'Connected';
                // Set the remote description received from the callee.
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
                break;

            case 'ice-candidate':
                // Add ICE candidate from the other peer.
                if (peerConnection && data.candidate) {
                    try {
                        // Add candidate immediately. WebRTC handles queuing if the remote description isn't set yet.
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (error) {
                        console.error('Error adding received ice candidate', error);
                    }
                }
                break;

            case 'call-rejected':
                showStatusMessage('Call rejected.');
                resetCallState();
                break;

            case 'call-ended':
                showStatusMessage('Call ended by the other user.');
                resetCallState();
                break;
        }
    };

    signalingSocket.onclose = () => {
        console.log('Signaling socket closed.');
    };

    signalingSocket.onerror = (error) => {
        console.error('Signaling socket error:', error);
    };
};

const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
        if (event.candidate && signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            console.log('Sending ICE candidate:', event.candidate);
            signalingSocket.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate,
            }));
        }
    };

    // **THE CRITICAL FIX IS HERE**
    // This event is triggered when a remote track is added.
    pc.ontrack = (event) => {
        console.log('Remote track received:', event.streams[0]);
        // Make sure to assign the stream to the srcObject of the remote video element.
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            console.log('Assigned remote stream to video element.');
        }
    };

    pc.onconnectionstatechange = () => {
        console.log(`Connection state change: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            connectionStatusEl.textContent = 'Connected';
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            showStatusMessage('Connection lost.');
            resetCallState();
        } else {
            connectionStatusEl.textContent = pc.connectionState.charAt(0).toUpperCase() + pc.connectionState.slice(1) + '...';
        }
    };

    return pc;
};

const startCall = async () => {
    // 1. Get local media
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream; // Display local video immediately
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('Could not access your camera and microphone. Please check permissions.');
        return; // Stop if we can't get media
    }

    // 2. Show the video modal
    videoModal.style.display = 'flex';
    connectionStatusEl.textContent = 'Calling...';

    // 3. Create peer connection
    peerConnection = createPeerConnection();

    // 4. Add local stream tracks to the peer connection *before* creating offer
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // 5. Create and send offer
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log('Sending call offer.');
        signalingSocket.send(JSON.stringify({
            type: 'call-offer',
            offer: offer,
        }));
    } catch (error) {
        console.error("Error creating offer:", error);
        resetCallState();
    }
};

// --- Event Listeners ---

// This function should be called by your application's logic
// whenever the user selects a different chat.
setupForChatWithUser = (userId) => {
    // If we are in a call, end it before switching chat context
    if (peerConnection) {
        endCallBtn.click();
    }
    resetCallState(); // Clean up previous state
    otherUserId = userId;
    // Establish or re-use a signaling connection for the new user
    setupSignalingSocket(otherUserId);
}

// --- SIMULATION: Replace this with your actual application logic ---
// setTimeout(() => {
//     const targetUserId = 2; // <<< IMPORTANT: SET THIS DYNAMICALLY
//     console.log(`Setting up chat with user ${targetUserId}`);
//     // In your real app, you would call window.setupForChatWithUser(userId)
//     // when the user clicks on a contact.
//     window.setupForChatWithUser(targetUserId);
// }, 1000);


videoCallBtn.addEventListener('click', () => {
    if (!otherUserId) {
        alert("Please select a chat to start a call.");
        return;
    }
    if (!signalingSocket || signalingSocket.readyState !== WebSocket.OPEN) {
        alert("Not connected to the signaling server. Please wait or try selecting the chat again.");
        if (!signalingSocket || signalingSocket.readyState === WebSocket.CLOSED) {
            setupSignalingSocket(otherUserId);
        }
        return;
    }
    startCall();
});

acceptCallBtn.addEventListener('click', async () => {
    incomingCallModal.style.display = 'none';

    // 1. Get local media
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream; // Display local video immediately
    } catch (error) {
        console.error('Error accessing media devices.', error);
        alert('Could not access your camera and microphone.');
        resetCallState();
        return;
    }

    // 2. Show video modal
    videoModal.style.display = 'flex';

    // 3. Add local stream to the existing peer connection
    // The peerConnection was already created when the offer was received.
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // 4. Create and send answer
    try {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log('Sending call answer.');
        signalingSocket.send(JSON.stringify({
            type: 'call-answer',
            answer: answer,
        }));
    } catch (error) {
        console.error("Error creating answer:", error);
        resetCallState();
    }
});

declineCallBtn.addEventListener('click', () => {
    console.log('Call declined.');
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify({ type: 'call-rejected' }));
    }
    resetCallState();
});

endCallBtn.addEventListener('click', () => {
    console.log('Ending call.');
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify({ type: 'call-ended' }));
    }
    resetCallState();
});

muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        muteBtn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
        muteBtn.classList.toggle('muted', !audioTrack.enabled);
    }
});

videoToggleBtn.addEventListener('click', () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        videoToggleBtn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    }
});

