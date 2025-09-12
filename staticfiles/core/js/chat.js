// DOM Elements
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
// const profileBtn = document.getElementById("profileBtn");
// const profileModal = document.getElementById("profileModal");
// const closeProfile = document.getElementById("closeProfile");
// const messageInput = document.getElementById("messageInput");
// const sendBtn = document.getElementById("sendBtn");
// const messagesContainer = document.getElementById("messagesContainer");
// const typingIndicator = document.getElementById("typingIndicator");
// const currentChatName = document.getElementById("currentChatName");
// const currentChatStatus = document.getElementById("currentChatStatus");
// const currentChatAvatar = document.getElementById("currentChatAvatar");
// const emptyState = document.getElementById("emptyState");
// const mainChatArea = document.getElementById("mainChatArea");
const chatListWrapper = document.querySelector(".p-4.space-y-2");

// Chat data (unchanged)…
const chats = {
    sarah: { /* … */ },
    mike: { /* … */ },
    team: { /* … */ },
    emma: { /* … */ }
};
let currentChat = null;

// Helpers
function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    sidebarOverlay.classList.add("hidden");
}

// function toggleChatArea(show) {
//     if (show) {
//         emptyState.classList.add("hidden");
//         mainChatArea.classList.remove("hidden");
//     } else {
//         emptyState.classList.remove("hidden");
//         mainChatArea.classList.add("hidden");
//         // remove any active highlight
//         document.querySelectorAll(".chat-item").forEach(item => {
//             item.classList.remove(
//                 "active", "bg-gradient-to-r", "from-indigo-50", "to-purple-50", "border", "border-indigo-100"
//             );
//         });
//     }
// }


// Sidebar toggle
sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("-translate-x-full");
    sidebarOverlay.classList.toggle("hidden");
});
sidebarOverlay.addEventListener("click", closeSidebar);


// Profile modal
// profileBtn.addEventListener("click", () => profileModal.classList.remove("hidden"));
// closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));
// profileModal.addEventListener("click", e => {
//     if (e.target === profileModal) profileModal.classList.add("hidden");
// });


// // Render messages
// function renderMessages(chatId) {
//     const chat = chats[chatId];
//     messagesContainer.innerHTML = "";
//     chat.messages.forEach(msg => {
//         const wrapper = document.createElement("div");
//         if (msg.type === "sent") {
//             wrapper.className = "flex items-start space-x-2 justify-end";
//             wrapper.innerHTML = `
//           <div class="message-bubble bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-br-md px-4 py-2 shadow-sm">
//             <p>${msg.text}</p>
//             <span class="text-xs opacity-80 mt-1 block">${msg.time}</span>
//           </div>`;
//         } else {
//             const sender = msg.sender ? `<strong>${msg.sender}:</strong> ` : "";
//             wrapper.className = "flex items-start space-x-2";
//             wrapper.innerHTML = `
//           <div class="w-8 h-8 bg-gradient-to-r ${chat.avatar} rounded-full flex items-center justify-center flex-shrink-0">
//             <i class="text-white ${chat.icon} text-xs"> </i>
//           </div>
//           <div class="message-bubble bg-white rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
//             <p class="text-gray-800">${sender}${msg.text}</p>
//             <span class="text-xs text-gray-500 mt-1 block">${msg.time}</span>
//           </div>`;
//         }
//         messagesContainer.appendChild(wrapper);
//     });
//     messagesContainer.appendChild(typingIndicator);
//     messagesContainer.scrollTop = messagesContainer.scrollHeight;
// }


// Switch chat on click
// function bindChatItem(item) {
//     item.addEventListener("click", () => {
//         const chatId = item.dataset.chat;
//         currentChat = chatId;
//         toggleChatArea(true);

//         // Header update
//         const chat = chats[chatId];
//         currentChatName.textContent = chat.name;
//         currentChatStatus.textContent = chat.status;
//         currentChatAvatar.className = `w-10 h-10 bg-gradient-to-r ${chat.avatar} rounded-full flex items-center justify-center`;
//         currentChatAvatar.innerHTML = `<i class="${chat.icon} text-white"></i>`;

//         // Highlight active
//         document.querySelectorAll(".chat-item").forEach(ci => {
//             ci.classList.toggle(
//                 "active bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100",
//                 ci === item
//             );
//         });

//         renderMessages(chatId);
//         closeSidebar();
//     });
// }
// document.querySelectorAll(".chat-item").forEach(bindChatItem);


// Send message
// function sendMessage() {
//     const text = messageInput.value.trim();
//     if (!text || !currentChat) return;
//     const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//     chats[currentChat].messages.push({ type: "sent", text, time: now });
//     renderMessages(currentChat);
//     messageInput.value = "";

//     // Sidebar preview
//     const preview = document.querySelector(`[data-chat="${currentChat}"] p`);
//     if (preview) preview.textContent = text;

//     // Simulate reply
//     setTimeout(() => {
//         typingIndicator.classList.remove("hidden");
//         messagesContainer.scrollTop = messagesContainer.scrollHeight;
//         setTimeout(() => {
//             typingIndicator.classList.add("hidden");
//             const responses = [
//                 "That sounds great! 👍", "Interesting! Tell me more 🤔",
//                 "I agree with you on that 💯", "Thanks for sharing! 😊",
//                 "Awesome! Keep up the good work 🚀"
//             ];
//             const resp = responses[Math.floor(Math.random() * responses.length)];
//             const t2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//             chats[currentChat].messages.push({ type: "received", text: resp, time: t2 });
//             renderMessages(currentChat);
//             if (preview) preview.textContent = resp;
//         }, 1500);
//     }, 500);
// }
// sendBtn.addEventListener("click", sendMessage);
// messageInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });


// Search conversations
document.querySelector('input[placeholder="Search conversations..."]')
    .addEventListener("input", e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll(".chat-item").forEach(item => {
            const name = item.querySelector("h3").textContent.toLowerCase();
            const prev = item.querySelector("p").textContent.toLowerCase();
            item.style.display = (name.includes(term) || prev.includes(term)) ? "flex" : "none";
        });
        
    });

// Close sidebar on overlay
sidebarOverlay.addEventListener("click", closeSidebar);
window.addEventListener("resize", () => { if (window.innerWidth >= 1024) closeSidebar(); });


// INITIAL STATE: show empty-state only
// toggleChatArea(true);




// Sample existing users data
// const existingUsers = [
//     { id: 1, name: "Alice Johnson", email: "alice@example.com" },
//     { id: 2, name: "Bob Smith", email: "bob@example.com" },
//     { id: 3, name: "Charlie Brown", email: "charlie@example.com" },
//     { id: 4, name: "Diana Prince", email: "diana@example.com" },
//     { id: 5, name: "Edward Wilson", email: "edward@example.com" },
//     { id: 6, name: "Fiona Davis", email: "fiona@example.com" },
//     { id: 7, name: "George Miller", email: "george@example.com" },
//     { id: 8, name: "Helen Cooper", email: "helen@example.com" },
//     { id: 9, name: "Ivan Rodriguez", email: "ivan@example.com" },
//     { id: 10, name: "Julia Martinez", email: "julia@example.com" }
// ];

let selectedUsers = [];

// Modal Functions
function openModal() {
    document.getElementById('groupModal').classList.remove('hidden');
    showUserSelectionScreen();
}

function closeModal() {
    document.getElementById('groupModal').classList.add('hidden');
    resetModal();
}

function resetModal() {
    selectedUsers = [];
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
    showUserSelectionScreen();
}

// Screen Navigation
function showUserSelectionScreen() {
    document.getElementById('userSelectionScreen').classList.remove('hidden');
    document.getElementById('createGroupScreen').classList.add('hidden');
    displayUsersList();
}

function showCreateGroupScreen() {
    document.getElementById('userSelectionScreen').classList.add('hidden');
    document.getElementById('createGroupScreen').classList.remove('hidden');
    displaySelectedMembers();
}

function goBackToUserSelection() {
    showUserSelectionScreen();
}

function saveUserSelection() {
    showCreateGroupScreen();
}

//  User Selection Functions
// function displayUsersList() {
//     const usersList = document.getElementById('usersList');
//     usersList.innerHTML = '';

//     // Use document fragment for better performance
//     const fragment = document.createDocumentFragment();

//     existingUsers.forEach(user => {
//         const isSelected = selectedUsers.some(selectedUser => selectedUser.id === user.id);
//         const userItem = document.createElement('div');
//         userItem.className = `user-item flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-green-50 border-green-200' : 'border-gray-200'}`;
//         userItem.onclick = () => toggleUser(user);

//         userItem.innerHTML = `
//                     <div class="flex items-center space-x-3 min-w-0 flex-1">
//                         <div class="user-avatar w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
//                             ${user.name.charAt(0)}
//                         </div>
//                         <div class="user-info min-w-0 flex-1">
//                             <div class="user-name font-medium text-gray-900">${user.name}</div>
//                             <div class="user-email text-sm text-gray-500">${user.email}</div>
//                         </div>
//                     </div>
//                     <div class="text-green-500 flex-shrink-0 ${isSelected ? '' : 'hidden'}">
//                         <i class="fas fa-check"></i>
//                     </div>
//                 `;

//         fragment.appendChild(userItem);
//     });

//     usersList.appendChild(fragment);
// }

function toggleUser(user) {
    const index = selectedUsers.findIndex(selectedUser => selectedUser.id === user.id);

    if (index > -1) {
        selectedUsers.splice(index, 1);
    } else {
        selectedUsers.push(user);
    }

    // Update only the specific user item instead of re-rendering the entire list
    updateUserItemState(user);
}

function updateUserItemState(user) {
    const userItems = document.querySelectorAll('.user-item');
    const isSelected = selectedUsers.some(selectedUser => selectedUser.id === user.id);

    userItems.forEach(item => {
        const userName = item.querySelector('.user-name').textContent;
        if (userName === user.name) {
            const checkIcon = item.querySelector('.text-green-500');
            if (isSelected) {
                item.classList.add('bg-green-50', 'border-green-200');
                item.classList.remove('border-gray-200');
                checkIcon.classList.remove('hidden');
            } else {
                item.classList.remove('bg-green-50', 'border-green-200');
                item.classList.add('border-gray-200');
                checkIcon.classList.add('hidden');
            }
        }
    });
}

// Create Group Screen Functions
function displaySelectedMembers() {
    const container = document.getElementById('selectedMembersList');

    if (selectedUsers.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm">No members selected</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    selectedUsers.forEach(user => {
        const memberItem = document.createElement('div');
        memberItem.className = 'selected-member-item flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2';
        memberItem.innerHTML = `
            <div class="flex items-center space-x-2 min-w-0 flex-1">
                <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    ${user.name.charAt(0)}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">${user.name}</div>
                    <div class="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">${user.email}</div>
                </div>
            </div>
            <button type="button" onclick="removeMember(${user.id})" class="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                <i class="fas fa-times"></i>
            </button>
        `;
        fragment.appendChild(memberItem);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function removeMember(userId) {
    selectedUsers = selectedUsers.filter(user => user.id !== userId);
    displaySelectedMembers();
}

function createGroup(event) {
    event.preventDefault();

    const groupName = document.getElementById('groupName').value;
    const groupDescription = document.getElementById('groupDescription').value;

    if (selectedUsers.length === 0) {
        alert('Please select at least one member for the group.');
        return;
    }

    const groupData = {
        name: groupName,
        description: groupDescription,
        members: selectedUsers
    };

    console.log('Creating group:', groupData);
    alert(`Group "${groupName}" created with ${selectedUsers.length} members!`);
    closeModal();
}

// Add smooth scrolling behavior on page load
// document.addEventListener('DOMContentLoaded', function () {
//     // Enable smooth scrolling for all scrollable containers
//     const scrollableContainers = document.querySelectorAll('.smooth-scroll');
//     scrollableContainers.forEach(container => {
//         container.style.scrollBehavior = 'smooth';
//     });
// });



// function handleProfileImageChange(event) {
//     const file = event.target.files[0];
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             const profilePicture = document.getElementById('profilePicture');
//             const cameraIcon = document.getElementById('cameraIcon');
//             const removeBtn = document.getElementById('removeProfileBtn');

//             // Set the background image
//             profilePicture.style.backgroundImage = `url(${e.target.result})`;
//             profilePicture.style.backgroundSize = 'cover';
//             profilePicture.style.backgroundPosition = 'center';

//             // Hide camera icon and show remove button
//             cameraIcon.style.display = 'none';
//             removeBtn.classList.remove('hidden');
//         };
//         reader.readAsDataURL(file);
//     }
// }

// function removeProfilePicture() {
//     const profilePicture = document.getElementById('profilePicture');
//     const cameraIcon = document.getElementById('cameraIcon');
//     const removeBtn = document.getElementById('removeProfileBtn');
//     const fileInput = document.getElementById('profileImageInput');

//     // Reset to default state
//     profilePicture.style.backgroundImage = '';
//     profilePicture.style.backgroundSize = '';
//     profilePicture.style.backgroundPosition = '';

//     // Show camera icon and hide remove button
//     cameraIcon.style.display = 'block';
//     removeBtn.classList.add('hidden');

//     // Clear file input
//     fileInput.value = '';
// }
