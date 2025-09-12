// Email validation function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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


document
    .getElementById('forgotPasswordForm')
    .addEventListener('submit', async function (e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        const emailError = document.getElementById('emailError');
        const submitBtn = this.querySelector('button[type="submit"]');
        const submitText = document.getElementById('submitText');
        const submitIcon = document.getElementById('submitIcon');
        const submitSpin = document.getElementById('submitSpinner');
        const successMsg = document.getElementById('successMessage');

        // reset UI
        emailError.classList.add('hidden');
        emailInput.classList.remove('border-red-500');

        // simple front‑end email check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.querySelector('span').textContent = 'Please enter a valid email';
            emailError.classList.remove('hidden');
            emailInput.classList.add('border-red-500');
            return;
        }

        // show loading
        submitBtn.disabled = true;
        submitText.textContent = 'Sending…';
        submitIcon.classList.add('hidden');
        submitSpin.classList.remove('hidden');

        // call our DRF endpoint
        const resp = await fetch('/api/auth/forgot_password/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ email })
        });

        if (resp.ok) {
            // success!
            this.classList.add('hidden');
            successMsg.classList.remove('hidden');
        } else if (resp.status === 400) {
            const errors = await resp.json();
            // serializer returns { email: [...] }
            const msg = errors.email?.join(' ') || 'Unable to send reset link';
            emailError.querySelector('span').textContent = msg;
            emailError.classList.remove('hidden');
            emailInput.classList.add('border-red-500');
        } else {
            alert('Unexpected error; please try again later.');
        }

        // restore button state
        submitBtn.disabled = false;
        submitText.textContent = 'Send Reset Link';
        submitIcon.classList.remove('hidden');
        submitSpin.classList.add('hidden');
    });


// Real-time email validation
document.getElementById('email').addEventListener('input', function (e) {
    const email = e.target.value.trim();
    const emailError = document.getElementById('emailError');

    if (email && !validateEmail(email)) {
        emailError.classList.remove('hidden');
        e.target.classList.add('border-red-500');
    } else {
        emailError.classList.add('hidden');
        e.target.classList.remove('border-red-500');
    }
});