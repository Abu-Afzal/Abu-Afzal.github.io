// Import Firebase SDK (Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, ref, set, push, onValue, onDisconnect, serverTimestamp, get, query, orderByChild 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// KONFIGURASI FIREBASE (GANTI DENGAN PUNYA ANDA)
// ==========================================
const firebaseConfig = {
    apiKey: "GANTI_DENGAN_API_KEY_ANDA",
    authDomain: "GANTI_DENGAN_AUTH_DOMAIN_ANDA",
    databaseURL: "GANTI_DENGAN_DATABASE_URL_ANDA", 
    projectId: "GANTI_DENGAN_PROJECT_ID_ANDA",
    storageBucket: "GANTI_DENGAN_STORAGE_BUCKET_ANDA",
    messagingSenderId: "GANTI_DENGAN_SENDER_ID_ANDA",
    appId: "GANTI_DENGAN_APP_ID_ANDA"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// State Aplikasi
let currentUserId = null;
let currentChatRoomId = null;
let currentChatPartnerId = null;
let currentChatPartnerName = "";

// DOM Elements
const userListEl = document.getElementById('userList');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const chatWindow = document.getElementById('chatWindow');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const myStatusText = document.getElementById('myStatusText');
const chatUserName = document.getElementById('chatUserName');
const chatUserStatus = document.getElementById('chatUserStatus');
const chatAvatar = document.getElementById('chatAvatar');

// ==========================================
// 1. AUTENTIKASI (Menggunakan Anonim untuk Demo)
// ==========================================
signInAnonymously(auth).catch((error) => {
    console.error("Auth Error:", error);
    alert("Gagal login. Pastikan Anonymous Auth sudah diaktifkan di Firebase Console.");
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        myStatusText.textContent = `Login sebagai: ${currentUserId.substring(0, 8)}...`;
        setupPresence();
        loadUsers();
    }
});

// ==========================================
// 2. SISTEM PRESENCE (Online/Offline)
// ==========================================
function setupPresence() {
    const userStatusRef = ref(db, `users/${currentUserId}/status`);
    const userLastSeenRef = ref(db, `users/${currentUserId}/lastSeen`);
    const connectedRef = ref(db, '.info/connected');

    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(userStatusRef, 'online');
            onDisconnect(userStatusRef).set('offline');
            onDisconnect(userLastSeenRef).set(serverTimestamp());
            myStatusText.textContent = `Status: Online`;
        }
    });
}

// ==========================================
// 3. MEMUAT DAFTAR PENGGUNA (SIDEBAR)
// ==========================================
function loadUsers() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, (snapshot) => {
        userListEl.innerHTML = '';
        const users = snapshot.val();
        
        if (!users) {
            userListEl.innerHTML = '<div class="loading">Belum ada pengguna lain.</div>';
            return;
        }

        Object.keys(users).forEach(uid => {
            if (uid === currentUserId) return; 

            const user = users[uid];
            const isOnline = user.status === 'online';
            
            let statusText = 'Offline';
            if (isOnline) {
                statusText = 'Online';
            } else if (user.lastSeen) {
                const date = new Date(user.lastSeen);
                statusText = `Terakhir dilihat ${date.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;
            }

            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.dataset.uid = uid;
            userItem.dataset.name = user.name || 'User';
            
            userItem.innerHTML = `
                <div class="avatar">
                    ${(user.name || 'U').charAt(0).toUpperCase()}
                    <div class="status-dot ${isOnline ? 'online' : ''}"></div>
                </div>
                <div class="user-details">
                    <div class="user-name">${user.name || 'Pengguna Anonim'}</div>
                    <div class="user-status-text">${statusText}</div>
                </div>
            `;

            userItem.addEventListener('click', () => openChat(uid, user.name || 'Pengguna'));
            userListEl.appendChild(userItem);
        });
    });
}

// ==========================================
// 4. MEMBUKA CHAT & LISTENER PESAN
// ==========================================
function openChat(partnerId, partnerName) {
    currentChatPartnerId = partnerId;
    currentChatPartnerName = partnerName;
    currentChatRoomId = [currentUserId, partnerId].sort().join('_');

    chatPlaceholder.style.display = 'none';
    chatWindow.style.display = 'flex';
    chatUserName.textContent = partnerName;
    chatAvatar.textContent = partnerName.charAt(0).toUpperCase();
    
    document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.user-item[data-uid="${partnerId}"]`)?.classList.add('active');

    listenPartnerStatus();
    listenMessages();
}

function listenPartnerStatus() {
    const partnerStatusRef = ref(db, `users/${currentChatPartnerId}`);
    onValue(partnerStatusRef, (snap) => {
        const data = snap.val();
        if (data) {
            if (data.status === 'online') {
                chatUserStatus.textContent = 'Online';
                chatUserStatus.style.color = '#25d366';
            } else {
                chatUserStatus.style.color = 'rgba(255,255,255,0.8)';
                if (data.lastSeen) {
                    const date = new Date(data.lastSeen);
                    chatUserStatus.textContent = `Terakhir dilihat ${date.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;
                } else {
                    chatUserStatus.textContent = 'Offline';
                }
            }
        }
    });
}

function listenMessages() {
    messagesContainer.innerHTML = '<div class="loading">Memuat pesan...</div>';
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));

    onValue(messagesQuery, (snapshot) => {
        messagesContainer.innerHTML = '';
        const messages = snapshot.val();

        if (!messages) {
            messagesContainer.innerHTML = '<div class="loading" style="color:#999">Belum ada pesan. Sapa dia!</div>';
            return;
        }

        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserId;
            
            const msgEl = document.createElement('div');
            msgEl.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
            
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            msgEl.innerHTML = `
                <div class="message-text">${msg.text}</div>
                <div class="message-time">${time}</div>
            `;
            messagesContainer.appendChild(msgEl);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ==========================================
// 5. MENGIRIM PESAN
// ==========================================
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatRoomId) return;

    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const newMsgRef = push(messagesRef);
    
    set(newMsgRef, {
        senderId: currentUserId,
        text: text,
        timestamp: serverTimestamp() 
    });

    const chatRoomRef = ref(db, `chats/${currentChatRoomId}`);
    set(chatRoomRef, {
        participants: {
            [currentUserId]: true,
            [currentChatPartnerId]: true
        },
        lastMessage: text,
        lastMessageTime: serverTimestamp()
    });

    const myNameRef = ref(db, `users/${currentUserId}/name`);
    set(myNameRef, `User ${currentUserId.substring(0, 4)}`);

    messageInput.value = '';
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
