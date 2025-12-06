// // Get CSRF token
// function getCookie(name) {
//     const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
//     return match ? decodeURIComponent(match.pop()) : '';
// }
// const csrftoken = getCookie('csrftoken');




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
        // console.log(data);
        updateProfileButton(data);
    })
    .catch(err => {
        console.error("Failed to load profile:", err);
    });



// console.log(data.name);
function updateProfileButton(data) {
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
    // const presenceMap = {
    //     available: "Available",
    //     busy: "Busy",
    //     do_not_disturb: "Do Not Disturb",
    // };
    // statusSelect.value = presenceMap[data.presence] || "Available";

    console.log("hello");
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

    
    toggleInputs[0].checked = !!data.show_online;
    toggleInputs[1].checked = !!data.show_last_seen;
    // toggleInputs[2].checked = !!data.show_typing;
});

closeProfile.addEventListener("click", () => profileModal.classList.add("hidden"));




// Cancel: just revert any changes and close
// cancelBtn.addEventListener('click', () => {
//     resetProfileForm();
//     profileModal.classList.add('hidden');
// });


// Save changes
saveBtn.addEventListener('click', async () => {
    // collect into FormData so we can send image if changed
    const fd = new FormData();

    fd.append('name', nameInput.value);
    // fd.append('presence', statusSelect.value.toLowerCase().replace(/ /g, '_'));
    fd.append('about_me', aboutTextarea.value);
    fd.append('show_online', toggleInputs[0].checked);
    fd.append('show_last_seen', toggleInputs[1].checked);
    // fd.append('show_typing', toggleInputs[2].checked);
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
                updateProfileButton(data);
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


















// // Get CSRF token
// function getCookie(name) {
//     const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
//     return match ? decodeURIComponent(match.pop()) : '';
// }
// const csrftoken = getCookie('csrftoken');

// // Element references
// const profileBtn = document.getElementById("profileBtn");
// const profileModal = document.getElementById("profileModal");
// const closeProfile = document.getElementById("closeProfile");
// const profilePic = document.getElementById("profilePicture");
// const profileInput = document.getElementById("profileImageInput");
// const removeBtn = document.getElementById("removeProfileBtn");

// // Form elements
// const nameInput = document.getElementById("profileNameInput");
// const aboutTextarea = document.getElementById("profileAboutTextarea");
// const showOnlineToggle = document.getElementById("profileShowOnlineToggle");
// const showLastSeenToggle = document.getElementById("profileShowLastSeenToggle");

// // Buttons
// const saveBtn = document.getElementById("profileSaveBtn");
// const resetBtn = document.getElementById("profileResetBtn");

// // Modal references
// const successModal = document.getElementById("successModal");
// const errorModal = document.getElementById("errorModal");
// const successMessageText = document.getElementById("successMessageText");
// const errorMessageText = document.getElementById("errorMessageText");
// const errorDetails = document.getElementById("errorDetails");

// // Store original data for reset functionality
// let originalData = null;
// let currentData = null;

// // Load profile data
// async function fetchProfileDetails() {
//     try {
//         const resp = await fetch('/chat/api/profile/', {
//             credentials: 'same-origin'
//         });

//         if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

//         const data = await resp.json();
//         return data;
//     } catch (err) {
//         console.error("Failed to load profile:", err);
//         showError("Failed to load profile data. Please refresh the page.");
//         throw err;
//     }
// }

// // Update profile button in header
// function updateProfileButton() {
//     const btn = document.getElementById('profileBtn');
//     const avatarDiv = btn.querySelector('div');
//     const nameSpan = btn.querySelector('span');

//     // Update name
//     if (currentData && currentData.name) {
//         nameSpan.textContent = currentData.name;
//     }

//     // Update avatar
//     if (currentData && currentData.avatar) {
//         avatarDiv.innerHTML = '';
//         avatarDiv.className = 'w-8 h-8 rounded-full overflow-hidden';
        
//         const img = document.createElement('img');
//         img.src = currentData.avatar;
//         img.alt = 'Profile Avatar';
//         img.className = 'object-cover w-full h-full';
//         avatarDiv.appendChild(img);
//     } else {
//         avatarDiv.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
//         avatarDiv.className = 'w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center';
//     }
// }

// // Show success modal
// function showSuccess(message = "Profile updated successfully!") {
//     successMessageText.textContent = message;
//     successModal.classList.remove("hidden");
// }

// // Close success modal
// function closeSuccessModal() {
//     successModal.classList.add("hidden");
// }

// // Show error modal
// function showError(message = "Failed to update profile. Please try again.", details = "") {
//     errorMessageText.textContent = message;
//     if (details) {
//         errorDetails.textContent = `Details: ${details}`;
//         errorDetails.classList.remove("hidden");
//     } else {
//         errorDetails.classList.add("hidden");
//     }
//     errorModal.classList.remove("hidden");
// }

// // Close error modal
// function closeErrorModal() {
//     errorModal.classList.add("hidden");
// }

// // Reset form to original data
// function resetForm() {
//     if (!originalData) return;
    
//     nameInput.value = originalData.name || "";
//     aboutTextarea.value = originalData.about_me || "";
    
//     // Update avatar display
//     if (originalData.avatar) {
//         profilePic.style.backgroundImage = `url(${originalData.avatar})`;
//         profilePic.style.backgroundSize = 'cover';
//         profilePic.style.backgroundPosition = 'center';
//         document.getElementById("cameraIcon").style.display = 'none';
//         removeBtn.classList.remove("hidden");
//     } else {
//         profilePic.style.backgroundImage = '';
//         profilePic.style.backgroundSize = '';
//         profilePic.style.backgroundPosition = '';
//         document.getElementById("cameraIcon").style.display = 'block';
//         removeBtn.classList.add("hidden");
//     }
    
//     // Clear file input
//     profileInput.value = '';
    
//     // Update toggles
//     showOnlineToggle.checked = !!originalData.show_online;
//     showLastSeenToggle.checked = !!originalData.show_last_seen;
// }

// // Handle profile image change
// function handleProfileImageChange(event) {
//     const file = event.target.files[0];
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             profilePic.style.backgroundImage = `url(${e.target.result})`;
//             profilePic.style.backgroundSize = 'cover';
//             profilePic.style.backgroundPosition = 'center';
//             document.getElementById("cameraIcon").style.display = 'none';
//             removeBtn.classList.remove("hidden");
//         };
//         reader.readAsDataURL(file);
//     }
// }

// // Remove profile picture
// function removeProfilePicture() {
//     profilePic.style.backgroundImage = '';
//     profilePic.style.backgroundSize = '';
//     profilePic.style.backgroundPosition = '';
//     document.getElementById("cameraIcon").style.display = 'block';
//     removeBtn.classList.add("hidden");
//     profileInput.value = '';
// }

// // Validate form data
// function validateFormData() {
//     const errors = [];
    
//     if (!nameInput.value.trim()) {
//         errors.push("Full name is required");
//     }
    
//     if (aboutTextarea.value.length > 500) {
//         errors.push("About me should be less than 500 characters");
//     }
    
//     return errors;
// }

// // Open profile modal
// profileBtn.addEventListener("click", async () => {
//     try {
//         // Show loading state on save button
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        
//         // Fetch fresh data
//         currentData = await fetchProfileDetails();
//         originalData = JSON.parse(JSON.stringify(currentData)); // Deep copy for reset
        
//         // Populate form
//         nameInput.value = currentData.name || "";
//         aboutTextarea.value = currentData.about_me || "";
        
//         // Update avatar display
//         if (currentData.avatar) {
//             profilePic.style.backgroundImage = `url(${currentData.avatar})`;
//             profilePic.style.backgroundSize = 'cover';
//             profilePic.style.backgroundPosition = 'center';
//             document.getElementById("cameraIcon").style.display = 'none';
//             removeBtn.classList.remove("hidden");
//         } else {
//             profilePic.style.backgroundImage = '';
//             profilePic.style.backgroundSize = '';
//             profilePic.style.backgroundPosition = '';
//             document.getElementById("cameraIcon").style.display = 'block';
//             removeBtn.classList.add("hidden");
//         }
        
//         // Clear file input
//         profileInput.value = '';
        
//         // Update toggles
//         showOnlineToggle.checked = !!currentData.show_online;
//         showLastSeenToggle.checked = !!currentData.show_last_seen;
        
//         // Show modal
//         profileModal.classList.remove("hidden");
        
//     } catch (error) {
//         console.error("Error loading profile:", error);
//         showError("Failed to load profile data");
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// });

// // Close profile modal
// closeProfile.addEventListener("click", () => {
//     profileModal.classList.add("hidden");
// });

// // Close modal when clicking outside
// profileModal.addEventListener("click", (e) => {
//     if (e.target === profileModal) {
//         profileModal.classList.add("hidden");
//     }
// });

// // Reset button
// resetBtn.addEventListener("click", () => {
//     resetForm();
// });

// // Save button
// saveBtn.addEventListener("click", async () => {
//     // Validate form
//     const errors = validateFormData();
//     if (errors.length > 0) {
//         showError(errors.join(", "));
//         return;
//     }
    
//     // Prepare form data
//     const formData = new FormData();
//     formData.append('name', nameInput.value.trim());
//     formData.append('about_me', aboutTextarea.value.trim());
//     formData.append('show_online', showOnlineToggle.checked);
//     formData.append('show_last_seen', showLastSeenToggle.checked);
    
//     // Add avatar if changed
//     if (profileInput.files[0]) {
//         formData.append('avatar', profileInput.files[0]);
//     }
    
//     try {
//         // Show loading state
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        
//         // Send request
//         const response = await fetch('/chat/api/profile/', {
//             method: 'POST',
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             },
//             body: formData
//         });
        
//         if (!response.ok) {
//             let errorMessage = `HTTP ${response.status}`;
//             try {
//                 const errorData = await response.json();
//                 errorMessage = errorData.detail || JSON.stringify(errorData);
//             } catch (e) {
//                 // If response is not JSON, use status text
//                 errorMessage = response.statusText;
//             }
//             throw new Error(errorMessage);
//         }
        
//         const updatedData = await response.json();
        
//         // Update current data
//         currentData = updatedData;
//         originalData = JSON.parse(JSON.stringify(updatedData));
        
//         // Update profile button in header
//         updateProfileButton();
        
//         // Close modal and show success message
//         setTimeout(() => {
//             profileModal.classList.add("hidden");
//             showSuccess("Profile updated successfully!");
//         }, 300);
        
//     } catch (error) {
//         console.error('Profile save failed:', error);
//         showError("Failed to save profile", error.message);
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// });

// // Handle profile image change
// profileInput.addEventListener('change', handleProfileImageChange);

// // Remove profile picture
// removeBtn.addEventListener('click', (e) => {
//     e.stopPropagation();
//     removeProfilePicture();
// });

// // Close modals when clicking outside
// window.addEventListener('click', (e) => {
//     if (e.target === successModal) {
//         closeSuccessModal();
//     }
//     if (e.target === errorModal) {
//         closeErrorModal();
//     }
// });

// // Close modals with Escape key
// document.addEventListener('keydown', (e) => {
//     if (e.key === 'Escape') {
//         if (!profileModal.classList.contains('hidden')) {
//             profileModal.classList.add('hidden');
//         }
//         if (!successModal.classList.contains('hidden')) {
//             closeSuccessModal();
//         }
//         if (!errorModal.classList.contains('hidden')) {
//             closeErrorModal();
//         }
//     }
// });

// // Initial load
// document.addEventListener('DOMContentLoaded', async () => {
//     try {
//         currentData = await fetchProfileDetails();
//         updateProfileButton();
//     } catch (error) {
//         console.error('Initial profile load failed:', error);
//     }
// });













// // Get CSRF token
// function getCookie(name) {
//     const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
//     return match ? decodeURIComponent(match.pop()) : '';
// }
// const csrftoken = getCookie('csrftoken');

// // Element references
// const profileBtn = document.getElementById("profileBtn");
// const profileModal = document.getElementById("profileModal");
// const closeProfile = document.getElementById("closeProfile");
// const profilePic = document.getElementById("profilePicture");
// const profileInput = document.getElementById("profileImageInput");
// const removeBtn = document.getElementById("removeProfileBtn");

// // Form elements
// const nameInput = document.getElementById("profileNameInput");
// const aboutTextarea = document.getElementById("profileAboutTextarea");
// const showOnlineToggle = document.getElementById("profileShowOnlineToggle");
// const showLastSeenToggle = document.getElementById("profileShowLastSeenToggle");

// // Buttons
// const saveBtn = document.getElementById("profileSaveBtn");
// const resetBtn = document.getElementById("profileResetBtn");

// // Modal references
// const successModal = document.getElementById("successModal");
// const errorModal = document.getElementById("errorModal");
// const successMessageText = document.getElementById("successMessageText");
// const errorMessageText = document.getElementById("errorMessageText");
// const errorDetails = document.getElementById("errorDetails");

// // Store original data for reset functionality
// let originalData = null;
// let currentData = null;

// // Load profile data
// async function fetchProfileDetails() {
//     try {
//         const resp = await fetch('/chat/api/profile/', {
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             }
//         });

//         if (!resp.ok) {
//             throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
//         }

//         const data = await resp.json();
//         console.log('Fetched profile data:', data);
//         return data;
//     } catch (err) {
//         console.error("Failed to load profile:", err);
//         showError("Failed to load profile data. Please refresh the page.");
//         throw err;
//     }
// }

// // Update profile button in header
// function updateProfileButton() {
//     const btn = document.getElementById('profileBtn');
//     const avatarDiv = btn.querySelector('div');
//     const nameSpan = btn.querySelector('span');

//     // Update name
//     if (currentData && currentData.name) {
//         nameSpan.textContent = currentData.name;
//     }

//     // Update avatar
//     if (currentData && currentData.avatar_url) {
//         avatarDiv.innerHTML = '';
//         avatarDiv.className = 'w-8 h-8 rounded-full overflow-hidden';
        
//         const img = document.createElement('img');
//         img.src = currentData.avatar_url;
//         img.alt = 'Profile Avatar';
//         img.className = 'object-cover w-full h-full';
//         avatarDiv.appendChild(img);
//     } else {
//         avatarDiv.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
//         avatarDiv.className = 'w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center';
//     }
// }

// // Populate form with data
// function populateForm(data) {
//     console.log('Populating form with data:', data);
    
//     // Name
//     nameInput.value = data.name || "";
    
//     // About
//     aboutTextarea.value = data.about_me || "";
    
//     // Toggles
//     showOnlineToggle.checked = data.show_online !== false; // Default to true
//     showLastSeenToggle.checked = data.show_last_seen !== false; // Default to true
    
//     // Avatar
//     if (data.avatar_url) {
//         console.log('Setting avatar:', data.avatar_url);
//         profilePic.style.backgroundImage = `url(${data.avatar_url})`;
//         profilePic.style.backgroundSize = 'cover';
//         profilePic.style.backgroundPosition = 'center';
//         document.getElementById("cameraIcon").style.display = 'none';
//         removeBtn.classList.remove("hidden");
//     } else {
//         profilePic.style.backgroundImage = '';
//         profilePic.style.backgroundSize = '';
//         profilePic.style.backgroundPosition = '';
//         document.getElementById("cameraIcon").style.display = 'block';
//         removeBtn.classList.add("hidden");
//     }
    
//     // Clear file input
//     profileInput.value = '';
// }

// // Show success modal
// function showSuccess(message = "Profile updated successfully!") {
//     successMessageText.textContent = message;
//     successModal.classList.remove("hidden");
// }

// // Close success modal
// function closeSuccessModal() {
//     successModal.classList.add("hidden");
// }

// // Show error modal
// function showError(message = "Failed to update profile. Please try again.", details = "") {
//     errorMessageText.textContent = message;
//     if (details) {
//         errorDetails.textContent = `Details: ${details}`;
//         errorDetails.classList.remove("hidden");
//     } else {
//         errorDetails.classList.add("hidden");
//     }
//     errorModal.classList.remove("hidden");
// }

// // Close error modal
// function closeErrorModal() {
//     errorModal.classList.add("hidden");
// }

// // Reset form to original data
// function resetForm() {
//     if (!originalData) {
//         console.error('No original data to reset to');
//         return;
//     }
    
//     console.log('Resetting form to original data:', originalData);
//     populateForm(originalData);
// }

// // Handle profile image change
// function handleProfileImageChange(event) {
//     const file = event.target.files[0];
//     if (file) {
//         // Validate file size (max 5MB)
//         if (file.size > 5 * 1024 * 1024) {
//             showError("File size too large. Maximum size is 5MB.");
//             event.target.value = '';
//             return;
//         }
        
//         // Validate file type
//         const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
//         if (!validTypes.includes(file.type)) {
//             showError("Invalid file type. Please upload JPEG, PNG, or GIF images.");
//             event.target.value = '';
//             return;
//         }
        
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             profilePic.style.backgroundImage = `url(${e.target.result})`;
//             profilePic.style.backgroundSize = 'cover';
//             profilePic.style.backgroundPosition = 'center';
//             document.getElementById("cameraIcon").style.display = 'none';
//             removeBtn.classList.remove("hidden");
//         };
//         reader.readAsDataURL(file);
//     }
// }

// // Remove profile picture
// function removeProfilePicture() {
//     profilePic.style.backgroundImage = '';
//     profilePic.style.backgroundSize = '';
//     profilePic.style.backgroundPosition = '';
//     document.getElementById("cameraIcon").style.display = 'block';
//     removeBtn.classList.add("hidden");
//     profileInput.value = '';
// }

// // Validate form data
// function validateFormData() {
//     const errors = [];
    
//     if (!nameInput.value.trim()) {
//         errors.push("Full name is required");
//     }
    
//     if (nameInput.value.trim().length < 2) {
//         errors.push("Full name must be at least 2 characters");
//     }
    
//     if (aboutTextarea.value.length > 500) {
//         errors.push("About me should be less than 500 characters");
//     }
    
//     return errors;
// }

// // Open profile modal
// async function openProfileModal() {
//     try {
//         console.log('Opening profile modal...');
        
//         // Show modal immediately for better UX
//         profileModal.classList.remove("hidden");
        
//         // Show loading state
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        
//         // Fetch fresh data
//         const data = await fetchProfileDetails();
//         currentData = data;
//         originalData = JSON.parse(JSON.stringify(data)); // Deep copy for reset
        
//         console.log('Data loaded:', data);
        
//         // Populate form
//         populateForm(data);
        
//     } catch (error) {
//         console.error("Error loading profile:", error);
//         showError("Failed to load profile data");
//         // Close modal on error
//         profileModal.classList.add("hidden");
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// }

// // Save profile
// async function saveProfile() {
//     // Validate form
//     const errors = validateFormData();
//     if (errors.length > 0) {
//         showError(errors.join(", "));
//         return;
//     }
    
//     // Prepare form data
//     const formData = new FormData();
//     formData.append('name', nameInput.value.trim());
//     formData.append('about_me', aboutTextarea.value.trim());
//     formData.append('show_online', showOnlineToggle.checked);
//     formData.append('show_last_seen', showLastSeenToggle.checked);
    
//     // Add avatar if changed
//     if (profileInput.files[0]) {
//         formData.append('avatar', profileInput.files[0]);
//     } else if (profilePic.style.backgroundImage === '' && originalData.avatar_url) {
//         // If user removed the avatar
//         formData.append('avatar', ''); // Empty string to remove avatar
//     }
    
//     try {
//         // Show loading state
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        
//         console.log('Saving profile data...');
        
//         // Send request
//         const response = await fetch('/chat/api/profile/', {
//             method: 'POST',
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             },
//             body: formData
//         });
        
//         if (!response.ok) {
//             let errorMessage = `HTTP ${response.status}`;
//             try {
//                 const errorData = await response.json();
//                 console.error('Server error response:', errorData);
                
//                 // Handle field-specific errors
//                 if (errorData.name) {
//                     errorMessage = `Name: ${Array.isArray(errorData.name) ? errorData.name[0] : errorData.name}`;
//                 } else if (errorData.avatar) {
//                     errorMessage = `Avatar: ${Array.isArray(errorData.avatar) ? errorData.avatar[0] : errorData.avatar}`;
//                 } else if (errorData.detail) {
//                     errorMessage = errorData.detail;
//                 } else if (typeof errorData === 'object') {
//                     errorMessage = JSON.stringify(errorData);
//                 }
//             } catch (e) {
//                 errorMessage = response.statusText || 'Unknown error';
//             }
//             throw new Error(errorMessage);
//         }
        
//         const updatedData = await response.json();
//         console.log('Profile saved successfully:', updatedData);
        
//         // Update current data
//         currentData = updatedData;
//         originalData = JSON.parse(JSON.stringify(updatedData));
        
//         // Update profile button in header
//         updateProfileButton();
        
//         // Repopulate form with updated data
//         populateForm(updatedData);
        
//         // Show success message
//         showSuccess("Profile updated successfully!");
        
//     } catch (error) {
//         console.error('Profile save failed:', error);
//         showError("Failed to save profile", error.message);
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// }

// // Event Listeners
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('DOM loaded, setting up event listeners...');
    
//     // Profile button click
//     if (profileBtn) {
//         profileBtn.addEventListener("click", openProfileModal);
//     } else {
//         console.error('Profile button not found!');
//     }
    
//     // Close profile modal
//     if (closeProfile) {
//         closeProfile.addEventListener("click", () => {
//             profileModal.classList.add("hidden");
//         });
//     }
    
//     // Save button
//     if (saveBtn) {
//         saveBtn.addEventListener("click", saveProfile);
//     }
    
//     // Reset button
//     if (resetBtn) {
//         resetBtn.addEventListener("click", resetForm);
//     }
    
//     // Profile image input change
//     if (profileInput) {
//         profileInput.addEventListener('change', handleProfileImageChange);
//     }
    
//     // Remove profile picture button
//     if (removeBtn) {
//         removeBtn.addEventListener('click', function(e) {
//             e.stopPropagation();
//             removeProfilePicture();
//         });
//     }
    
//     // Click outside to close modals
//     window.addEventListener('click', (e) => {
//         if (e.target === profileModal) {
//             profileModal.classList.add("hidden");
//         }
//         if (e.target === successModal) {
//             closeSuccessModal();
//         }
//         if (e.target === errorModal) {
//             closeErrorModal();
//         }
//     });
    
//     // Escape key to close modals
//     document.addEventListener('keydown', (e) => {
//         if (e.key === 'Escape') {
//             if (!profileModal.classList.contains('hidden')) {
//                 profileModal.classList.add('hidden');
//             }
//             if (!successModal.classList.contains('hidden')) {
//                 closeSuccessModal();
//             }
//             if (!errorModal.classList.contains('hidden')) {
//                 closeErrorModal();
//             }
//         }
//     });
    
//     // Initial load of profile data for header
//     setTimeout(async () => {
//         try {
//             currentData = await fetchProfileDetails();
//             updateProfileButton();
//         } catch (error) {
//             console.error('Initial profile load failed:', error);
//         }
//     }, 100);
// });

// // Make functions globally available for onclick handlers
// window.handleProfileImageChange = handleProfileImageChange;
// window.removeProfilePicture = removeProfilePicture;
// window.closeSuccessModal = closeSuccessModal;
// window.closeErrorModal = closeErrorModal;

















// // Element references
// const profileBtn = document.getElementById("profileBtn");
// const profileModal = document.getElementById("profileModal");
// const closeProfile = document.getElementById("closeProfile");
// const profilePic = document.getElementById("profilePicture");
// const profileInput = document.getElementById("profileImageInput");
// const removeBtn = document.getElementById("removeProfileBtn");

// // Form elements
// const nameInput = document.getElementById("profileNameInput");
// const aboutTextarea = document.getElementById("profileAboutTextarea");
// const showOnlineToggle = document.getElementById("profileShowOnlineToggle");
// const showLastSeenToggle = document.getElementById("profileShowLastSeenToggle");

// // Buttons
// const saveBtn = document.getElementById("profileSaveBtn");
// const resetBtn = document.getElementById("profileResetBtn");

// // Modal references
// const successModal = document.getElementById("successModal");
// const errorModal = document.getElementById("errorModal");
// const successMessageText = document.getElementById("successMessageText");
// const errorMessageText = document.getElementById("errorMessageText");
// const errorDetails = document.getElementById("errorDetails");

// // Store original data for reset functionality
// let originalData = null;
// let currentData = null;

// // Load profile data
// async function fetchProfileDetails() {
//     try {
//         const resp = await fetch('/chat/api/profile/', {
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             }
//         });

//         if (!resp.ok) {
//             throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
//         }

//         const data = await resp.json();
//         console.log('Fetched profile data:', data);
//         return data;
//     } catch (err) {
//         console.error("Failed to load profile:", err);
//         showError("Failed to load profile data. Please refresh the page.");
//         throw err;
//     }
// }

// // Update profile button in header
// function updateProfileButton() {
//     const btn = document.getElementById('profileBtn');
//     const avatarDiv = btn.querySelector('div');
//     const nameSpan = btn.querySelector('span');

//     // Update name
//     if (currentData && currentData.name) {
//         nameSpan.textContent = currentData.name;
//     }

//     // Update avatar
//     if (currentData && currentData.avatar_url) {
//         avatarDiv.innerHTML = '';
//         avatarDiv.className = 'w-8 h-8 rounded-full overflow-hidden';
        
//         const img = document.createElement('img');
//         img.src = currentData.avatar_url;
//         img.alt = 'Profile Avatar';
//         img.className = 'object-cover w-full h-full';
//         avatarDiv.appendChild(img);
//     } else {
//         avatarDiv.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
//         avatarDiv.className = 'w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center';
//     }
// }

// // Populate form with data
// function populateForm(data) {
//     console.log('Populating form with data:', data);
    
//     // Name
//     nameInput.value = data.name || "";
    
//     // About
//     aboutTextarea.value = data.about_me || "";
    
//     // Toggles
//     showOnlineToggle.checked = data.show_online !== false; // Default to true
//     showLastSeenToggle.checked = data.show_last_seen !== false; // Default to true
    
//     // Avatar
//     if (data.avatar_url) {
//         console.log('Setting avatar:', data.avatar_url);
//         profilePic.style.backgroundImage = `url(${data.avatar_url})`;
//         profilePic.style.backgroundSize = 'cover';
//         profilePic.style.backgroundPosition = 'center';
//         document.getElementById("cameraIcon").style.display = 'none';
//         removeBtn.classList.remove("hidden");
//     } else {
//         profilePic.style.backgroundImage = '';
//         profilePic.style.backgroundSize = '';
//         profilePic.style.backgroundPosition = '';
//         document.getElementById("cameraIcon").style.display = 'block';
//         removeBtn.classList.add("hidden");
//     }
    
//     // Clear file input
//     profileInput.value = '';
// }

// // Show success modal
// function showSuccess(message = "Profile updated successfully!") {
//     successMessageText.textContent = message;
//     successModal.classList.remove("hidden");
// }

// // Close success modal
// function closeSuccessModal() {
//     successModal.classList.add("hidden");
// }

// // Show error modal
// function showError(message = "Failed to update profile. Please try again.", details = "") {
//     errorMessageText.textContent = message;
//     if (details) {
//         errorDetails.textContent = `Details: ${details}`;
//         errorDetails.classList.remove("hidden");
//     } else {
//         errorDetails.classList.add("hidden");
//     }
//     errorModal.classList.remove("hidden");
// }

// // Close error modal
// function closeErrorModal() {
//     errorModal.classList.add("hidden");
// }

// // Reset form to original data
// function resetForm() {
//     if (!originalData) {
//         console.error('No original data to reset to');
//         return;
//     }
    
//     console.log('Resetting form to original data:', originalData);
//     populateForm(originalData);
// }

// // Handle profile image change
// function handleProfileImageChange(event) {
//     const file = event.target.files[0];
//     if (file) {
//         // Validate file size (max 5MB)
//         if (file.size > 5 * 1024 * 1024) {
//             showError("File size too large. Maximum size is 5MB.");
//             event.target.value = '';
//             return;
//         }
        
//         // Validate file type
//         const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
//         if (!validTypes.includes(file.type)) {
//             showError("Invalid file type. Please upload JPEG, PNG, or GIF images.");
//             event.target.value = '';
//             return;
//         }
        
//         const reader = new FileReader();
//         reader.onload = function (e) {
//             profilePic.style.backgroundImage = `url(${e.target.result})`;
//             profilePic.style.backgroundSize = 'cover';
//             profilePic.style.backgroundPosition = 'center';
//             document.getElementById("cameraIcon").style.display = 'none';
//             removeBtn.classList.remove("hidden");
//         };
//         reader.readAsDataURL(file);
//     }
// }

// // Remove profile picture
// function removeProfilePicture() {
//     profilePic.style.backgroundImage = '';
//     profilePic.style.backgroundSize = '';
//     profilePic.style.backgroundPosition = '';
//     document.getElementById("cameraIcon").style.display = 'block';
//     removeBtn.classList.add("hidden");
//     profileInput.value = '';
// }

// // Validate form data
// function validateFormData() {
//     const errors = [];
    
//     if (!nameInput.value.trim()) {
//         errors.push("Full name is required");
//     }
    
//     if (nameInput.value.trim().length < 2) {
//         errors.push("Full name must be at least 2 characters");
//     }
    
//     if (aboutTextarea.value.length > 500) {
//         errors.push("About me should be less than 500 characters");
//     }
    
//     return errors;
// }

// // Open profile modal
// async function openProfileModal() {
//     try {
//         console.log('Opening profile modal...');
        
//         // Show modal immediately for better UX
//         profileModal.classList.remove("hidden");
        
//         // Show loading state
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        
//         // Fetch fresh data
//         const data = await fetchProfileDetails();
//         currentData = data;
//         originalData = JSON.parse(JSON.stringify(data)); // Deep copy for reset
        
//         console.log('Data loaded:', data);
        
//         // Populate form
//         populateForm(data);
        
//     } catch (error) {
//         console.error("Error loading profile:", error);
//         showError("Failed to load profile data");
//         // Close modal on error
//         profileModal.classList.add("hidden");
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// }

// // Save profile
// async function saveProfile() {
//     // Validate form
//     const errors = validateFormData();
//     if (errors.length > 0) {
//         showError(errors.join(", "));
//         return;
//     }
    
//     // Prepare form data
//     const formData = new FormData();
//     formData.append('name', nameInput.value.trim());
//     formData.append('about_me', aboutTextarea.value.trim());
//     formData.append('show_online', showOnlineToggle.checked);
//     formData.append('show_last_seen', showLastSeenToggle.checked);
    
//     // Add avatar if changed
//     if (profileInput.files[0]) {
//         formData.append('avatar', profileInput.files[0]);
//     } else if (profilePic.style.backgroundImage === '' && originalData.avatar_url) {
//         // If user removed the avatar
//         formData.append('avatar', ''); // Empty string to remove avatar
//     }
    
//     try {
//         // Show loading state
//         saveBtn.disabled = true;
//         saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        
//         console.log('Saving profile data...');
        
//         // Send request
//         const response = await fetch('/chat/api/profile/', {
//             method: 'POST',
//             credentials: 'same-origin',
//             headers: {
//                 'X-CSRFToken': csrftoken
//             },
//             body: formData
//         });
        
//         if (!response.ok) {
//             let errorMessage = `HTTP ${response.status}`;
//             try {
//                 const errorData = await response.json();
//                 console.error('Server error response:', errorData);
                
//                 // Handle field-specific errors
//                 if (errorData.name) {
//                     errorMessage = `Name: ${Array.isArray(errorData.name) ? errorData.name[0] : errorData.name}`;
//                 } else if (errorData.avatar) {
//                     errorMessage = `Avatar: ${Array.isArray(errorData.avatar) ? errorData.avatar[0] : errorData.avatar}`;
//                 } else if (errorData.detail) {
//                     errorMessage = errorData.detail;
//                 } else if (typeof errorData === 'object') {
//                     errorMessage = JSON.stringify(errorData);
//                 }
//             } catch (e) {
//                 errorMessage = response.statusText || 'Unknown error';
//             }
//             throw new Error(errorMessage);
//         }
        
//         const updatedData = await response.json();
//         console.log('Profile saved successfully:', updatedData);
        
//         // Update current data
//         currentData = updatedData;
//         originalData = JSON.parse(JSON.stringify(updatedData));
        
//         // Update profile button in header
//         updateProfileButton();
        
//         // Repopulate form with updated data
//         populateForm(updatedData);
        
//         // Show success message
//         showSuccess("Profile updated successfully!");
        
//     } catch (error) {
//         console.error('Profile save failed:', error);
//         showError("Failed to save profile", error.message);
//     } finally {
//         saveBtn.disabled = false;
//         saveBtn.innerHTML = 'Save Changes';
//     }
// }

// // Event Listeners
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('DOM loaded, setting up event listeners...');
    
//     // Profile button click
//     if (profileBtn) {
//         profileBtn.addEventListener("click", openProfileModal);
//     } else {
//         console.error('Profile button not found!');
//     }
    
//     // Close profile modal
//     if (closeProfile) {
//         closeProfile.addEventListener("click", () => {
//             profileModal.classList.add("hidden");
//         });
//     }
    
//     // Save button
//     if (saveBtn) {
//         saveBtn.addEventListener("click", saveProfile);
//     }
    
//     // Reset button
//     if (resetBtn) {
//         resetBtn.addEventListener("click", resetForm);
//     }
    
//     // Profile image input change
//     if (profileInput) {
//         profileInput.addEventListener('change', handleProfileImageChange);
//     }
    
//     // Remove profile picture button
//     if (removeBtn) {
//         removeBtn.addEventListener('click', function(e) {
//             e.stopPropagation();
//             removeProfilePicture();
//         });
//     }
    
//     // Click outside to close modals
//     window.addEventListener('click', (e) => {
//         if (e.target === profileModal) {
//             profileModal.classList.add("hidden");
//         }
//         if (e.target === successModal) {
//             closeSuccessModal();
//         }
//         if (e.target === errorModal) {
//             closeErrorModal();
//         }
//     });
    
//     // Escape key to close modals
//     document.addEventListener('keydown', (e) => {
//         if (e.key === 'Escape') {
//             if (!profileModal.classList.contains('hidden')) {
//                 profileModal.classList.add('hidden');
//             }
//             if (!successModal.classList.contains('hidden')) {
//                 closeSuccessModal();
//             }
//             if (!errorModal.classList.contains('hidden')) {
//                 closeErrorModal();
//             }
//         }
//     });
    
//     // Initial load of profile data for header
//     setTimeout(async () => {
//         try {
//             currentData = await fetchProfileDetails();
//             updateProfileButton();
//         } catch (error) {
//             console.error('Initial profile load failed:', error);
//         }
//     }, 100);
// });

// // Make functions globally available for onclick handlers
// window.handleProfileImageChange = handleProfileImageChange;
// window.removeProfilePicture = removeProfilePicture;
// window.closeSuccessModal = closeSuccessModal;
// window.closeErrorModal = closeErrorModal;