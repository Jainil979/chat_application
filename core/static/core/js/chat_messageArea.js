const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messagesContainer");
const typingIndicator = document.getElementById("typingIndicator");
let currentChatName = document.getElementById("currentChatName");
let currentChatStatus = document.getElementById("currentChatStatus");
let currentChatAvatar = document.getElementById("currentChatAvatar");
const emptyState = document.getElementById("emptyState");
const mainChatArea = document.getElementById("mainChatArea");


// 1) Grab the buttons
const recordBtn = document.getElementById('recordBtn');
const recordIcon = document.getElementById('recordIcon');

// let mediaRecorder, audioChunks = [];





let typingTimeout;

// keep track of who’s open
let currentChatId = null;
let socket = null;
let keyBytes = null;
const NONCEBYTES = sodium.crypto_secretbox_NONCEBYTES;


// grab your containers
const container = document.getElementById('contactsList');
// const headerAvatar = document.getElementById('currentChatAvatar');
// const headerName = document.getElementById('currentChatName');























// Audio Recording Interface Implementation
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.timerInterval = null;
    this.stream = null;

    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.recordBtn = document.getElementById('recordBtn');
    this.recordIcon = document.getElementById('recordIcon');
    this.sendBtn = document.getElementById('sendBtn');
    this.messageInput = document.getElementById('messageInput');
    this.attachmentBtn = document.getElementById('attachmentBtn');
    this.emojiBtn = document.getElementById('emojiBtn');
  }

  setupEventListeners() {
    this.recordBtn.addEventListener('click', () => this.toggleRecording());

    // Handle long press for mobile devices
    let pressTimer = null;
    this.recordBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      pressTimer = setTimeout(() => this.startRecording(), 200);
    });

    this.recordBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (pressTimer) {
        clearTimeout(pressTimer);
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      }
    });
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.sendAudioRecording();
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.updateUI();
      this.startTimer();

    } catch (error) {
      console.error('Error starting recording:', error);
      this.showError('Microphone access denied or not available');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      this.stopTimer();
      this.updateUI();
    }
  }

  async sendAudioRecording() {
    if (this.audioChunks && this.audioChunks.length) {
      try {
        // build the blob
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const form = new FormData();
        form.append('file', blob, 'voice.webm');

        // upload to your existing attachment endpoint
        const resp = await fetch(`/chat/api/rooms/${currentChatId}/upload/`, {
          method: 'POST',
          credentials: 'same-origin',
          body: form
        });
        if (!resp.ok) throw new Error('Audio upload failed');
        const { url, timestamp } = await resp.json();

        // broadcast via WebSocket
        socket.send(JSON.stringify({
          text: "",               // no plaintext
          attachment_url: url,
          time : timestamp
        }));

        // clear your audio buffer & UI
        this.audioChunks = [];
      } catch (err) {
        console.error("Voice message failed:", err);
      }

      return;
    }
  }

  startTimer() {
    const timerElement = this.getOrCreateTimerElement();
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.removeTimerElement();
  }

  getRecordingDuration() {
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  updateUI() {
    if (this.isRecording) {
      // Recording state
      this.recordBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-100');
      this.recordBtn.classList.add('text-red-500', 'bg-red-50', 'hover:bg-red-100', 'recording-pulse');
      this.recordIcon.className = 'fas fa-stop';

      // Disable send button and other controls
      this.sendBtn.disabled = true;
      this.sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
      this.messageInput.disabled = true;
      this.messageInput.classList.add('opacity-50');
      this.attachmentBtn.disabled = true;
      this.attachmentBtn.classList.add('opacity-50');
      this.emojiBtn.disabled = true;
      this.emojiBtn.classList.add('opacity-50');

      // Show recording indicator
      this.showRecordingIndicator();

    } else {
      // Normal state
      this.recordBtn.classList.remove('text-red-500', 'bg-red-50', 'hover:bg-red-100', 'recording-pulse');
      this.recordBtn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-100');
      this.recordIcon.className = 'fas fa-microphone';

      // Enable send button and other controls
      this.sendBtn.disabled = false;
      this.sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      this.messageInput.disabled = false;
      this.messageInput.classList.remove('opacity-50');
      this.attachmentBtn.disabled = false;
      this.attachmentBtn.classList.remove('opacity-50');
      this.emojiBtn.disabled = false;
      this.emojiBtn.classList.remove('opacity-50');

      // Hide recording indicator
      this.hideRecordingIndicator();
    }
  }

  showRecordingIndicator() {
    // Create recording indicator overlay
    const indicator = document.createElement('div');
    indicator.id = 'recordingIndicator';
    indicator.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center space-x-2 animate-pulse';
    indicator.innerHTML = `
      <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
      <span class="text-sm font-medium">Recording...</span>
      <span id="recordingTimer" class="text-sm font-mono">0:00</span>
    `;
    document.body.appendChild(indicator);
  }

  hideRecordingIndicator() {
    const indicator = document.getElementById('recordingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }

  getOrCreateTimerElement() {
    let timer = document.getElementById('recordingTimer');
    if (!timer) {
      // If no timer in indicator, create one in the input area
      timer = document.createElement('span');
      timer.id = 'recordingTimer';
      timer.className = 'text-sm font-mono text-red-500 ml-2';
      this.recordBtn.parentNode.appendChild(timer);
    }
    return timer;
  }

  removeTimerElement() {
    const timer = document.getElementById('recordingTimer');
    if (timer && timer.parentNode !== document.getElementById('recordingIndicator')) {
      timer.remove();
    }
  }

  showError(message) {
    // Create error notification
    const error = document.createElement('div');
    error.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    error.textContent = message;
    document.body.appendChild(error);

    setTimeout(() => {
      error.remove();
    }, 3000);
  }
}

// CSS Styles (add to your stylesheet)
const recordingStyles = `
<style>
  .recording-pulse {
    animation: recording-pulse 1s infinite;
  }
  
  @keyframes recording-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }
  }
  
  @media (max-width: 768px) {
    #recordingIndicator {
      top: 2rem;
      left: 1rem;
      right: 1rem;
      transform: none;
      width: auto;
    }
  }
  
  @media (max-width: 480px) {
    .message-input-container {
      padding: 0.5rem;
    }
    
    #recordingIndicator {
      top: 1rem;
      font-size: 0.875rem;
    }
  }
  
  /* Smooth transitions for all state changes */
  #recordBtn, #sendBtn, #messageInput, #attachmentBtn, #emojiBtn {
    transition: all 0.3s ease;
  }
  
  /* Disabled state styling */
  button:disabled {
    pointer-events: none;
  }
  
  input:disabled {
    background-color: #f9fafb;
  }
</style>
`;























// Empty state and Main chat area toggle
function toggleChatArea(show) {
  if (show) {
    emptyState.classList.add("hidden");
    mainChatArea.classList.remove("hidden");
  } else {
    emptyState.classList.remove("hidden");
    mainChatArea.classList.add("hidden");
    // remove any active highlight
    document.querySelectorAll(".chat-item").forEach(item => {
      item.classList.remove(
        "active", "bg-gradient-to-r", "from-indigo-50", "to-purple-50", "border", "border-indigo-100"
      );
    });
  }
}


// INITIAL STATE: show empty-state only
toggleChatArea(false);



// Upload attachment
async function uploadAttachment(roomId, file) {

  const form = new FormData();
  form.append('file', file);

  console.log(form);

  const resp = await fetch(`/chat/api/rooms/${roomId}/upload/`, {
    method: 'POST',
    credentials: 'same-origin',
    body: form
  });


  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.detail || 'Upload failed');
  }
  return resp.json();  // { message_id, url, timestamp }
}




// Send attachment
async function sendAttachment(roomId, file) {
  try {
    // 1) upload to HTTP endpoint
    const { url, timestamp } = await uploadAttachment(roomId, file);

    // 2) notify real‑time via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        text: "",         // no plaintext
        attachment_url: url,       // e.g. "/media/…jpg"
        time: timestamp
      }));
    }

    // 3) locally echo it (before the remote event arrives)
    // appendAttachment(/* incoming= */ false, url, timestamp);
  } catch (err) {
    console.error("Attachment upload/send failed:", err);
    // showNotification("Could not send attachment", "error");
  }
}





// helper to read one File as dataURI, returns a Promise<string>
// function fileToDataUri(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onerror = () => reject(reader.error);
//     reader.onload = () => resolve(reader.result);
//     reader.readAsDataURL(file);
//   });
// }



// function sendMessage() {
//   const text = messageInput.value.trim();

//   if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;
//   socket.send(JSON.stringify({ text }));
//   messageInput.value = '';
// }




// new unified send function:
async function sendMessage() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;


  // 1) If you have selected files, send them first
  if (selectedFiles && selectedFiles.length) {
    // for each file, read & send
    for (const file of selectedFiles) {
      sendAttachment(currentChatId, selectedFiles[0]);
    }
    // clear selection & UI
    selectedFiles = [];
    closeFileUpload();
    return;
  }

  // 2) Otherwise send plain text
  const text = messageInput.value.trim();
  // console.log(text);
  if (!text) return;

  socket.send(JSON.stringify({ text }));
  messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
// messageInput.addEventListener("keypress", e => e.key==="Enter" && sendMessage());



// Typing Indicator
messageInput.addEventListener('input', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  // tell server “I’m typing”
  socket.send(JSON.stringify({ typing: true }));

  clearTimeout(typingTimeout);
  // after 1s of no input, tell server “stopped typing”
  typingTimeout = setTimeout(() => {
    socket.send(JSON.stringify({ typing: false }));
  }, 1000);
});







// async function audioRecording (){
// // on first use, ask permission and create the recorder
//   if (!mediaRecorder) {
//     sendBtn.disabled = true;
//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     mediaRecorder = new MediaRecorder(stream);


//     mediaRecorder.ondataavailable = e => audioChunks.push(e.data);


//     mediaRecorder.onstop = () => {
//       // enable send once we have audio
//       sendBtn.disabled = false;
//     };
//   }

//   if (mediaRecorder.state === 'inactive') {
//     audioChunks = [];
//     mediaRecorder.start();
//     sendBtn.disabled = true;                       // disable Send while recording
//     recordIcon.classList.replace('fa-microphone','fa-stop');
//   } else {
//     mediaRecorder.stop();
//     sendBtn.disabled = false;
//     recordIcon.classList.replace('fa-stop','fa-microphone');
//   }
// }



// 2) Initialize and toggle recording
// recordBtn.addEventListener('click', audioRecording);











// Render Messages
function renderMessages(messages) {
  messagesContainer.innerHTML = '';
  messagesContainer.appendChild(typingIndicator);

  messages.forEach(m => {

    const incoming = (m.sender == currentChatId)
    const ts = new Date(m.timestamp)
    const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })


    if (m.cipher) {
      const blob = sodium.from_base64(m.cipher)
      const nonce = blob.slice(0, NONCEBYTES)
      const ct = blob.slice(NONCEBYTES)
      const pt = sodium.crypto_secretbox_open_easy(ct, nonce, keyBytes)
      const text = sodium.to_string(pt)
      appendMessage(incoming, text, time)
    }

    // 2) render any attachment
    if (m.attachment) {
      appendAttachment(incoming, m.attachment, time)
    }
  })

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  // wrapper.scrollIntoView({ behavior: 'auto', block: 'end' });
}




// helper: incoming===true → bubble on left; false → on right
// function appendMessage(incoming, text, time) {
//   const wrapper = document.createElement("div");

//   wrapper.className = "flex items-start space-x-2 " + (incoming ? "" : "justify-end");

//   // const bubble1 = document.createElement("div");
//   const bubble = document.createElement("div");

//   bubble.className = incoming
//     ? "message-bubble bg-white rounded-2xl rounded-bl-md px-4 py-2 shadow-sm"
//     : "message-bubble bg-white rounded-2xl rounded-br-md px-4 py-2 shadow-sm";

//   bubble.innerHTML = incoming
//     ? `
//     <p class="text-gray-800">${text}</p>
//     <span class="text-xs text-gray-500 mt-1 block">${time}</span>
//   `
//     : `
//     <p class="text-gray-800">${text}</p>
//     <span class="text-xs text-gray-500 mt-1 block">${time}</span>
//   ` ;

//   wrapper.appendChild(bubble);
//   // insert the bubble just before the typingIndicator
//   messagesContainer.insertBefore(wrapper, typingIndicator);
//   messagesContainer.scrollTop = messagesContainer.scrollHeight;
// }






// helper: incoming===true → bubble on left; false → on right
function appendMessage(incoming, text, time) {
  const wrapper = document.createElement("div");

  // Responsive wrapper classes
  wrapper.className = "flex items-start space-x-2 px-2 sm:px-4 " +
    (incoming ? "pr-8 sm:pr-16" : "justify-end pl-8 sm:pl-16");

  const bubble = document.createElement("div");

  // Responsive bubble classes
  bubble.className = incoming
    ? "message-bubble bg-white rounded-2xl rounded-bl-md px-3 py-2 sm:px-4 sm:py-2 shadow-sm max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl break-words"
    : "message-bubble bg-white rounded-2xl rounded-br-md px-3 py-2 sm:px-4 sm:py-2 shadow-sm max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl break-words";

  // Responsive content with better text handling
  bubble.innerHTML = `
    <p class="text-gray-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">${text}</p>
    <span class="text-xs text-gray-500 mt-1 block">${time}</span>
  `;

  wrapper.appendChild(bubble);

  // Insert the bubble just before the typingIndicator
  messagesContainer.insertBefore(wrapper, typingIndicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}











// 1) load contacts and bind clicks
async function loadContacts() {

  container.innerHTML = ''; // clear

  const resp = await fetch('/chat/api/contacts/', {
    credentials: 'same-origin'
  });

  if (!resp.ok) throw new Error(resp.status);

  const contacts = await resp.json();

  console.log(contacts);

  for (const c of contacts) {
    const avatarHtml = c.avatar
      ? `<img src="${c.avatar}" alt="${c.name}" class="w-12 h-12 rounded-full object-cover"/>`
      : `<div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
             <i class="fas fa-user text-white"></i>
           </div>`;

    const item = document.createElement('div');
    item.className = 'chat-item flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors';
    item.dataset.userId = c.contact_id;
    item.dataset.name = c.name;
    item.dataset.avatar = c.avatar || '';
    item.dataset.show_online = c.show_online;
    item.dataset.is_online = c.is_online;

    const status = c.show_online
      ? c.is_online
        ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>'
        : '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-300 rounded-full border-2 border-white"></div>'
      : '';

    item.innerHTML = `
        <div class="relative">
          ${avatarHtml}
          ${status}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900 truncate">${c.name}</h3>
            <span class="text-xs text-gray-500">&nbsp;</span>
          </div>
          <p class="text-sm text-gray-600 truncate">&nbsp;</p>
        </div>
        <button 
                    onclick="event.stopPropagation(); confirmDeleteUser(${c.contact_id} , '${c.name}')"
                    class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete user"
                >
                    <i class="fas fa-trash text-sm"></i>
                </button>
      `;

    container.appendChild(item);

    // 4) bind *this* item’s click right here
    item.addEventListener('click', async () => {
      const uid = Number(item.dataset.userId);

      // toggle empty/chat
      if (currentChatId === uid) {
        currentChatId = null;
        toggleChatArea(false);
        return;
      }

      currentChatId = uid;

      // window.OTHER_USERNAME = currentChatId;


      // selectPeer(item.dataset.name);

      // setupForChatWithUser(window.OTHER_USER_ID);

      toggleChatArea(true);

      // window.OTHER_USER_ID = currentChatId;


      window.OTHER_USER_ID = uid;
      window.OTHER_USER_NAME = item.dataset.name;
      window.OTHER_USER_AVATAR = item.dataset.avatar;
    
      // Update video call manager with current user info
      if (window.videoCallManager) {
          window.videoCallManager.otherUserId = uid;
          window.videoCallManager.otherUserName = item.dataset.name;
          window.videoCallManager.otherUserAvatar = item.dataset.avatar;
      }

      // if(window.audioCallManager){
      //   window.audioCallManager.otherUserId = uid;
      //   window.audioCallManager.otherUserName = item.dataset.name;
      //   window.audioCallManager.otherUserAvatar = item.dataset.avatar;
      // }


      // Initialize audio recorder
      window.audioRecorder = new AudioRecorder();



      // window.videoCallManager.otherUserId = window.OTHER_USER_ID;


      // window.videoCallManager = new VideoCallManager();
      // window.videoCallManager.createSocketConnection();

      // highlight
      const CLS = [
        "active",
        "bg-gradient-to-r",
        "from-indigo-50",
        "to-purple-50",
        "border",
        "border-indigo-100"
      ];
      document.querySelectorAll(".chat-item").forEach(ci => {
        if (ci === item) ci.classList.add(...CLS);
        else ci.classList.remove(...CLS);
      });

      // header text
      currentChatName.textContent = item.dataset.name;

      // header avatar
      if (item.dataset.avatar) {
        currentChatAvatar.innerHTML = '';
        currentChatAvatar.className = 'w-10 h-10 rounded-full overflow-hidden';

        const img = document.createElement('img');
        img.src = item.dataset.avatar;
        img.alt = item.dataset.name + ' avatar';
        img.className = 'object-cover w-full h-full';
        currentChatAvatar.appendChild(img);
      } else {
        currentChatAvatar.className = 'w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center';
        currentChatAvatar.innerHTML = '<i class="fas fa-user text-white"></i>';
      }

      // 1) fetch history & key
      const resp = await fetch(`/chat/api/with/${uid}/`, {
        credentials: 'same-origin',
      });


      if (!resp.ok) {
        return;
      }

      const { key, messages } = await resp.json();
      keyBytes = sodium.from_base64(key);

      console.log(messages);

      // 2) decrypt & render
      renderMessages(messages);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // 3) open WebSocket
      if (socket) socket.close();

      socket = new WebSocket(`wss://${window.location.host}/ws/chat/${uid}/`);

      // console.log(socket);

      socket.onmessage = ev => {
        const msg = JSON.parse(ev.data);

        console.log(msg);

        // ─── TYPING INDICATOR ────────────────────────────────
        if (msg.typing !== undefined) {
          // Only react to typing events from the *other* user
          if (msg.sender === currentChatId) {
            console.log('yes');
            if (msg.typing) {
              typingIndicator.classList.remove('hidden');
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
              typingIndicator.classList.add('hidden');
            }
          }
          return;  // bail out — it was only a typing event
        }
        // ─────────────────────────────────────────────────────

        const { cipher, sender, timestamp, attachment_url } = msg;

        // decrypt Text Only
        if (cipher) {
          console.log(cipher);
          const blob = sodium.from_base64(cipher);
          const nonce = blob.slice(0, NONCEBYTES);
          const ct = blob.slice(NONCEBYTES);
          const pt = sodium.crypto_secretbox_open_easy(ct, nonce, keyBytes);
          const text = sodium.to_string(pt);

          // format timestamp
          const time = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          });

          appendMessage(sender == currentChatId, text, time);
        }

        // 2) If there’s an attachment, render that instead
        if (attachment_url) {
          const time = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
          });
          appendAttachment(sender === currentChatId, attachment_url, time);
        }

      };

    });
  }
}


loadContacts();