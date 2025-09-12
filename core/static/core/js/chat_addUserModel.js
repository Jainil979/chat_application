
// Modal elements
const addUserBtn = document.getElementById("addUserBtn");
const addUserModal = document.getElementById("addUserModal");
const closeAddUser = document.getElementById("closeAddUser");
const cancelAddUser = document.getElementById("cancelAddUser");
const emailError = document.getElementById("emailError");


// Open Add User modal
addUserBtn.addEventListener("click", () => {
    addUserModal.classList.remove("hidden");
    emailError.classList.add("hidden");
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.classList.add('hidden');
    }
});


// Close Add User modal
[closeAddUser, cancelAddUser].forEach(btn =>
    btn.addEventListener("click", () => {
        addUserModal.classList.add("hidden");
    })
);

// Close when clicking outside content
addUserModal.addEventListener("click", e => {
    if (e.target === addUserModal) {
        addUserModal.classList.add("hidden");
    }
});



// Get csrf token From Cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
        document.cookie.split(';').forEach(cookie => {
            const [k, v] = cookie.trim().split('=');
            if (k === name) cookieValue = decodeURIComponent(v);
        });
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');


// Validate email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


// Email error display
function showError(fieldId, show = true) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (show) {
        errorElement.classList.remove('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}


// Show message function
function showMessage(message, type = 'success') {
    let messageContainer = document.getElementById('messageContainer');

    const bgColor = type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
    const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    messageContainer.innerHTML = `
        <div class="flex items-center p-3 border rounded-lg ${bgColor}">
            <i class="${icon} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    messageContainer.classList.remove('hidden');

    // Auto hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 3000);
    }
}



// Add User
const addUserForm = document.getElementById('addUserForm');
const userEmailIn = document.getElementById('userEmail');
const submitBtn = addUserForm.querySelector('button[type="submit"]');

addUserForm.addEventListener('submit', async e => {
    e.preventDefault();

    const email = userEmailIn.value.trim();

    // Hide any previous messages
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.classList.add('hidden');
    }

    let isValid = true

    if (!validateEmail(email)) {
        showError('email', true);
        isValid = false;
    } else {
        showError('email', false);
    }

    if (!isValid) return;

    // Disable UI
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    try {
        const resp = await fetch('/chat/api/add_user/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({ email })
        });

        if (resp.status === 201) {
            // Success!
            showMessage('User added successfully!', 'success');
            userEmailIn.value = '';
            loadContacts();

            // Close modal after 2 seconds
            setTimeout(() => {
                addUserModal.classList.add('hidden');
            }, 400);

        } else if (resp.status === 400) {
            const err = await resp.json();
            let errorMessage = 'Failed to add user.';

            if (err.email) {
                errorMessage = Array.isArray(err.email) ? err.email.join(' ') : err.email;
            } else if (err.error) {
                errorMessage = err.error;
            }

            showMessage(errorMessage, 'error');

        } else {
            throw new Error(`Unexpected ${resp.status}`);
        }
    } catch (err) {
        console.error(err);
        showMessage('Could not add user. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add User';
    }
});




// Confirm delete user with custom modal open
function confirmDeleteUser(contact_id, userName) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95">
            <div class="p-6">
                <!-- Header -->
                <div class="flex items-center justify-center mb-6">
                    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-trash text-red-500 text-2xl"></i>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="text-center mb-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">Delete User</h3>
                    <p class="text-gray-600">
                        Are you sure you want to delete <strong>${userName}</strong>?
                    </p>
                    <p class="text-sm text-gray-500 mt-2">
                        This action cannot be undone.
                    </p>
                </div>
                
                <!-- Actions -->
                <div class="flex space-x-3">
                    <button 
                        onclick="closeDeleteModal()"
                        class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onclick="deleteUser(${contact_id}, '${userName}')"
                        class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
        modal.querySelector('.transform').classList.remove('scale-95');
        modal.querySelector('.transform').classList.add('scale-100');
    }, 10);

    // Store modal reference
    window.currentDeleteModal = modal;
}


// Close custom delete modal
function closeDeleteModal() {
    if (window.currentDeleteModal) {
        window.currentDeleteModal.remove();
        window.currentDeleteModal = null;
    }
}



// 3. Toast Notification Function (for delete feedback)
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'fixed top-4 right-4 z-[9999] space-y-2';
        document.body.appendChild(toastContainer);
    }

    console.log('here');

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-triangle';

    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform translate-x-full transition-transform duration-300`;

    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // 3. Slide in (on the next tick)
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full');
    });


    // 4. After 600ms of being fully visible, slide out
    setTimeout(() => {
        toast.classList.add('translate-x-full');

        // 5. Remove from DOM after slide‑out completes (300ms)
        setTimeout(() => {
            toast.remove();
            // If you want to clean up the container when empty:
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    }, 600);
}



async function deleteUser(contactId, userName) {
    // find the delete button so we can show a spinner
    const button = document.querySelector(`button[data-delete-id="${contactId}"]`);

    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
    }

    try {
        const resp = await fetch(`/chat/api/delete_user/${contactId}/`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'X-CSRFToken': csrftoken },
        });

        if (resp.ok) {
            // animate removal from the UI
            const item = document.querySelector(`[data-user-id="${contactId}"]`);

            if (item) {
                item.style.transition = 'all 0.3s';
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                setTimeout(() => item.remove(), 400);
            }

            showToast(`${userName} was removed from your contacts.`, 'success');

            setTimeout(() => closeDeleteModal(), 700);

            toggleChatArea(false);

        } else {
            const err = await resp.json();
            throw new Error(err.detail || `Status ${resp.status}`);
        }
    } catch (e) {
        console.error("Delete failed:", e);
        showToast("Could not delete user. Try again.", 'error');
        if (button) {
            button.innerHTML = '<i class="fas fa-trash"></i>';
            button.disabled = false;
        }
    }
}
