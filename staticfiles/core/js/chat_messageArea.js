const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messagesContainer");
const typingIndicator = document.getElementById("typingIndicator");
let currentChatName = document.getElementById("currentChatName");
let currentChatStatus = document.getElementById("currentChatStatus");
let currentChatAvatar = document.getElementById("currentChatAvatar");
const emptyState = document.getElementById("emptyState");
const mainChatArea = document.getElementById("mainChatArea");



// keep track of who’s open
let currentChatId = null;
let socket = null;
let keyBytes = null;
const NONCEBYTES = sodium.crypto_secretbox_NONCEBYTES;


// grab your containers
const container = document.getElementById('contactsList');
// const headerAvatar = document.getElementById('currentChatAvatar');
// const headerName = document.getElementById('currentChatName');




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
      // try {
      //   console.log(file);
      //   const dataUri = await fileToDataUri(file);
      //   console.log(dataUri);
      //   socket.send(JSON.stringify({
      //     attachment: dataUri
      //   }));
      // } catch (err) {
      //   console.error("File read failed:", err);
      //   // showNotification("Failed to attach file", "error");
      // }
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




function renderMessages(messages) {
  messagesContainer.innerHTML = '';
  messagesContainer.appendChild(typingIndicator);

  messages.forEach(m => {

    const incoming = (m.sender == currentChatId)
    const ts = new Date(m.timestamp)
    const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })


     if (m.cipher) {
      const blob  = sodium.from_base64(m.cipher)
      const nonce = blob.slice(0, NONCEBYTES)
      const ct    = blob.slice(NONCEBYTES)
      const pt    = sodium.crypto_secretbox_open_easy(ct, nonce, keyBytes)
      const text  = sodium.to_string(pt)
      appendMessage(incoming, text, time)
    }

    // 2) render any attachment
    if (m.attachment) {
      appendAttachment(incoming, m.attachment, time)
    }
  })

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}




// helper: incoming===true → bubble on left; false → on right
function appendMessage(incoming, text, time) {
  const wrapper = document.createElement("div");

  wrapper.className = "flex items-start space-x-2 " + (incoming ? "" : "justify-end");

  // const bubble1 = document.createElement("div");
  const bubble = document.createElement("div");

  bubble.className = incoming
    ? "message-bubble bg-white rounded-2xl rounded-bl-md px-4 py-2 shadow-sm"
    : "message-bubble bg-white rounded-2xl rounded-br-md px-4 py-2 shadow-sm";

  bubble.innerHTML = incoming
    ? `
    <p class="text-gray-800">${text}</p>
    <span class="text-xs text-gray-500 mt-1 block">${time}</span>
  `
    : `
    <p class="text-gray-800">${text}</p>
    <span class="text-xs text-gray-500 mt-1 block">${time}</span>
  ` ;

  wrapper.appendChild(bubble);
  // insert the bubble just before the typingIndicator
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
      window.OTHER_USER_ID = currentChatId;
      toggleChatArea(true);

      window.videoCallManager = new VideoCallManager();

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
        const { cipher, sender, timestamp, attachment_url } = JSON.parse(ev.data);

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