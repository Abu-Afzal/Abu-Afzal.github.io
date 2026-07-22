// Import Firebase SDK (Modular v10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, ref, set, push, onValue, onDisconnect, serverTimestamp, query, orderByChild 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670",
  measurementId: "G-1D5DWJV54E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// State Aplikasi
let currentUserId = null;
let currentUserIdSafe = null; // Email yang sudah di-encode (tanpa titik)
let currentChatPartnerId = null;
let currentChatRoomId = null;
let currentUserName = 'User';

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetUsers, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetChatArea, chatWidgetPlaceholder;

// Fungsi untuk encode email (replace . dengan _)
function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

// Fungsi untuk decode email (kembalikan ke format asli)
function decodeEmail(encodedEmail) {
    return encodedEmail.replace(/_at_/g, '@').replace(/_/g, '.');
}

// Initialize Widget
export function initChatWidget() {
    console.log('🚀 Initializing chat widget...');
    createWidgetHTML();
    
    // Ambil elemen DOM setelah HTML dibuat
    chatWidgetBtn = document.getElementById('chatWidgetBtn');
    chatWidgetContainer = document.getElementById('chatWidgetContainer');
    chatWidgetUsers = document.getElementById('chatWidgetUsers');
    chatWidgetMessages = document.getElementById('chatWidgetMessages');
    chatWidgetInput = document.getElementById('chatWidgetInput');
    sendBtn = document.getElementById('chatWidgetSendBtn');
    chatWidgetChatArea = document.getElementById('chatWidgetChatArea');
    chatWidgetPlaceholder = document.getElementById('chatWidgetPlaceholder');
    
    // Event Listeners
    if (chatWidgetBtn) chatWidgetBtn.addEventListener('click', toggleChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatWidgetInput) {
        chatWidgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // Cek apakah user sudah login di aplikasi utama
    checkExistingUser();
}

// Cek user yang sedang login dari localStorage
function checkExistingUser() {
    const userData = localStorage.getItem('sipelita_user');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            currentUserId = user.email; // Email asli
            currentUserIdSafe = encodeEmail(user.email); // Email yang aman untuk RTDB
            currentUserName = user.nama || user.name || user.email.split('@')[0];
            
            console.log('✅ User terdeteksi:', currentUserName, '(', currentUserId, ')');
            console.log('🔑 User ID Safe:', currentUserIdSafe);
            
            // Simpan ke RTDB untuk chat
            setupUserInRTDB();
            setupPresence();
            loadUsers();
            
        } catch (error) {
            console.error('❌ Error parsing user data:', error);
        }
    } else {
        console.log('⚠️ Tidak ada user login');
    }
}

// Simpan user info ke RTDB
function setupUserInRTDB() {
    const userRef = ref(db, `users/${currentUserIdSafe}`);
    set(userRef, {
        name: currentUserName,
        email: currentUserId,
        status: 'online',
        lastSeen: serverTimestamp()
    }).then(() => {
        console.log('✅ User disimpan ke RTDB');
    }).catch((error) => {
        console.error('❌ Error simpan ke RTDB:', error);
    });
}

// Create Widget HTML
function createWidgetHTML() {
    const widgetHTML = `
        <button id="chatWidgetBtn" class="chat-widget-btn">
            <i class="fas fa-comments"></i>
            <span class="badge" id="chatWidgetBadge" style="display:none">0</span>
        </button>
        
        <div id="chatWidgetContainer" class="chat-widget-container">
            <div class="chat-widget-header">
                <h3><i class="fas fa-comments"></i> Chat Sipelita</h3>
                <button class="close-btn" id="chatWidgetCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div id="chatWidgetUsers" class="chat-widget-users">
                <div style="padding:20px;text-align:center;color:#999">Memuat pengguna...</div>
            </div>
            
            <div id="chatWidgetChatArea" class="chat-widget-chat-area" style="display: none;">
                <div id="chatWidgetMessages" class="chat-widget-messages"></div>
                <div class="chat-widget-input">
                    <input type="text" id="chatWidgetInput" placeholder="Ketik pesan...">
                    <button id="chatWidgetSendBtn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            
            <div id="chatWidgetPlaceholder" class="chat-widget-placeholder">
                <i class="fas fa-comments"></i>
                <p>Pilih pengguna untuk chat</p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    
    // Tambahkan event listener untuk tombol close
    document.getElementById('chatWidgetCloseBtn').addEventListener('click', () => {
        chatWidgetContainer.classList.remove('active');
    });
}

// Toggle Chat Widget
function toggleChat() {
    chatWidgetContainer.classList.toggle('active');
}

// Setup Presence (Online/Offline)
function setupPresence() {
    const userStatusRef = ref(db, `users/${currentUserIdSafe}/status`);
    const userLastSeenRef = ref(db, `users/${currentUserIdSafe}/lastSeen`);
    const connectedRef = ref(db, '.info/connected');
    
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(userStatusRef, 'online');
            onDisconnect(userStatusRef).set('offline');
            onDisconnect(userLastSeenRef).set(serverTimestamp());
            console.log('🟢 Status diatur ke: Online');
        }
    });
}

// Load Users dari RTDB
function loadUsers() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, (snapshot) => {
        chatWidgetUsers.innerHTML = '';
        const users = snapshot.val();
        
        if (!users) {
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Belum ada pengguna online</div>';
            return;
        }
        
        Object.keys(users).forEach(uidSafe => {
            if (uidSafe === currentUserIdSafe) return; // Jangan tampilkan diri sendiri
            
            const user = users[uidSafe];
            const isOnline = user.status === 'online';
            const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
            
            const userEl = document.createElement('div');
            userEl.className = 'chat-widget-user';
            userEl.dataset.uid = uidSafe; // Simpan ID yang sudah di-encode
            userEl.innerHTML = `
                <div class="avatar">
                    ${displayName.charAt(0).toUpperCase()}
                    ${isOnline ? '<div class="status-dot"></div>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${displayName}</div>
                    <div class="user-status">${isOnline ? 'Online' : 'Offline'}</div>
                </div>
            `;
            
            userEl.addEventListener('click', () => openChat(uidSafe, displayName));
            chatWidgetUsers.appendChild(userEl);
        });
    });
}

// Open Chat
function openChat(partnerIdSafe, partnerName) {
    console.log(' Membuka chat dengan:', partnerIdSafe, partnerName);
    
    currentChatPartnerId = partnerIdSafe;
    // Buat room ID dari ID yang sudah di-encode
    currentChatRoomId = [currentUserIdSafe, partnerIdSafe].sort().join('_');
    console.log('🔑 Room ID yang dibuat:', currentChatRoomId);
    
    // Tampilkan area chat, sembunyikan placeholder
    chatWidgetPlaceholder.style.display = 'none';
    chatWidgetChatArea.style.display = 'flex';
    
    // Highlight user aktif
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"]`)?.classList.add('active');
    
    listenMessages();
}

// Listen Messages
function listenMessages() {
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onValue(messagesQuery, (snapshot) => {
        chatWidgetMessages.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            chatWidgetMessages.innerHTML = '<div style="text-align:center;color:#999;padding:20px">Belum ada pesan. Sapa dia!</div>';
            return;
        }
        
        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserIdSafe;
            
            const msgEl = document.createElement('div');
            msgEl.className = `chat-widget-message ${isSent ? 'sent' : 'received'}`;
            msgEl.textContent = msg.text;
            
            chatWidgetMessages.appendChild(msgEl);
        });
        
        // Auto scroll ke bawah
        chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;
    });
}

// Send Message
function sendMessage() {
    const text = chatWidgetInput.value.trim();
    
    if (!text) {
        return;
    }
    
    if (!currentChatRoomId) {
        alert('Pilih pengguna di daftar terlebih dahulu');
        return;
    }
    
    try {
        const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
        
        push(messagesRef, {
            senderId: currentUserIdSafe,
            text: text,
            timestamp: serverTimestamp()
        }).then(() => {
            chatWidgetInput.value = '';
            chatWidgetInput.focus();
        }).catch((error) => {
            console.error('❌ Error kirim pesan:', error);
            alert('Gagal kirim pesan: ' + error.message);
        });
    } catch (error) {
        console.error('❌ Error di sendMessage:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

// Auto-init ketika DOM sudah siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
