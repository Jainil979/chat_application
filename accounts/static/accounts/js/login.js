// Toggle password visibility
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggle');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}


function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}



// Show Error Message
function showError(fieldId, show = true) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (show) {
        errorElement.classList.remove('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}


document.getElementById('email').addEventListener('blur', function (e) {
    showError('email', !validateEmail(e.target.value));
});


// Get CSRF token from the cookie
function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
}


// Handle form submission
// document.getElementById('loginForm').addEventListener('submit', async function (e) {
//     e.preventDefault();

//     const submitButton = e.target.querySelector('button[type="submit"]');
//     const loginText = document.getElementById('loginText');
//     const loginIcon = document.getElementById('loginIcon');
//     const loginSpinner = document.getElementById('loginSpinner');

//     submitButton.disabled = true;

//     // grab the credentials
//     const formData = new FormData(e.target);
//     const payload = {
//         email: formData.get('email').toLowerCase(),
//         password: formData.get('password')
//     };

//     let isValid = true;

//     if (!validateEmail(payload.email)) {
//         showError('email', true);
//         isValid = false;
//     } else {
//         showError('email', false);
//     }

//     if (!isValid) {
//         return;
//     }

//     try {
//         // show loading state
//         // submitButton.disabled = true;
//         loginText.textContent = 'Logging In ';
//         loginIcon.classList.add('hidden');
//         loginSpinner.classList.remove('hidden');

//         const csrftoken = getCookie('csrftoken');

//         const resp = await fetch('/api/auth/login/', {
//             method: 'POST',
//             credentials: 'same-origin',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': csrftoken,                          // include CSRF header
//             },
//             body: JSON.stringify(payload),
//         });

//         if (resp.ok) {
//             showMessage('Successfully logged in! Redirecting...', 'success');

//             // redirect to your chat dashboard:
//             setTimeout(() => {
//                 window.location.href = '/chat/profile/';
//             }, 1000);

//         } else if (resp.status === 401 || resp.status === 400) {
//             // invalid credentials
//             showMessage('Invalid email or password', 'error');
//         } else {
//             showMessage('Unexpected server response. Please try again.', 'error');
//         }
//     } catch (err) {
//         showMessage('Network error. Please check your connection.', 'error');
//     } finally {
//         // restore button
//         submitButton.disabled = false;
//         loginText.textContent = 'Login';
//         loginIcon.classList.remove('hidden');
//         loginSpinner.classList.add('hidden');
//     }
// });




// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const loginText = document.getElementById('loginText');
    const loginIcon = document.getElementById('loginIcon');
    const loginSpinner = document.getElementById('loginSpinner');

    submitButton.disabled = true;

    // grab the credentials
    const formData = new FormData(e.target);
    const payload = {
        email: formData.get('email').toLowerCase(),
        password: formData.get('password')
    };

    let isValid = true;

    if (!validateEmail(payload.email)) {
        showError('email', true);
        isValid = false;
    } else {
        showError('email', false);
    }

    if (!isValid) {
        submitButton.disabled = false;
        return;
    }

    try {
        // show loading state
        loginText.textContent = 'Logging In ';
        loginIcon.classList.add('hidden');
        loginSpinner.classList.remove('hidden');

        const csrftoken = getCookie('csrftoken');

        console.log(payload);
        console.log(csrftoken);

        const resp = await fetch('/api/auth/login/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify(payload),
        });

        if (resp.ok) {
            const data = await resp.json();
            showMessage('Successfully logged in! Redirecting...', 'success');

            // Redirect based on profile completion status
            let redirectUrl;
            if (data.profile_completed) {
                redirectUrl = '/chats/';  // Go to chats if profile is complete
            } else {
                redirectUrl = '/chat/profile/';  // Go to profile if not complete
            }

            // alert(redirectUrl);
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);

        } else if (resp.status === 401 || resp.status === 400) {
            // invalid credentials
            showMessage('Invalid email or password', 'error');
            submitButton.disabled = false;
        } else {
            showMessage('Unexpected server response. Please try again.', 'error');
            submitButton.disabled = false;
        }
    } catch (err) {
        showMessage('Network error. Please check your connection.', 'error');
        submitButton.disabled = false;
    } finally {
        // restore button
        loginText.textContent = 'Login';
        loginIcon.classList.remove('hidden');
        loginSpinner.classList.add('hidden');
    }
});






// Enhanced message function with awesome design
function showMessage(text, type = 'info') {
    // Remove any existing messages first
    const existingMessages = document.querySelectorAll('.login-message');
    existingMessages.forEach(msg => msg.remove());

    const message = document.createElement('div');
    message.className = 'login-message';

    // Define styles based on message type
    let bgColor, borderColor, iconSvg, textColor;

    if (type === 'success') {
        bgColor = 'bg-gradient-to-r from-green-50 to-emerald-50';
        borderColor = 'border-green-200';
        textColor = 'text-green-800';
        iconSvg = `
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;
    } else if (type === 'error') {
        bgColor = 'bg-gradient-to-r from-red-50 to-rose-50';
        borderColor = 'border-red-200';
        textColor = 'text-red-800';
        iconSvg = `
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;
    } else {
        bgColor = 'bg-gradient-to-r from-blue-50 to-indigo-50';
        borderColor = 'border-blue-200';
        textColor = 'text-blue-800';
        iconSvg = `
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;
    }

    message.innerHTML = `
        <div class="flex items-center space-x-3 p-4 rounded-xl border-2 ${bgColor} ${borderColor} shadow-lg backdrop-blur-sm transform transition-all duration-300 ease-out scale-95 opacity-0">
            <div class="flex-shrink-0">
                ${iconSvg}
            </div>
            <div class="flex-1">
                <p class="text-sm font-semibold ${textColor}">${text}</p>
            </div>
            <div class="flex-shrink-0">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="${textColor} hover:${textColor} transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Position the message at the top of the login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Insert at the beginning of the form
        loginForm.insertBefore(message, loginForm.firstChild);
    } else {
        // Fallback: append to body
        document.body.appendChild(message);
    }

    // Animate in
    setTimeout(() => {
        const messageContent = message.querySelector('div');
        messageContent.classList.remove('scale-95', 'opacity-0');
        messageContent.classList.add('scale-100', 'opacity-100');
    }, 50);

    // Auto-remove after delay (except for success messages during redirect)
    if (type !== 'success' || !text.includes('logged in')) {
        setTimeout(() => {
            const messageContent = message.querySelector('div');
            messageContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 300);
        }, 1000);
    }
}