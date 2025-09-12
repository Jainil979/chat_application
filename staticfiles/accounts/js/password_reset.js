// Toggle visibility of a password field
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = document.getElementById(fieldId + 'Toggle');
    if (field.type === 'password') {
        field.type = 'text';
        toggle.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        field.type = 'password';
        toggle.classList.replace('fa-eye-slash', 'fa-eye');
    }
}


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


// Returns an object with each requirement's boolean state
function getPasswordRequirements(password) {
    return {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
}

// Update the little icons beside each requirement
function updateRequirementIcons(requirements) {
    Object.entries(requirements).forEach(([key, passed]) => {
        const icon = document.getElementById(`req-${key}`);
        if (passed) {
            icon.classList.replace('fa-times', 'fa-check');
            icon.classList.replace('text-red-500', 'text-green-500');
        } else {
            icon.classList.replace('fa-check', 'fa-times');
            icon.classList.replace('text-green-500', 'text-red-500');
        }
    });
}

// Validate both fields, show/hide errors, and return overall validity
function validatePasswords() {
    const pwd = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;

    const passwordErrorElm = document.getElementById('passwordError');
    const confirmPasswordErrorElm = document.getElementById('confirmPasswordError');
    let valid = false;

    // 1. Requirements
    const reqs = getPasswordRequirements(pwd);
    updateRequirementIcons(reqs);

    const allPass = Object.values(reqs).every(v => v === true);
    if (!allPass) {
        passwordErrorElm.classList.remove('hidden');
    } else {
        passwordErrorElm.classList.add('hidden');
    }

    if (!conf) {
        confirmPasswordErrorElm.classList.remove('hidden');
    }

    // 2. Match
    if (conf && pwd) {
        if (conf == pwd) {
            confirmPasswordErrorElm.classList.add('hidden');
            valid = true;
        }
        else {
            confirmPasswordErrorElm.classList.remove('hidden');
            valid = false;
        }
    }

    return valid;
}

// Handle the form submission
document
    .getElementById('resetPasswordForm')
    .addEventListener('submit', async function (e) {
        e.preventDefault();
        // run our validations
        if (!validatePasswords()) return;

        const uidb64 = document.getElementById('uidb64').value;
        const token = document.getElementById('token').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // all good → show loading state
        const btn = e.target.querySelector('button[type="submit"]');
        const txt = document.getElementById('submitText');
        const icon = document.getElementById('submitIcon');
        const spinner = document.getElementById('submitSpinner');
        const formElm = document.getElementById('resetPasswordForm');
        const success = document.getElementById('successMessage');

        btn.disabled = true;
        txt.textContent = 'Resetting...';
        icon.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            // 5) Call our real API
            const resp = await fetch('/api/auth/password_reset_confirm/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ uidb64, token, newPassword , confirmPassword })
            });

            if (resp.ok) {
                // 6a) Success → show success UI & redirect
                formElm.classList.add('hidden');
                success.classList.remove('hidden');
                setTimeout(() => window.location.href = '/accounts/login', 1000);
            } else if (resp.status === 400) {
                // 6b) Validation errors → show them
                const errors = await resp.json();
                // flatten and alert
                const messages = Object.values(errors).flat().join('\n');
                alert(messages);
                throw new Error(messages);
            } else {
                throw new Error('Unexpected response status: ' + resp.status);
            }
        } catch (err) {
            console.error(err);
            alert('Unable to reset password. Please try again.');
        } finally {
            // 7) Restore button state
            btn.disabled = false;
            txt.textContent = 'Reset Password';
            icon.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

// Live‑update as the user types
document.getElementById('newPassword')
    .addEventListener('input', () => validatePasswords());

document.getElementById('confirmPassword')
    .addEventListener('input', () => validatePasswords());
