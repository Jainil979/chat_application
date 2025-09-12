// Form validation
const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitLoader = document.getElementById('submitLoader');
const successMessage = document.getElementById('successMessage');
const loginLink = document.getElementById('login_link');
const signupHeader = document.getElementById('signup_header');


// Get CSRF token from the cookie
function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
}
const csrftoken = getCookie('csrftoken');


// Password visibility toggle
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggleIcon = document.getElementById(fieldId + 'Toggle');

    if (field.type === 'password') {
        field.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}


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


// Real-time password strength checking
document.getElementById('password').addEventListener('input', function (e) {
    req = getPasswordRequirements(e.target.value);
    updateRequirementIcons(req);
});


// Form validation functions
function validateName(name) {
    return name.trim().length >= 2;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const reqs = getPasswordRequirements(password);

    const allPass = Object.values(reqs).every(v => v === true);
    return allPass;
}

function validatePasswordMatch(password, confirmPassword) {
    return password === confirmPassword;
}


function showError(fieldId, show = true) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (show) {
        errorElement.classList.remove('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}


document.getElementById('password').addEventListener('input', function (e) {
    showError('password', !validatePassword(e.target.value));
});


document.getElementById('confirmPassword').addEventListener('input', function (e) {
    pwd = document.getElementById('password').value;
    showError('confirmPassword', !validatePasswordMatch(pwd, e.target.value));
});



// Real-time validation
document.getElementById('name').addEventListener('blur', function (e) {
    showError('name', !validateName(e.target.value));
});

document.getElementById('email').addEventListener('blur', function (e) {
    showError('email', !validateEmail(e.target.value));
});

document.getElementById('password').addEventListener('blur', function (e) {
    showError('password', !validatePassword(e.target.value));
});

document.getElementById('confirmPassword').addEventListener('blur', function (e) {
    const password = document.getElementById('password').value;
    showError('confirmPassword', !validatePasswordMatch(password, e.target.value));
});


// Form submission
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(form);

    const data = {
        name: formData.get('name'),
        email: formData.get('email').toLowerCase(),
        password: formData.get('password'),
    };

    // Validate all fields
    let isValid = true;

    if (!validateName(data.name)) {
        showError('name', true);
        isValid = false;
    } else {
        showError('name', false);
    }

    if (!validateEmail(data.email)) {
        showError('email', true);
        isValid = false;
    } else {
        showError('email', false);
    }

    if (!validatePassword(data.password)) {
        showError('password', true);
        isValid = false;
    } else {
        showError('password', false);
    }

    if (!validatePasswordMatch(data.password, formData.get('confirmPassword'))) {
        showError('confirmPassword', true);
        isValid = false;
    } else {
        showError('confirmPassword', false);
    }

    if (!isValid) {
        return;
    }

    try {
        // show loading
        submitBtn.disabled = true;
        submitText.textContent = 'Creating Account ';
        submitLoader.classList.remove('hidden');

        // send to your DRF endpoint
        const resp = await fetch('/api/auth/signup/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            // success path
            form.classList.add('hidden');
            loginLink.classList.add('hidden');
            signupHeader.classList.add('hidden');
            successMessage.classList.remove('hidden');
            setTimeout(() => window.location = '/accounts/login/', 700);
        } else if (resp.status === 400) {
            // server‑side validation errors
            const errors = await resp.json();
            // for each field in your serializer, show its error container
            Object.entries(errors).forEach(([field, msgs]) => {
                const el = document.getElementById(field + 'Error');
                if (el) {
                    el.querySelector('span').textContent = msgs.join(' ');
                    el.classList.remove('hidden');
                }
            });
        } else {
            throw new Error('Unexpected response');
        }
    } catch (err) {
        alert('Signup failed—please try again.');
    } finally {
        // restore button
        submitBtn.disabled = false;
        submitText.textContent = 'Create Account';
        submitLoader.classList.add('hidden');
    }
});


// Add floating animation delay to form
setTimeout(() => {
    document.querySelector('.form-container').style.animationDelay = '0.2s';
}, 100);


// Prevent form submission on Enter in text fields (except submit button)
document.querySelectorAll('input').forEach(input => {
    if (input.type !== 'submit') {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = this.closest('.space-y-2').nextElementSibling?.querySelector('input');
                if (nextInput) {
                    nextInput.focus();
                }
            }
        });
    }
});
