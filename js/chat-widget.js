// Import Firebase SDK (Modular v10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
let currentChatPartnerId = null;
let currentChatRoomId = null;

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetUsers, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetChatArea, chatWidgetPlaceholder;

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
    
    // Auth: Login Anonim
    signInAnonymously(auth).catch((error) => {
        console.error('❌ Gagal login anonim:', error);
    });
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log('✅ Login berhasil. User ID:', currentUserId);
            setupPresence();
            loadUsers();
        }
    });
}

// Create Widget HTML (DIPERBAIKI: Menghapus konflik style display)
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
            
            <!-- DIPERBAIKI: Hanya display:none, biarkan CSS yang mengatur flex -->
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
    
    // Tambahkan event listener untuk tombol close yang baru
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
    const userStatusRef = ref(db, `users/${currentUserId}/status`);
    const userLastSeenRef = ref(db, `users/${currentUserId}/lastSeen`);
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

// Load Users
function loadUsers() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, (snapshot) => {
        chatWidgetUsers.innerHTML = '';
        const users = snapshot.val();
        
        if (!users) {
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Belum ada pengguna lain</div>';
            return;
        }
        
        Object.keys(users).forEach(uid => {
            if (uid === currentUserId) return; // Jangan tampilkan diri sendiri
            
            const user = users[uid];
            const isOnline = user.status === 'online';
            
            const userEl = document.createElement('div');
            userEl.className = 'chat-widget-user';
            userEl.dataset.uid = uid;
            userEl.innerHTML = `
                <div class="avatar">
                    ${(user.name || 'U').charAt(0).toUpperCase()}
                    ${isOnline ? '<div class="status-dot"></div>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || 'Pengguna'}</div>
                    <div class="user-status">${isOnline ? 'Online' : 'Offline'}</div>
                </div>
            `;
            
            userEl.addEventListener('click', () => openChat(uid, user.name || 'Pengguna'));
            chatWidgetUsers.appendChild(userEl);
        });
    });
}

// Open Chat
function openChat(partnerId, partnerName) {
    console.log('👤 Membuka chat dengan:', partnerId, partnerName);
    
    currentChatPartnerId = partnerId;
    currentChatRoomId = [currentUserId, partnerId].sort().join('_');
    console.log('🔑 Room ID yang dibuat:', currentChatRoomId);
    
    // Tampilkan area chat, sembunyikan placeholder
    chatWidgetPlaceholder.style.display = 'none';
    chatWidgetChatArea.style.display = 'flex'; // DIPERBAIKI: Menggunakan flex agar layout benar
    
    // Highlight user aktif
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-widget-user[data-uid="${partnerId}"]`)?.classList.add('active');
    
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
            const isSent = msg.senderId === currentUserId;
            
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
    console.log('📤 Mencoba kirim pesan...');
    
    const text = chatWidgetInput.value.trim();
    console.log('Teks pesan:', text);
    console.log('Chat Room ID:', currentChatRoomId);
    
    if (!text) {
        console.warn('⚠️ Pesan kosong!');
        return;
    }
    
    if (!currentChatRoomId) {
        console.error('❌ Belum pilih user untuk diajak chat!');
        alert('Pilih pengguna di daftar terlebih dahulu');
        return;
    }
    
    try {
        const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
        
        push(messagesRef, {
            senderId: currentUserId,
            text: text,
            timestamp: serverTimestamp()
        }).then(() => {
            console.log('✅ Pesan berhasil dikirim!');
            chatWidgetInput.value = ''; // Kosongkan input
            chatWidgetInput.focus();    // Kembalikan fokus ke input
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
