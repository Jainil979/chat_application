// DOM elements
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const closeEmojiPicker = document.getElementById('closeEmojiPicker');
// const messageInput = document.getElementById('messageInput');

const emojiGrid = document.getElementById('emojiGrid');
const emojiSearch = document.getElementById('emojiSearch');
const categoryTabs = document.querySelectorAll('.category-tab');

// Comprehensive Emoji Data
const emojiData = {
  recent: [],
  smileys: [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
    '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮',
    '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
    '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
    '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻',
    '😼', '😽', '🙀', '😿', '😾'
  ],
  people: [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈',
    '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
    '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
    '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '👶', '🧒',
    '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅',
    '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🤴',
    '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹',
    '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃',
    '💃', '🕺', '🕴️', '👯', '🧖', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣',
    '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌'
  ],
  animals: [
    '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱',
    '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮',
    '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙',
    '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫',
    '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔',
    '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶',
    '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳',
    '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜',
    '🐝', '🪲', '🐞', '🦗', '🕷️', '🦂', '🦟', '🪰', '🪱', '🦠'
  ],
  food: [
    '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
    '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚',
    '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕',
    '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜',
    '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮',
    '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
    '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤',
    '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🧊'
  ],
  travel: [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛',
    '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬',
    '🪂', '💺', '🚀', '🛰️', '🚊', '🚝', '🚞', '🚋', '🚃', '🚂', '🚄', '🚅', '🚆',
    '🚇', '🚈', '🚉', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙',
    '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '⛵',
    '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🚏', '🗺️',
    '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️',
    '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭',
    '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪',
    '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠',
    '🎆', '🎇', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'
  ],
  objects: [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾',
    '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠',
    '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⏳', '⌛', '📡',
    '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷',
    '🪙', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️',
    '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️',
    '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺',
    '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚿',
    '🛁', '🛀', '🧴', '🧷', '🧸', '🧵', '🧶', '🪡', '🧾', '🧮', '🔍', '🔎', '🕯️',
    '🕰️', '⏳', '⌛', '⏰', '⏲️', '⏱️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖',
    '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣',
    '🕤', '🕥', '🕦', '🕧', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙',
    '🌚', '🌛', '🌜', '🌡️', '☀️', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '☁️',
    '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄',
    '🌬️', '💨', '🌪️', '🌫️', '🌈', '🌂', '☂️', '☔', '⛱️', '⚡', '❄️', '☃️', '⛄',
    '☄️', '🔥', '💧', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊',
    '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫', '🎖️',
    '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾',
    '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️',
    '🎣', '🤿', '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🎱', '🔮', '🪄', '🎮',
    '🕹️', '🎰', '🎲', '🧩', '🧸', '🪅', '🪆', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏',
    '🀄', '🎴', '🎭', '🖼️', '🎨', '🧵', '🪡', '🧶', '🪢'
  ],
  symbols: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
    '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
    '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸',
    '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲',
    '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
    '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔',
    '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯',
    '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️',
    '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶',
    '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣',
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣',
    '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬',
    '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️',
    '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '♾️', '💲', '💱',
    '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️',
    '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸',
    '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧',
    '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕',
    '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴',
    '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'
  ]
};

// Recent emojis storage (using in-memory storage)
let recentEmojis = [];
const maxRecentEmojis = 24;

let currentCategory = 'recent';
let isEmojiPickerOpen = false;

// Initialize emoji picker
function initEmojiPicker() {
  // Load recent emojis if available
  if (recentEmojis.length === 0) {
    // Add some default recent emojis
    recentEmojis = ['😀', '😂', '😍', '😊', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥'];
  }

  // Display initial category
  displayEmojis(currentCategory);

  // Add event listeners
  emojiBtn.addEventListener('click', toggleEmojiPicker);
  closeEmojiPicker.addEventListener('click', hideEmojiPicker);
  emojiSearch.addEventListener('input', handleEmojiSearch);

  // Category tab listeners
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const category = e.target.closest('.category-tab').dataset.category;
      switchCategory(category);
    });
  });

  // Close picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
      hideEmojiPicker();
    }
  });

  // Handle keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isEmojiPickerOpen) {
      hideEmojiPicker();
    }
  });
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
  if (isEmojiPickerOpen) {
    hideEmojiPicker();
  } else {
    showEmojiPicker();
  }
}

// Show emoji picker
function showEmojiPicker() {
  emojiPicker.classList.remove('hidden');
  emojiPicker.classList.add('animate-slide-up');
  isEmojiPickerOpen = true;

  // Focus search input
  setTimeout(() => {
    emojiSearch.focus();
  }, 100);
}

// Hide emoji picker
function hideEmojiPicker() {
  emojiPicker.classList.add('hidden');
  emojiPicker.classList.remove('animate-slide-up');
  isEmojiPickerOpen = false;

  // Clear search
  emojiSearch.value = '';
}

// Switch category
function switchCategory(category) {
  currentCategory = category;

  // Update active tab
  categoryTabs.forEach(tab => {
    if (tab.dataset.category === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Clear search when switching categories
  emojiSearch.value = '';

  // Display emojis for selected category
  displayEmojis(category);
}

// Display emojis for category
function displayEmojis(category) {
  emojiGrid.innerHTML = '';

  let emojisToShow = [];

  if (category === 'recent') {
    emojisToShow = recentEmojis;
  } else {
    emojisToShow = emojiData[category] || [];
  }

  // Show message if no emojis
  if (emojisToShow.length === 0) {
    emojiGrid.innerHTML = `
                    <div class="col-span-8 text-center py-8 text-gray-500">
                        <i class="fas fa-emoji-sad text-2xl mb-2"></i>
                        <p class="text-sm">No emojis found</p>
                    </div>
                `;
    return;
  }

  // Create emoji buttons
  emojisToShow.forEach(emoji => {
    const emojiButton = document.createElement('button');
    emojiButton.className = 'emoji-item p-2 text-xl hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center';
    emojiButton.textContent = emoji;
    emojiButton.title = emoji;
    emojiButton.addEventListener('click', () => selectEmoji(emoji));
    emojiGrid.appendChild(emojiButton);
  });
}

// Handle emoji search
function handleEmojiSearch() {
  const searchTerm = emojiSearch.value.toLowerCase().trim();

  if (searchTerm === '') {
    displayEmojis(currentCategory);
    return;
  }

  // Search through all emojis
  const allEmojis = Object.values(emojiData).flat();
  const filteredEmojis = allEmojis.filter(emoji => {
    // You can add emoji names/keywords here for better search
    return emoji.includes(searchTerm);
  });

  // Display filtered results
  emojiGrid.innerHTML = '';

  if (filteredEmojis.length === 0) {
    emojiGrid.innerHTML = `
                    <div class="col-span-8 text-center py-8 text-gray-500">
                        <i class="fas fa-search text-2xl mb-2"></i>
                        <p class="text-sm">No emojis found for "${searchTerm}"</p>
                    </div>
                `;
    return;
  }

  filteredEmojis.forEach(emoji => {
    const emojiButton = document.createElement('button');
    emojiButton.className = 'emoji-item p-2 text-xl hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center';
    emojiButton.textContent = emoji;
    emojiButton.title = emoji;
    emojiButton.addEventListener('click', () => selectEmoji(emoji));
    emojiGrid.appendChild(emojiButton);
  });
}

// Select emoji and insert into input
function selectEmoji(emoji) {
  const currentText = messageInput.value;
  const cursorPosition = messageInput.selectionStart;

  // Insert emoji at cursor position
  const newText = currentText.slice(0, cursorPosition) + emoji + currentText.slice(cursorPosition);
  messageInput.value = newText;

  // Move cursor after the emoji
  const newCursorPosition = cursorPosition + emoji.length;
  messageInput.setSelectionRange(newCursorPosition, newCursorPosition);

  // Add to recent emojis
  addToRecentEmojis(emoji);

  // Focus back to input
  messageInput.focus();

  // Hide picker on mobile devices
  if (window.innerWidth <= 768) {
    hideEmojiPicker();
  }
}

// Add emoji to recent emojis
function addToRecentEmojis(emoji) {
  // Remove emoji if it already exists
  const existingIndex = recentEmojis.indexOf(emoji);
  if (existingIndex !== -1) {
    recentEmojis.splice(existingIndex, 1);
  }

  // Add to beginning
  recentEmojis.unshift(emoji);

  // Keep only max recent emojis
  if (recentEmojis.length > maxRecentEmojis) {
    recentEmojis = recentEmojis.slice(0, maxRecentEmojis);
  }

  // Update recent category if it's currently active
  if (currentCategory === 'recent') {
    displayEmojis('recent');
  }
}

// Make picker responsive
function makeResponsive() {
  const picker = document.getElementById('emojiPicker');

  if (window.innerWidth <= 768) {
    // Mobile: Full width, positioned at bottom
    picker.classList.remove('w-80', 'h-96', 'bottom-20', 'right-4');
    picker.classList.add('w-full', 'h-80', 'bottom-0', 'left-0', 'right-0', 'rounded-t-2xl', 'rounded-b-none');
  } else {
    // Desktop: Original positioning
    picker.classList.remove('w-full', 'h-80', 'bottom-0', 'left-0', 'right-0', 'rounded-t-2xl', 'rounded-b-none');
    picker.classList.add('w-80', 'h-96', 'bottom-20', 'right-4', 'rounded-2xl');
  }
}

// Handle window resize

window.addEventListener('resize', makeResponsive);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initEmojiPicker();
  makeResponsive();
});

// Demo: Handle send button (for demonstration purposes)
document.getElementById('sendBtn').addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    alert(`Message sent: ${message}`);
    messageInput.value = '';
    hideEmojiPicker();
  }
});

// Demo: Handle Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const message = messageInput.value.trim();
    if (message) {
      alert(`Message sent: ${message}`);
      messageInput.value = '';
      hideEmojiPicker();
    }
  }
});

