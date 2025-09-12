// Enhanced helper function: incoming===true → bubble on left; false → on right
function appendAttachment(incoming, url, time, filename = null) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex items-start space-x-2 " + (incoming ? "" : "justify-end");
  
  const bubble = document.createElement("div");
  bubble.className = incoming
    ? "message-bubble bg-white text-gray-600 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100"
    : "message-bubble bg-white text-gray-600 rounded-2xl rounded-br-md px-4 py-3 shadow-sm border border-gray-100";
  
  // Extract file extension and name
  const ext = url.split(".").pop().toLowerCase();
  const displayFilename = filename || url.split("/").pop();
  
  // Create download button
  const createDownloadButton = () => {
    return `<button onclick="downloadFile('${url}', '${displayFilename}')" 
              class="ml-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200 group" 
              title="Download ${displayFilename}">
              <i class="fas fa-download text-gray-400 group-hover:text-gray-600 text-sm"></i>
            </button>`;
  };
  
  let contentHtml;
  
  // Image files
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="relative group">
          <img src="${url}" 
               alt="${displayFilename}" 
               class="w-full rounded-lg mb-2 transition-opacity duration-200"/>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <i class="fas fa-image text-blue-500 text-sm"></i>
            <span class="text-sm font-medium truncate max-w-[150px]">${displayFilename}</span>
          </div>
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Video files
  else if (["mp4", "webm", "ogg", "avi", "mov", "wmv"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="relative group">
          <video src="${url}" 
                 controls 
                 class="w-full rounded-lg mb-2 bg-gray-50"
                 onclick="openVideoModal('${url}', '${displayFilename}')">
            Your browser does not support the video tag.
          </video>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <i class="fas fa-video text-red-500 text-sm"></i>
            <span class="text-sm font-medium truncate max-w-[150px]">${displayFilename}</span>
          </div>
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Audio files
  else if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs w-full">
        <div class="bg-gray-50 rounded-lg p-2 mb-2">
          <audio src="${url}" 
                 controls 
                 class="w-full"
                 style="height: 40px;">
            Your browser does not support the audio tag.
          </audio>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <i class="fas fa-music text-green-500 text-sm"></i>
            <span class="text-sm font-medium truncate max-w-[120px]">${displayFilename}</span>
          </div>
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // PDF files
  else if (ext === "pdf") {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
             onclick="openPdfModal('${url}', '${displayFilename}')">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <button onclick="openPdfModal('${url}', '${displayFilename}')"
                  class="text-blue-600 hover:text-blue-800 text-xs font-medium">
            <i class="fas fa-eye mr-1"></i>View
          </button>
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Word documents
  else if (["doc", "docx"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-word text-blue-600 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">Word Document</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Excel files
  else if (["xls", "xlsx", "csv"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-excel text-green-600 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">${ext.toUpperCase()} File</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // PowerPoint files
  else if (["ppt", "pptx"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-powerpoint text-orange-600 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">PowerPoint</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Archive files
  else if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-archive text-purple-600 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">Archive File</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Text files
  else if (["txt", "md", "json", "xml", "html", "css", "js", "py", "java", "cpp", "c"].includes(ext)) {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
             onclick="openTextModal('${url}', '${displayFilename}')">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file-code text-gray-600 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">${ext.toUpperCase()} File</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Default fallback for other files
  else {
    contentHtml = `
      <div class="max-w-xs">
        <div class="bg-gray-50 rounded-lg p-4 mb-2">
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <i class="fas fa-file text-gray-500 text-2xl"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">${displayFilename}</p>
              <p class="text-xs text-gray-500">Unknown File Type</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end">
          ${createDownloadButton()}
        </div>
      </div>`;
  }
  
  // Assemble bubble inner HTML
  bubble.innerHTML = `
    ${contentHtml}
    <span class="text-xs text-gray-400 mt-2 block">${time}</span>
  `;
  
  wrapper.appendChild(bubble);
  messagesContainer.insertBefore(wrapper, typingIndicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// Utility function to download files
function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Modal functions for viewing files
function openImageModal(url, filename) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = () => document.body.removeChild(modal);
  
  const img = document.createElement('img');
  img.src = url;
  img.className = 'max-w-full max-h-full rounded-lg';
  img.onclick = (e) => e.stopPropagation();
  
  modal.appendChild(img);
  document.body.appendChild(modal);
}

function openVideoModal(url, filename) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = () => document.body.removeChild(modal);
  
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.className = 'max-w-full max-h-full rounded-lg';
  video.onclick = (e) => e.stopPropagation();
  
  modal.appendChild(video);
  document.body.appendChild(modal);
}

function openPdfModal(url, filename) {
  window.open(url, '_blank');
}

function openTextModal(url, filename) {
  window.open(url, '_blank');
}