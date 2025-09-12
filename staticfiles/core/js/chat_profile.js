
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfile = document.getElementById("closeProfile");
const profilePic = document.getElementById("profilePicture");
const profileInput = document.getElementById("profileImageInput");
const removeBtn = document.getElementById("removeProfileBtn");
const nameInput = profileModal.querySelector("input[type='text']");
const aboutTextarea = profileModal.querySelector("textarea");
const statusSelect = profileModal.querySelector("select.status-option");
const toggleInputs = Array.from(
    profileModal.querySelectorAll("input[type='checkbox']")
);

const saveBtn = profileModal.querySelector('button.bg-gradient-to-r');
const cancelBtn = profileModal.querySelector('button.border-gray-300');

let data = null;

// profileModal.addEventListener("click", () => {
//     profileModal.classList.add("hidden");
// });


// async function fetchProfileDetails() {
//     try {
//         const resp = await fetch('/chat/api/profile/', {
//             credentials: 'same-origin'
//         });

//         if (!resp.ok) throw new Error(resp.status);

//         const data = await resp.json();

//         console.log(data);

//         // 1) name
//         nameInput.value = data.name;

//         // 2) about_me
//         aboutTextarea.value = data.about_me || "";

//         // 3) presence
//         statusOpts.forEach(opt => {
//             if (opt.dataset.status === data.presence) {
//                 opt.classList.add("selected");
//             } else {
//                 opt.classList.remove("selected");
//             }
//         });

//         // 4) avatar
//         if (data.avatar) {
//             // set background
//             profilePic.style.backgroundImage = `url(${data.avatar})`;
//             profilePic.style.backgroundSize = "cover";
//             profilePic.style.backgroundPosition = "center";
//             // toggle controls
//             document.getElementById("cameraIcon").style.display = "none";
//             removeBtn.classList.remove("hidden");
//         } else {
//             profilePic.style.backgroundImage = "";
//             profilePic.style.backgroundSize = "";
//             profilePic.style.backgroundPosition = "";
//             document.getElementById("cameraIcon").style.display = "block";
//             removeBtn.classList.add("hidden");
//         }

//         // 5) toggles
//         toggles.forEach(t => {
//             const setting = t.dataset.setting;
//             let on;
//             switch (setting) {
//                 case "onlineStatus": on = data.show_online; break;
//                 case "lastSeen": on = data.show_last_seen; break;
//                 case "typingStatus": on = data.show_typing; break;
//                 default: on = false;
//             }
//             t.classList.toggle("active", !!on);
//         });

//         // clear any file input (we've already displayed current avatar)
//         profileInput.value = "";

//     } catch (err) {
//         console.error("Failed to load profile:", err);
//         // you might want to show an error toast here
//     }
// }


// async function fetchProfileDetails() {
//     try {
//         const resp = await fetch('/chat/api/profile/', {
//             credentials: 'same-origin'
//         });

//         if (!resp.ok) throw new Error(resp.status);
//         const data = await resp.json();

//         console.log(data);

//         return data;

//     } catch (err) {
//         console.error("Failed to load profile:", err);
//     }
// }


async function fetchProfileDetails() {
    const resp = await fetch('/chat/api/profile/', {
        credentials: 'same-origin'
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    return await resp.json();
}

fetchProfileDetails()
    .then(d => {
        data = d;
        updateProfileButton();
    })
    .catch(err => {
        console.error("Failed to load profile:", err);
    });


// console.log(data.name);
function updateProfileButton() {
    const btn = document.getElementById('profileBtn');
    const avatarDiv = btn.querySelector('div');         // the <div> around the <i>
    const nameSpan = btn.querySelector('span');        // the name

    // 1) Update name
    nameSpan.textContent = data.name || '';

    // 2) Swap avatar
    if (data.avatar) {
        // clear out any old classes / icon
        avatarDiv.innerHTML = '';
        avatarDiv.className = 'w-8 h-8 rounded-full overflow-hidden';

        // insert the real image
        const img = document.createElement('img');
        img.src = data.avatar;
        img.alt = data.name + ' avatar';
        img.className = 'object-cover w-full h-full';
        avatarDiv.appendChild(img);
    } else {
        // restore the gradient + icon
        avatarDiv.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
        avatarDiv.className = 'w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center';
    }
}



// Profile modal
profileBtn.addEventListener("click", () => {
    profileModal.classList.remove("hidden")
    // — Name & About —
    nameInput.value = data.name;
    aboutTextarea.value = data.about_me || "";

    // — Presence/status (map API -> select text) —
    const presenceMap = {
        available: "Available",
        busy: "Busy",
        do_not_disturb: "Do Not Disturb",
    };
    statusSelect.value = presenceMap[data.presence] || "Available";

    // — Avatar display —
    if (data.avatar) {
        profilePic.style.backgroundImage = `url(${data.avatar})`;
        profilePic.style.backgroundSize = "cover";
        profilePic.style.backgroundPosition = "center";
        document.getElementById("cameraIcon").style.display = "none";
        removeBtn.classList.remove("hidden");
    } else {
        profilePic.style.backgroundImage = "";
        profilePic.style.backgroundSize = "";
        profilePic.style.backgroundPosition = "";
        document.getElementById("cameraIcon").style.display = "block";
        removeBtn.classList.add("hidden");
    }
    profileInput.value = "";

    // — Notification toggles —
    // toggleInputs order must match HTML order:
    //   [0] Show online status  
    //   [1] Show last seen status  
    //   [2] Show typing status
    toggleInputs[0].checked = !!data.show_online;
    toggleInputs[1].checked = !!data.show_last_seen;
    toggleInputs[2].checked = !!data.show_typing;
});

closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));




// Cancel: just revert any changes and close
cancelBtn.addEventListener('click', () => {
    resetProfileForm();
    profileModal.classList.add('hidden');
});


// Save changes
saveBtn.addEventListener('click', async () => {
    // collect into FormData so we can send image if changed
    const fd = new FormData();

    fd.append('name', nameInput.value);
    fd.append('presence', statusSelect.value.toLowerCase().replace(/ /g, '_'));
    fd.append('about_me', aboutTextarea.value);
    fd.append('show_online', toggleInputs[0].checked);
    fd.append('show_last_seen', toggleInputs[1].checked);
    fd.append('show_typing', toggleInputs[2].checked);
    if (profileInput.files[0]) {
        fd.append('avatar', profileInput.files[0]);
    }


    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        const resp = await fetch('/chat/api/profile/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRFToken': csrftoken
            },
            body: fd
        });

        if (!resp.ok) throw resp;
        const updated = await resp.json();
        console.log(updated);
        // profileData = updated;           // update our local copy
        fetchProfileDetails()
            .then(d => {
                data = d;
                updateProfileButton();
            })
            .catch(err => {
                console.error("Failed to load profile:", err);
            });             // normalize the form to saved state

        profileModal.classList.add('hidden');
    } catch (err) {
        console.error('Profile save failed', err);
        alert('Failed to save profile — please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
});





function handleProfileImageChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const profilePicture = document.getElementById('profilePicture');
            const cameraIcon = document.getElementById('cameraIcon');
            const removeBtn = document.getElementById('removeProfileBtn');

            // Set the background image
            profilePicture.style.backgroundImage = `url(${e.target.result})`;
            profilePicture.style.backgroundSize = 'cover';
            profilePicture.style.backgroundPosition = 'center';

            // Hide camera icon and show remove button
            cameraIcon.style.display = 'none';
            removeBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function removeProfilePicture() {
    const profilePicture = document.getElementById('profilePicture');
    const cameraIcon = document.getElementById('cameraIcon');
    const removeBtn = document.getElementById('removeProfileBtn');
    const fileInput = document.getElementById('profileImageInput');

    // Reset to default state
    profilePicture.style.backgroundImage = '';
    profilePicture.style.backgroundSize = '';
    profilePicture.style.backgroundPosition = '';

    // Show camera icon and hide remove button
    cameraIcon.style.display = 'block';
    removeBtn.classList.add('hidden');

    // Clear file input
    fileInput.value = '';
}





// <script>
//     const profileBtn    = document.getElementById("profileBtn");
//     const profileModal  = document.getElementById("profileModal");
//     const closeProfile  = document.getElementById("closeProfile");
//     const profilePic    = document.getElementById("profilePicture");
//     const profileInput  = document.getElementById("profileImageInput");
//     const removeBtn     = document.getElementById("removeProfileBtn");
//     const nameInput     = document.querySelector("#profileModal input[type='text']");
//     const aboutTextarea = document.querySelector("#profileModal textarea");
//     const statusOpts    = document.querySelectorAll(".status-option");
//     const toggles       = document.querySelectorAll(".toggle-switch");

//   // Show modal + fetch profile
//   profileBtn.addEventListener("click", async () => {
//         profileModal.classList.remove("hidden");
//     try {
//       const resp = await fetch("/chat/api/profile/", {
//         credentials: "same‑origin"
//       });
//     if (!resp.ok) throw new Error(resp.status);
//     const data = await resp.json();

//     // 1) name
//     nameInput.value = data.name;

//     // 2) about_me
//     aboutTextarea.value = data.about_me || "";

//       // 3) presence
//       statusOpts.forEach(opt => {
//         if (opt.dataset.status === data.presence) {
//         opt.classList.add("selected");
//         } else {
//         opt.classList.remove("selected");
//         }
//       });

//     // 4) avatar
//     if (data.avatar) {
//         // set background
//         profilePic.style.backgroundImage = `url(${data.avatar})`;
//     profilePic.style.backgroundSize   = "cover";
//     profilePic.style.backgroundPosition = "center";
//     // toggle controls
//     document.getElementById("cameraIcon").style.display = "none";
//     removeBtn.classList.remove("hidden");
//       } else {
//         profilePic.style.backgroundImage = "";
//     profilePic.style.backgroundSize   = "";
//     profilePic.style.backgroundPosition = "";
//     document.getElementById("cameraIcon").style.display = "block";
//     removeBtn.classList.add("hidden");
//       }

//       // 5) toggles
//       toggles.forEach(t => {
//         const setting = t.dataset.setting;
//     let on;
//     switch (setting) {
//           case "onlineStatus":  on = data.show_online;    break;
//     case "lastSeen":      on = data.show_last_seen; break;
//     case "typingStatus":  on = data.show_typing;    break;
//     default: on = false;
//         }
//     t.classList.toggle("active", !!on);
//       });

//     // clear any file input (we've already displayed current avatar)
//     profileInput.value = "";

//     } catch (err) {
//         console.error("Failed to load profile:", err);
//       // you might want to show an error toast here
//     }
//   });

//   // Standard close handlers
//   closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));
//   profileModal.addEventListener("click", e => {
//     if (e.target === profileModal) profileModal.classList.add("hidden");
//   });
// </script>




// <script>
//     const profileBtn   = document.getElementById("profileBtn");
//     const profileModal = document.getElementById("profileModal");
//     const closeProfile = document.getElementById("closeProfile");
//     const profilePic   = document.getElementById("profilePicture");
//     const profileInput = document.getElementById("profileImageInput");
//     const removeBtn    = document.getElementById("removeProfileBtn");

//     // Single elements:
//     const nameInput    = profileModal.querySelector("input[type='text']");
//     const aboutTextarea= profileModal.querySelector("textarea");
//     const statusSelect = profileModal.querySelector("select.status-option");
//     const toggleInputs = Array.from(
//     profileModal.querySelectorAll("input[type='checkbox']")
//     ); // [0]=online, [1]=lastSeen, [2]=typing

//     async function fetchProfileDetails() {
//     try {
//       const resp = await fetch("/chat/api/profile/", {
//         credentials: "same‑origin",
//       });
//     if (!resp.ok) throw new Error(resp.status);
//     const data = await resp.json();

//     // — Name & About —
//     nameInput.value     = data.name;
//     aboutTextarea.value = data.about_me || "";

//     // — Presence/status (map API -> select text) —
//     const presenceMap = {
//         available:       "Available",
//     busy:            "Busy",
//     do_not_disturb:  "Do Not Disturb",
//       };
//     statusSelect.value = presenceMap[data.presence] || "Available";

//     // — Avatar display —
//     if (data.avatar) {
//         profilePic.style.backgroundImage = `url(${data.avatar})`;
//     profilePic.style.backgroundSize    = "cover";
//     profilePic.style.backgroundPosition= "center";
//     document.getElementById("cameraIcon").style.display = "none";
//     removeBtn.classList.remove("hidden");
//       } else {
//         profilePic.style.backgroundImage = "";
//     profilePic.style.backgroundSize    = "";
//     profilePic.style.backgroundPosition= "";
//     document.getElementById("cameraIcon").style.display = "block";
//     removeBtn.classList.add("hidden");
//       }
//     profileInput.value = "";

//     // — Notification toggles —
//     // toggleInputs order must match HTML order:
//     //   [0] Show online status
//     //   [1] Show last seen status
//     //   [2] Show typing status
//     toggleInputs[0].checked = !!data.show_online;
//     toggleInputs[1].checked = !!data.show_last_seen;
//     toggleInputs[2].checked = !!data.show_typing;

//     // finally reveal
//     profileModal.classList.remove("hidden");
//     } catch (err) {
//         console.error("Failed to load profile:", err);
//     }
//   }

//     // Open + fetch when you click the button
//     profileBtn.addEventListener("click", fetchProfileDetails);

//   // Close handlers
//   closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));
//   profileModal.addEventListener("click", e => {
//     if (e.target === profileModal) profileModal.classList.add("hidden");
//   });

//     // Re‑use your existing file‑picker handlers:
//     function handleProfileImageChange(event) {
//         /* ... */
//     }
//     function removeProfilePicture() {
//         /* ... */
//     }
// </script>



// assume this lives *below* your fetchProfileDetails() and updateProfileButton() logic

// let profileData = null;

// // kick things off
// (async () => {
//     profileData = await fetchProfileDetails();
//     updateProfileButton();
// })();

// const saveBtn = profileModal.querySelector('button.bg-gradient-to-r');
// const cancelBtn = profileModal.querySelector('button.border-gray-300');

// helper to reset form back to last-loaded profileData
// function resetProfileForm() {
//     if (!profileData) return;
//     // name
//     nameInput.value = profileData.name || '';
//     // about
//     aboutTextarea.value = profileData.about_me || '';
//     // presence
//     const presenceMap = {
//         available: "Available",
//         busy: "Busy",
//         do_not_disturb: "Do Not Disturb"
//     };
//     statusSelect.value = presenceMap[profileData.presence] || 'Available';
//     // avatar preview
//     if (profileData.avatar) {
//         profilePic.style.backgroundImage = `url(${profileData.avatar})`;
//         document.getElementById("cameraIcon").style.display = 'none';
//         removeBtn.classList.remove("hidden");
//     } else {
//         profilePic.style.backgroundImage = '';
//         document.getElementById("cameraIcon").style.display = 'block';
//         removeBtn.classList.add("hidden");
//     }
//     profileInput.value = '';
//     // toggles
//     toggleInputs[0].checked = !!profileData.show_online;
//     toggleInputs[1].checked = !!profileData.show_last_seen;
//     toggleInputs[2].checked = !!profileData.show_typing;
// }

// Cancel: just revert any changes and close
// cancelBtn.addEventListener('click', () => {
//     resetProfileForm();
//     profileModal.classList.add('hidden');
// });

// Save changes
// saveBtn.addEventListener('click', async () => {
//     // collect into FormData so we can send image if changed
//     const fd = new FormData();
//     fd.append('name', nameInput.value);
//     fd.append('presence', statusSelect.value.toLowerCase().replace(/ /g, '_'));
//     fd.append('about_me', aboutTextarea.value);
//     fd.append('show_online', toggleInputs[0].checked);
//     fd.append('show_last_seen', toggleInputs[1].checked);
//     fd.append('show_typing', toggleInputs[2].checked);
//     if (profileInput.files[0]) {
//         fd.append('avatar', profileInput.files[0]);
//     }

//     try {
//         saveBtn.disabled = true;
//         saveBtn.textContent = 'Saving…';

//         const resp = await fetch('/chat/api/profile/', {
//             method: 'POST',
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             },
//             body: fd
//         });
//         if (!resp.ok) throw resp;
//         const updated = await resp.json();
//         profileData = updated;           // update our local copy
//         updateProfileButton();           // refresh top‑bar avatar/name
//         resetProfileForm();              // normalize the form to saved state

//         profileModal.classList.add('hidden');
//     } catch (err) {
//         console.error('Profile save failed', err);
//         alert('Failed to save profile — please try again.');
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.textContent = 'Save Changes';
//     }
// });
