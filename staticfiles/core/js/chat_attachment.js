
let selectedFiles = [];
let currentAttachmentType = '';


// Attachment button click handler
document.getElementById('attachmentBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    if (window.innerWidth < 768) {
        // Mobile view
        document.getElementById('mobileAttachmentPanel').classList.add('active');
        document.getElementById('mobileOverlay').classList.remove('hidden');
    } else {
        // Desktop view
        const dropdown = document.getElementById('attachmentDropdown');
        dropdown.classList.toggle('active');
    }
});



// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('attachmentDropdown');
    const attachmentBtn = document.getElementById('attachmentBtn');
    if (!dropdown.contains(e.target) && !attachmentBtn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});



// Close mobile panel
function closeMobilePanel() {
    document.getElementById('mobileAttachmentPanel').classList.remove('active');
    document.getElementById('mobileOverlay').classList.add('hidden');
}



// Mobile overlay click handler
document.getElementById('mobileOverlay').addEventListener('click', closeMobilePanel);



// Select attachment type
function selectAttachmentType(type) {
    currentAttachmentType = type;

    // Close dropdown/mobile panel
    document.getElementById('attachmentDropdown').classList.remove('active');
    closeMobilePanel();

    // Show file upload interface
    showFileUploadInterface(type);
}



function showFileUploadInterface(type) {
    const interface = document.getElementById('fileUploadInterface');
    const icon = document.getElementById('uploadIcon');
    const title = document.getElementById('uploadTitle');
    const fileInput = document.getElementById('fileInput');

    // Configure based on type
    const config = {
        image: {
            icon: 'fas fa-image',
            title: 'Upload Images',
            accept: 'image/*'
        },
        video: {
            icon: 'fas fa-video',
            title: 'Upload Videos',
            accept: 'video/*'
        },
        audio: {
            icon: 'fas fa-music',
            title: 'Upload Audio',
            accept: 'audio/*'
        },
        document: {
            icon: 'fas fa-file-alt',
            title: 'Upload Documents',
            accept: '.pdf,.doc,.docx,.txt,.rtf'
        }
    };

    const typeConfig = config[type];
    icon.className = typeConfig.icon + ' mr-2';
    title.textContent = typeConfig.title;
    fileInput.accept = typeConfig.accept;

    interface.classList.remove('hidden');
    interface.scrollIntoView({ behavior: 'smooth' });
}



// File input change handler
document.getElementById('fileInput').addEventListener('change', function (e) {
    handleFiles(e.target.files);
});



// Drag and drop handlers
const dropArea = document.getElementById('dropArea');

dropArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropArea.classList.add('drag-over');
});

dropArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
});

dropArea.addEventListener('drop', function (e) {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});



function handleFiles(files) {
    selectedFiles = Array.from(files);
    displayFilePreview();
}



function displayFilePreview() {
    const filePreview = document.getElementById('filePreview');
    const fileList = document.getElementById('fileList');
    const sendContainer = document.getElementById('sendFilesContainer');

    if (selectedFiles.length === 0) {
        filePreview.classList.add('hidden');
        // sendContainer.classList.add('hidden');
        return;
    }

    filePreview.classList.remove('hidden');
    // sendContainer.classList.remove('hidden');

    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200';

        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center space-x-3';

        const fileIcon = getFileIcon(file.type);
        const fileName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
        const fileSize = formatFileSize(file.size);

        fileInfo.innerHTML = `
                    <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <i class="${fileIcon} text-gray-600"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${fileName}</p>
                        <p class="text-xs text-gray-500">${fileSize}</p>
                    </div>
                `;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-500 hover:text-red-700 transition-colors';
        removeBtn.innerHTML = '<i class="fas fa-trash text-sm"></i>';
        removeBtn.onclick = () => removeFile(index);

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    });
}



function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'fas fa-image';
    if (mimeType.startsWith('video/')) return 'fas fa-video';
    if (mimeType.startsWith('audio/')) return 'fas fa-music';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('text')) return 'fas fa-file-alt';
    return 'fas fa-file';
}



function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}



function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFilePreview();
}



function closeFileUpload() {
    document.getElementById('fileUploadInterface').classList.add('hidden');
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
}



// Send files handler
// document.getElementById('sendFilesBtn').addEventListener('click', function () {
//     if (selectedFiles.length === 0) return;

//     // Here you would typically upload the files to your server
//     // For demo purposes, we'll just show a success message

//     const chatArea = document.querySelector('.h-96');
//     const messageContainer = document.createElement('div');
//     messageContainer.className = 'flex justify-end mb-4';

//     const messageContent = document.createElement('div');
//     messageContent.className = 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-lg shadow-sm max-w-xs';

//     const fileText = selectedFiles.length === 1 ? 'file' : 'files';
//     messageContent.innerHTML = `
//                 <p><i class="fas fa-paperclip mr-2"></i>Sent ${selectedFiles.length} ${fileText}</p>
//                 <span class="text-xs text-white text-opacity-70 mt-1">${new Date().toLocaleTimeString()}</span>
//             `;

//     messageContainer.appendChild(messageContent);
//     chatArea.appendChild(messageContainer);
//     chatArea.scrollTop = chatArea.scrollHeight;

//     // Reset the upload interface
//     closeFileUpload();

//     // Show success notification
//     // showNotification('Files sent successfully!', 'success');
// });



// function showNotification(message, type) {
//     const notification = document.createElement('div');
//     notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-bounce-in ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
//         }`;
//     notification.innerHTML = `
//                 <div class="flex items-center space-x-2">
//                     <i class="fas fa-check-circle"></i>
//                     <span>${message}</span>
//                 </div>
//             `;
//     document.body.appendChild(notification);

//     setTimeout(() => {
//         notification.remove();
//     }, 3000);
// }

// Handle window resize
window.addEventListener('resize', function () {
    if (window.innerWidth >= 768) {
        closeMobilePanel();
    }
});
