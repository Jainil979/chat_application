
// keep track of who’s open
let currentChatId = null;
let socket = null;
let keyBytes = null;
const NONCEBYTES = sodium.crypto_secretbox_NONCEBYTES;



// grab your containers
const container = document.getElementById('contactsList');
const headerAvatar = document.getElementById('currentChatAvatar');
const headerName = document.getElementById('currentChatName');




// 1) your click‐handler factory
// function onContactClick(item) {
//   return async () => {
//     const uid = Number(item.dataset.userId);

//     // toggle empty <> chat
//     if (currentChatId === uid) {
//       currentChatId = null;
//       toggleChatArea(false);
//       return;
//     }
//     currentChatId = uid;
//     toggleChatArea(true);

//     // highlight
//     const HIGHLIGHT = [
//       "active",
//       "bg-gradient-to-r",
//       "from-indigo-50",
//       "to-purple-50",
//       "border",
//       "border-indigo-100"
//     ];
//     document.querySelectorAll(".chat-item").forEach(ci => {
//       ci.classList.toggle(
//         HIGHLIGHT[0],
//         ci === item
//       );

//       // add/remove the rest all at once
//       if (ci === item) ci.classList.add(...HIGHLIGHT);
//       else ci.classList.remove(...HIGHLIGHT);
//     });

//     // header name
//     headerName.textContent = item.dataset.name;

//     // header avatar
//     if (item.dataset.avatar) {
//       headerAvatar.innerHTML = "";
//       headerAvatar.className = "w-10 h-10 rounded-full overflow-hidden";
//       const img = document.createElement("img");
//       img.src = item.dataset.avatar;
//       img.alt = item.dataset.name + " avatar";
//       img.className = "object-cover w-full h-full";
//       headerAvatar.appendChild(img);
//     } else {
//       headerAvatar.className = "w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center";
//       headerAvatar.innerHTML = `<i class="fas fa-user text-white"></i>`;
//     }

//     // finally load & render the message history
//     // await renderMessages(uid);
//   };
// }






// 1) load contacts and bind clicks
async function loadContacts() {

  container.innerHTML = ''; // clear

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
    item.innerHTML = `
        <div class="relative">
          ${avatarHtml}
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
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
      toggleChatArea(true);

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
      headerName.textContent = item.dataset.name;

      // header avatar
      if (item.dataset.avatar) {
        headerAvatar.innerHTML = '';
        headerAvatar.className = 'w-10 h-10 rounded-full overflow-hidden';
        const img = document.createElement('img');
        img.src = item.dataset.avatar;
        img.alt = item.dataset.name + ' avatar';
        img.className = 'object-cover w-full h-full';
        headerAvatar.appendChild(img);
      } else {
        headerAvatar.className = 'w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center';
        headerAvatar.innerHTML = '<i class="fas fa-user text-white"></i>';
      }

      // 1) fetch history & key
      const resp = await fetch(`/chat/api/with/${uid}/`, {
        credentials: 'same-origin'
      });

      const { key, messages } = await resp.json();
      keyBytes = sodium.from_base64(key);

      // 2) decrypt & render
      renderMessages(messages , keyBytes , NONCEBYTES);

      // 3) open WebSocket
      if (socket) socket.close();

      socket = new WebSocket(`ws://${window.location.host}/ws/chat/${uid}/`);

      socket.onmessage = ev => {
        const { cipher, sender, timestamp } = JSON.parse(ev.data);
        // decrypt
        const blob = sodium.from_base64(cipher);
        const nonce = blob.slice(0, NONCEBYTES);
        const ct = blob.slice(NONCEBYTES);
        const pt = sodium.crypto_secretbox_open_easy(ct, nonce, keyBytes);
        const text = sodium.to_string(pt);
        // format time
        const time = new Date(timestamp).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit'
        });
        appendMessage(sender == uid, text, time);
      };

      // finally fetch & render this chat’s messages
      // await renderMessages(uid);
    });
  }
}


loadContacts();


// 3) on DOM ready, load + bind
// document.addEventListener("DOMContentLoaded", async () => {
//   await loadContacts();
//   document.querySelectorAll(".chat-item").forEach(item => {
//     item.addEventListener("click", onContactClick(item));
//   });
// });



