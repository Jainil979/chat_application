
// // Profile picture upload
// document.getElementById('profilePictureInput').addEventListener('change', function (e) {
//     const file = e.target.files[0];
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             const profileImage = document.getElementById('profileImage');
//             const profileIcon = document.getElementById('profileIcon');

//             profileImage.src = e.target.result;
//             profileImage.classList.remove('hidden');
//             profileIcon.classList.add('hidden');
//         };
//         reader.readAsDataURL(file);
//     }
// });



// // Status selection
// document.querySelectorAll('.status-option').forEach(option => {
//     option.addEventListener('click', function () {
//         document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
//         this.classList.add('selected');
//     });
// });


// // Set default status
// document.querySelector('.status-option[data-status="available"]').classList.add('selected');


// // Toggle switches
// document.querySelectorAll('.toggle-switch').forEach(toggle => {
//     toggle.addEventListener('click', function () {
//         this.classList.toggle('active');
//     });
// });


// // Character count for about section
// const aboutTextarea = document.getElementById('about');
// aboutTextarea.addEventListener('input', function () {
//     const maxLength = 150;
//     const currentLength = this.value.length;

//     if (currentLength > maxLength) {
//         this.value = this.value.substring(0, maxLength);
//     }
// });


// // Form submission
// document.getElementById('profileForm').addEventListener('submit', function (e) {
//     e.preventDefault();

//     // Get form data
//     const formData = {
//         fullName: document.getElementById('fullName').value,
//         status: document.querySelector('.status-option.selected').dataset.status,
//         about: document.getElementById('about').value,
//         notifications: {
//             onlineStatus: document.querySelector('[data-setting="onlineStatus"]').classList.contains('active'),
//             lastSeen: document.querySelector('[data-setting="lastSeen"]').classList.contains('active'),
//             typingStatus: document.querySelector('[data-setting="typingStatus"]').classList.contains('active')
//         }
//     };

//     // Show success message
//     document.getElementById('successMessage').classList.remove('hidden');

//     // Simulate redirect after 2 seconds
//     setTimeout(() => {
//         // In a real app, you would redirect to the dashboard
//         console.log('Profile data:', formData);
//         alert('In a real app, you would be redirected to the dashboard now.');
//     }, 2000);
// });

// // Reset form
// document.getElementById('resetButton').addEventListener('click', function () {
//     // Reset form fields
//     document.getElementById('fullName').value = '';
//     document.getElementById('about').value = '';

//     // Reset profile picture
//     const profileImage = document.getElementById('profileImage');
//     const profileIcon = document.getElementById('profileIcon');
//     profileImage.classList.add('hidden');
//     profileIcon.classList.remove('hidden');

//     // Reset status to available
//     document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
//     document.querySelector('.status-option[data-status="available"]').classList.add('selected');

//     // Reset all toggles to active
//     document.querySelectorAll('.toggle-switch').forEach(toggle => {
//         toggle.classList.add('active');
//     });

//     // Hide success message
//     document.getElementById('successMessage').classList.add('hidden');
// });





// static/chat/js/profile.js

// helper to read a named cookie (Django CSRF)
function getCookie(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? decodeURIComponent(match.pop()) : '';
}

const csrftoken = getCookie('csrftoken');

// --- ELEMENT REFERENCES ---
const form = document.getElementById('profileForm');
const fullNameInput = document.getElementById('fullName');
const avatarInput = document.getElementById('profilePictureInput');
const avatarImg = document.getElementById('profileImage');
const avatarIcon = document.getElementById('profileIcon');
const statusOptions = document.querySelectorAll('.status-option');
const aboutTextarea = document.getElementById('about');
const toggleOnline = document.querySelector('[data-setting="onlineStatus"]');
const toggleLastSeen = document.querySelector('[data-setting="lastSeen"]');
const toggleTyping = document.querySelector('[data-setting="typingStatus"]');
const successMessage = document.getElementById('successMessage');

// --- PREFILL ON LOAD ---
// async function loadProfile() {
//   try {
//     const resp = await fetch('/api/profile/', {
//       credentials: 'same‑origin',
//       headers: { 'X-CSRFToken': csrftoken }
//     });
//     if (!resp.ok) throw resp;
//     const data = await resp.json();

//     // name
//     fullNameInput.value = data.name || '';

//     // avatar
//     if (data.avatar) {
//       avatarImg.src = data.avatar;
//       avatarImg.classList.remove('hidden');
//       avatarIcon.classList.add('hidden');
//     }

//     // presence/status
//     statusOptions.forEach(opt => {
//       opt.classList.toggle('selected', opt.dataset.status === data.presence);
//     });

//     // about_me
//     aboutTextarea.value = data.about_me || '';

//     // toggles
//     toggleOnline.classList.toggle('active', !!data.show_online);
//     toggleLastSeen.classList.toggle('active', !!data.show_last_seen);
//     toggleTyping.classList.toggle('active', !!data.show_typing);

//   } catch (err) {
//     console.error('Failed to load profile:', err);
//     alert('Could not load your profile. Please refresh.');
//   }
// }


// --- AVATAR PREVIEW ---
avatarInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        avatarImg.src = ev.target.result;
        avatarImg.classList.remove('hidden');
        avatarIcon.classList.add('hidden');
    };
    reader.readAsDataURL(file);
});



// --- STATUS SELECTION ---
statusOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        statusOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
    });
});


// Set default status
document.querySelector('.status-option[data-status="available"]').classList.add('selected');


// --- ABOUT CHAR COUNT (max 150) ---
aboutTextarea.addEventListener('input', () => {
    const max = 150;
    if (aboutTextarea.value.length > max) {
        aboutTextarea.value = aboutTextarea.value.slice(0, max);
    }
});


// --- TOGGLE SWITCHES ---
[toggleOnline, toggleLastSeen, toggleTyping].forEach(tog =>
    tog.addEventListener('click', () => tog.classList.toggle('active'))
);


// Validate Name
function validateName(name) {
    return name.trim().length >= 2;
}

function validateAbout(about) {
    return about.length > 1;
}


// Show Error
function showError(fieldId, show = true) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (show) {
        errorElement.classList.remove('hidden');
    } else {
        errorElement.classList.add('hidden');
    }
}


// --- FORM SUBMIT ---
form.addEventListener('submit', async e => {
    e.preventDefault();

    if(!validateName(fullNameInput.value.trim()))
    {
        showError('fullName' , true);
        return;
    }

    if(!validateAbout(aboutTextarea.value.trim()))
    {
        showError('about' , true);
        return;
    }

    // clear previous errors
    // document.querySelectorAll('.text-red-500.text-sm').forEach(el => el.remove());
    showError('fullName' , false);
    showError('about' , false);

    const fd = new FormData();

    // 1) avatar file
    if (avatarInput.files.length) {
        fd.append('avatar', avatarInput.files[0]);
    }
    // 2) name
    fd.append('name', fullNameInput.value.trim());
    // 3) presence
    const pres = document.querySelector('.status-option.selected')?.dataset.status;
    fd.append('presence', pres || 'available');
    // 4) about_me
    fd.append('about_me', aboutTextarea.value.trim());
    // 5) toggles
    fd.append('show_online', toggleOnline.classList.contains('active'));
    fd.append('show_last_seen', toggleLastSeen.classList.contains('active'));
    fd.append('show_typing', toggleTyping.classList.contains('active'));

    try {

        const resp = await fetch('/chat/api/profile/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRFToken': csrftoken },
            body: fd
        });

        if (resp.ok) {
            successMessage.classList.remove('hidden');
            setTimeout(() => location.href = '/chats/', 1500);
            return;
        }
        if (resp.status === 400) {
            const errors = await resp.json();
            // field‑level errors
            Object.entries(errors).forEach(([field, msgs]) => {
                const msg = Array.isArray(msgs) ? msgs.join(' ') : msgs;
                let ref;
                switch (field) {
                    case 'name': ref = fullNameInput; break;
                    case 'avatar': ref = avatarInput; break;
                    case 'presence': ref = document.querySelector('.status-option.selected'); break;
                    case 'about_me': ref = aboutTextarea; break;
                    case 'show_online': ref = toggleOnline; break;
                    case 'show_last_seen': ref = toggleLastSeen; break;
                    case 'show_typing': ref = toggleTyping; break;
                }
                if (ref) {
                    const errp = document.createElement('p');
                    errp.className = 'text-red-500 field-error mt-1 text-sm';
                    errp.textContent = msg;
                    ref.closest('div').appendChild(errp);
                }
            });
            return;
        }
        throw new Error(`Unexpected ${resp.status}`);
    } catch (err) {
        console.error('Profile save error:', err);
        alert('Could not save profile. Try again.');
    }
});

// --- INITIALIZE ---
// document.addEventListener('DOMContentLoaded', loadProfile);
