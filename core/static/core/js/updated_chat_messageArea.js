// chat_messageArea.js - Updated to set OTHER_USER_ID when chat is selected

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messagesContainer");
const typingIndicator = document.getElementById("typingIndicator");
let currentChatName = document.getElementById("currentChatName");
let currentChatStatus = document.getElementById("currentChatStatus");
let currentChatAvatar = document.getElementById("currentChatAvatar");
const emptyState = document.getElementById("emptyState");
const mainChatArea = document.getElementById("mainChatArea");

let typingTimeout;
let currentChatId = null;
let socket = null;
let keyBytes = null;
const NONCEBYTES = sodium.crypto_secretbox_NONCEBYTES;

const container = document.getElementById('contactsList');

// Audio Recorder class remains the same...

// Empty state and Main chat area toggle
function toggleChatArea(show) {
    if (show) {
        emptyState.classList.add("hidden");
        mainChatArea.classList.remove("hidden");
    } else {
        emptyState.classList.remove("hidden");
        mainChatArea.classList.add("hidden");
        document.querySelectorAll(".chat-item").forEach(item => {
            item.classList.remove(
                "active", "bg-gradient-to-r", "from-indigo-50", "to-purple-50", "border", "border-indigo-100"
            );
        });
    }
}

toggleChatArea(false);

async function uploadAttachment(roomId, file) {
    const form = new FormData();
    form.append('file', file);

    const resp = await fetch(`/chat/api/rooms/${roomId}/upload/`, {
        method: 'POST',
        credentials: 'same-origin',
        body: form
    });

    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Upload failed');
    }
    return resp.json();
}

async function sendAttachment(roomId, file) {
    try {
        const { url, timestamp } = await uploadAttachment(roomId, file);

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                text: "",
                attachment_url: url,
                time: timestamp
            }));
        }
    } catch (err) {
        console.error("Attachment upload/send failed:", err);
    }
}

async function sendMessage() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    if (selectedFiles && selectedFiles.length) {
        for (const file of selectedFiles) {
            sendAttachment(currentChatId, selectedFiles[0]);
        }
        selectedFiles = [];
        closeFileUpload();
        return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    socket.send(JSON.stringify({ text }));
    messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener('input', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({ typing: true }));

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.send(JSON.stringify({ typing: false }));
    }, 1000);
});

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

        if (m.attachment) {
            appendAttachment(incoming, m.attachment, time)
        }
    })

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function appendMessage(incoming, text, time) {
    const wrapper = document.createElement("div");

    wrapper.className = "flex items-start space-x-2 px-2 sm:px-4 " +
        (incoming ? "pr-8 sm:pr-16" : "justify-end pl-8 sm:pl-16");

    const bubble = document.createElement("div");

    bubble.className = incoming
        ? "message-bubble bg-white rounded-2xl rounded-bl-md px-3 py-2 sm:px-4 sm:py-2 shadow-sm max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl break-words"
        : "message-bubble bg-white rounded-2xl rounded-br-md px-3 py-2 sm:px-4 sm:py-2 shadow-sm max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl break-words";

    bubble.innerHTML = `
        <p class="text-gray-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">${text}</p>
        <span class="text-xs text-gray-500 mt-1 block">${time}</span>
    `;

    wrapper.appendChild(bubble);
    messagesContainer.insertBefore(wrapper, typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadContacts() {
    container.innerHTML = '';

    const resp = await fetch('/chat/api/contacts/', {
        credentials: 'same-origin'
    });

    if (!resp.ok) throw new Error(resp.status);

    const contacts = await resp.json();

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
            <button onclick="event.stopPropagation(); confirmDeleteUser(${c.contact_id}, '${c.name}')" class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200" title="Delete user">
                <i class="fas fa-trash text-sm"></i>
            </button>
        `;

        container.appendChild(item);

        item.addEventListener('click', async () => {
            const uid = Number(item.dataset.userId);

            if (currentChatId === uid) {
                currentChatId = null;
                toggleChatArea(false);
                return;
            }

            currentChatId = uid;
            toggleChatArea(true);

            // Set the global OTHER_USER_ID variable
            window.OTHER_USER_ID = currentChatId;

            // Highlight active chat
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

            // Update header
            currentChatName.textContent = item.dataset.name;

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

            // Fetch chat history
            const resp = await fetch(`/chat/api/with/${uid}/`, {
                credentials: 'same-origin',
            });

            if (!resp.ok) {
                return;
            }

            const { key, messages } = await resp.json();
            keyBytes = sodium.from_base64(key);

            renderMessages(messages);

            // Open WebSocket connection
            if (socket) socket.close();

            socket = new WebSocket(`wss://${window.location.host}/ws/chat/${uid}/`);

            socket.onmessage = ev => {
                const msg = JSON.parse(ev.data);

                if (msg.typing !== undefined) {
                    if (msg.sender === currentChatId) {
                        if (msg.typing) {
                            typingIndicator.classList.remove('hidden');
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        } else {
                            typingIndicator.classList.add('hidden');
                        }
                    }
                    return;
                }

                const { cipher, sender, timestamp, attachment_url } = msg;

                if (cipher) {
                    const blob = sodium.from_base64(cipher);
                    const nonce = blob.slice(0, NONCEBYTES);
                    const ct = blob.slice(NONCEBYTES);
                    const pt = sodium.crypto_secretbox_open_easy(ct, nonce, keyBytes);
                    const text = sodium.to_string(pt);

                    const time = new Date(timestamp).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit'
                    });

                    appendMessage(sender == currentChatId, text, time);
                }

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