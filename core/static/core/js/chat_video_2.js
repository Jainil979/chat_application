
// // 1) Grab UI elements
// // const chatUI = document.getElementById('chatUI');
// const incomingCallContainer = document.getElementById('incomingCallContainer');
// const videoCallContainer = document.getElementById('videoCallContainer');

// const incomingCallerName = document.getElementById('incomingCallerName');
// const acceptCallBtn = document.getElementById('acceptCallBtn');
// const rejectCallBtn = document.getElementById('rejectCallBtn');

// const hangupBtn = document.getElementById('hangupBtn');

// const muteBtn = document.getElementById('muteBtn');
// const cameraBtn = document.getElementById('cameraBtn');

// const localVideo = document.getElementById('localVideo');
// const remoteVideo = document.getElementById('remoteVideo');
// const videoCallBtn = document.getElementById('videoCallBtn');



// // 2) Helper to get peer from your chat header
// function getPeer() {
//   const hdr = document.getElementById('currentChatName');
//   return hdr ? hdr.innerText : null;
// }



// // 3) UI state toggles
// function showChat() {
//   // chatUI.classList.remove('hidden');
//   incomingCallContainer.classList.add('hidden');
//   videoCallContainer.classList.add('hidden');
// }



// function showRinging(isCaller, callerName) {
//   // chatUI.classList.add('hidden');
//   incomingCallContainer.classList.remove('hidden');
//   videoCallContainer.classList.add('hidden');
//   incomingCallerName.textContent = isCaller
//     ? `Calling ${callerName}…`
//     : `${callerName} is calling you…`;
// }



// function showInCall() {
//   // chatUI.classList.add('hidden');
//   incomingCallContainer.classList.add('hidden');
//   videoCallContainer.classList.remove('hidden');
// }



// // 4) Setup WebSocket for signalling
// const ME = window.CURRENT_USERNAME;

// const Videosocket = new WebSocket(
//   (location.protocol === 'https:' ? 'wss://' : 'ws://')
//   + window.location.host
//   + `/ws/videocall/${ME}/`
// );



// // 5) WebRTC variables
// let pc = null;
// let localStream = null;
// let audioOn = true;
// let videoOn = true;



// // 6) WebSocket message handler
// Videosocket.onmessage = async ({ data }) => {
//   const msg = JSON.parse(data);
//   const peer = msg.from;

//   switch (msg.type) {
//     // -------- Caller: we sent call_request → they ring UI
//     case 'video.call_request':
//       showRinging(false, peer);
//       break;

//     // -------- Callee rejected
//     case 'video.call_reject':
//       alert(`${peer} rejected the call.`);
//       showChat();
//       break;

//     // -------- Callee accepted → start WebRTC as caller
//     case 'video.call_accept':
//       startWebRTC(true, peer);
//       break;

//     // -------- Offer from caller → start WebRTC as callee
//     case 'webrtc.offer':
//       startWebRTC(false, peer);
//       await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       Videosocket.send(JSON.stringify({
//         type: 'webrtc.answer',
//         to: peer,
//         from: ME,
//         sdp: pc.localDescription
//       }));
//       break;

//     // -------- Answer from callee
//     case 'webrtc.answer':
//       await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
//       break;

//     // -------- ICE candidate
//     case 'webrtc.ice':
//       if (msg.candidate && pc) {
//         await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
//       }
//       break;
//   }
// };



// Videosocket.onopen = () => console.log('Signaling socket open');
// Videosocket.onclose = () => console.log('Signaling socket closed');



// // 7) User clicks “Video Call” button (caller)
// videoCallBtn.addEventListener('click', () => {
//   const peer = getPeer();
//   if (!peer) return alert('No contact selected!');
//   Videosocket.send(JSON.stringify({
//     type: 'video.call_request',
//     to: peer,
//     from: ME
//   }));
//   showRinging(true, peer);
// });



// // 8) Accept / Reject handlers
// acceptCallBtn.addEventListener('click', () => {
//   const peer = getPeer();
//   Videosocket.send(JSON.stringify({
//     type: 'video.call_accept',
//     to: peer,
//     from: ME
//   }));
//   // actual WebRTC start is driven by incoming 'video.call_accept'
// });



// rejectCallBtn.addEventListener('click', () => {
//   const peer = getPeer();
//   Videosocket.send(JSON.stringify({
//     type: 'video.call_reject',
//     to: peer,
//     from: ME
//   }));
//   showChat();
// });



// // 9) In‑call controls
// hangupBtn.addEventListener('click', endCall);


// muteBtn.addEventListener('click', () => {
//   if (!localStream) return;
//   audioOn = !audioOn;
//   localStream.getAudioTracks().forEach(t => t.enabled = audioOn);
//   muteBtn.textContent = audioOn ? '🎤' : '🔇';
// });


// cameraBtn.addEventListener('click', () => {
//   if (!localStream) return;
//   videoOn = !videoOn;
//   localStream.getVideoTracks().forEach(t => t.enabled = videoOn);
//   cameraBtn.textContent = videoOn ? '📷' : '🚫';
// });



// // 10) Kick‑off WebRTC (caller if isCaller, callee responds to offer)
// async function startWebRTC(isCaller, peer) {
//   showInCall();

//   // a) get user media once
//   if (!localStream) {
//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true
//       });
//       localVideo.srcObject = localStream;
//     } catch (err) {
//       console.error('getUserMedia error:', err);
//       alert('Could not access camera/microphone.');
//       showChat();
//       return;
//     }
//   }

//   // b) create RTCPeerConnection
//   pc = new RTCPeerConnection({
//     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
//   });
//   // add tracks
//   localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
//   // remote stream handler
//   pc.ontrack = e => { remoteVideo.srcObject = e.streams[0]; };
//   // ICE candidate handler
//   pc.onicecandidate = ({ candidate }) => {
//     if (candidate) {
//       Videosocket.send(JSON.stringify({
//         type: 'webrtc.ice',
//         to: peer,
//         from: ME,
//         candidate
//       }));
//     }
//   };

//   // c) if caller, create & send offer
//   if (isCaller) {
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     Videosocket.send(JSON.stringify({
//       type: 'webrtc.offer',
//       to: peer,
//       from: ME,
//       sdp: pc.localDescription
//     }));
//   }
// }



// // 11) End call & cleanup
// function endCall() {
//   if (pc) {
//     pc.getSenders().forEach(s => s.track && s.track.stop());
//     pc.close();
//     pc = null;
//   }
//   if (localStream) {
//     localStream.getTracks().forEach(t => t.stop());
//     localStream = null;
//   }
//   localVideo.srcObject = remoteVideo.srcObject = null;
//   showChat();
// }



// // Initialize to chat view
// // showChat();













// const our_video = document.getElementById('localVideo');
// const remote_video = document.getElementById('remoteVideo');

// let stream;
// let rtcpeerconnection;










// // UI elements
// const incomingUI = document.getElementById("incomingCallContainer");
// const callUI = document.getElementById("videoCallContainer");
// const incomingName = document.getElementById("incomingCallerName");
// const btnAccept = document.getElementById("acceptCallBtn");
// const btnReject = document.getElementById("rejectCallBtn");
// const btnHangup = document.getElementById("hangupBtn");
// const btnMute = document.getElementById("muteBtn");
// const btnCamera = document.getElementById("cameraBtn");
// const vidLocal = document.getElementById("localVideo");
// const vidRemote = document.getElementById("remoteVideo");
// const btnVideo = document.getElementById("videoCallBtn");

// // Track current peer
// let CURRENT_PEER = null;
// // Whenever a contact is clicked set this:
// // document.querySelectorAll("#contactsList .chat-item").forEach(item => {
// //   item.addEventListener("click", () => {
// //     CURRENT_PEER = item.dataset.name;
// //     console.log(CURRENT_PEER);
// //     // ... your existing code to load messages, avatar, etc.
// //   });
// // });

// function selectPeer(peer) {
//    CURRENT_PEER = peer;
// }


// function getPeer() {
//   return CURRENT_PEER;
// }

// // Overlay toggles (we no longer hide the chat panel itself)
// function showRinging(isCaller, who) {
//   incomingName.textContent = isCaller
//     ? `Calling ${who}…`
//     : `${who} is calling you…`;
//   incomingUI.classList.remove("hidden");
// }
// function showCall() {
//   incomingUI.classList.add("hidden");
//   callUI.classList.remove("hidden");
// }
// function hideOverlays() {
//   incomingUI.classList.add("hidden");
//   callUI.classList.add("hidden");
// }

// // Setup WebSocket
// const ME = window.CURRENT_USERNAME;

// const sock = new WebSocket(
//   (location.protocol === "https:" ? "wss://" : "ws://")
//   + window.location.host + `/ws/videocall/${ME}/`
// );

// let pc, localStream, audioOn = true, videoOn = true;

// sock.onmessage = async ({ data }) => {
//   const msg = JSON.parse(data);
//   const peer = msg.from;

//   switch (msg.type) {
//     case "video.call_request":
//       showRinging(false, peer);
//       break;
//     case "video.call_reject":
//       alert(`${peer} rejected the call.`);
//       hideOverlays();
//       break;
//     case "video.call_accept":
//       startWebRTC(true, peer);
//       break;
//     case "webrtc.offer":
//       startWebRTC(false, peer);
//       await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
//       const ans = await pc.createAnswer();
//       await pc.setLocalDescription(ans);
//       sock.send(JSON.stringify({
//         type: "webrtc.answer", to: peer, from: ME, sdp: pc.localDescription
//       }));
//       break;
//     case "webrtc.answer":
//       await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
//       break;
//     case "webrtc.ice":
//       if (msg.candidate && pc) {
//         await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
//       }
//       break;
//   }
// };

// // Outgoing actions
// btnVideo.onclick = () => {
//   const peer = getPeer();
//   if (!peer) return alert("Select a contact first.");
//   sock.send(JSON.stringify({ type: "video.call_request", to: peer, from: ME }));
//   showRinging(true, peer);
// };
// btnAccept.onclick = () => {
//   const peer = getPeer();
//   sock.send(JSON.stringify({ type: "video.call_accept", to: peer, from: ME }));
// };
// btnReject.onclick = () => {
//   const peer = getPeer();
//   sock.send(JSON.stringify({ type: "video.call_reject", to: peer, from: ME }));
//   hideOverlays();
// };
// btnHangup.onclick = endCall;
// btnMute.onclick = () => {
//   if (!localStream) return;
//   audioOn = !audioOn;
//   localStream.getAudioTracks().forEach(t => t.enabled = audioOn);
//   btnMute.textContent = audioOn ? "🎤" : "🔇";
// };
// btnCamera.onclick = () => {
//   if (!localStream) return;
//   videoOn = !videoOn;
//   localStream.getVideoTracks().forEach(t => t.enabled = videoOn);
//   btnCamera.textContent = videoOn ? "📷" : "🚫";
// };

// // WebRTC setup
// async function startWebRTC(isCaller, peer) {
//   showCall();
//   if (!localStream) {
//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       vidLocal.srcObject = localStream;
//     } catch {
//       alert("Camera/mic access denied.");
//       hideOverlays();
//       return;
//     }
//   }
//   pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
//   localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
//   pc.ontrack = e => vidRemote.srcObject = e.streams[0];
//   pc.onicecandidate = ({ candidate }) => {
//     if (candidate) sock.send(JSON.stringify({
//       type: "webrtc.ice", to: peer, from: ME, candidate
//     }));
//   };
//   if (isCaller) {
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     sock.send(JSON.stringify({
//       type: "webrtc.offer", to: peer, from: ME, sdp: pc.localDescription
//     }));
//   }
// }

// // End call
// function endCall() {
//   if (pc) {
//     pc.getSenders().forEach(s => s.track.stop());
//     pc.close(); pc = null;
//   }
//   if (localStream) {
//     localStream.getTracks().forEach(t => t.stop());
//     localStream = null;
//   }
//   vidLocal.srcObject = vidRemote.srcObject = null;
//   hideOverlays();
// }


