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
let currentUserIdSafe = null;
let currentChatPartnerId = null;
let currentChatRoomId = null;
let currentUserName = 'User';

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetUsers, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetChatArea, chatWidgetHeaderName, chatWidgetHeaderStatus;

// Fungsi untuk encode email
function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

// Initialize Widget
export function initChatWidget() {
    console.log('🚀 [Chat Widget] Memulai inisialisasi...');
    createWidgetHTML();
    
    // Ambil elemen DOM dengan safety check
    chatWidgetBtn = document.getElementById('chatWidgetBtn');
    chatWidgetContainer = document.getElementById('chatWidgetContainer');
    chatWidgetUsers = document.getElementById('chatWidgetUsers');
    chatWidgetMessages = document.getElementById('chatWidgetMessages');
    chatWidgetInput = document.getElementById('chatWidgetInput');
    sendBtn = document.getElementById('chatWidgetSendBtn');
    chatWidgetChatArea = document.getElementById('chatWidgetChatArea');
    chatWidgetHeaderName = document.getElementById('chatWidgetHeaderName');
    chatWidgetHeaderStatus = document.getElementById('chatWidgetHeaderStatus');
    
    if (!chatWidgetBtn) {
        console.error('❌ [Chat Widget] Gagal membuat elemen HTML. Cek console di atas.');
        return;
    }
    console.log('✅ [Chat Widget] Elemen HTML berhasil dibuat.');

    // Event Listeners
    chatWidgetBtn.addEventListener('click', toggleChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatWidgetInput) {
        chatWidgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    const closeBtn = document.getElementById('chatWidgetCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => chatWidgetContainer.classList.remove('active'));
    
    const backBtn = document.getElementById('chatWidgetBackBtn');
    if (backBtn) backBtn.addEventListener('click', showUserList);
    
    // Cek user login
    checkExistingUser();
}

// Cek user yang sedang login
function checkExistingUser() {
    const userData = localStorage.getItem('sipelita_user');
    console.log('🔍 [Chat Widget] Cek localStorage:', userData ? 'Ada data' : 'Tidak ada data');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            currentUserId = user.email;
            currentUserIdSafe = encodeEmail(user.email);
            currentUserName = user.nama || user.name || user.email.split('@')[0];
            
            console.log('✅ [Chat Widget] User terdeteksi:', currentUserName);
            setupUserInRTDB();
            setupPresence();
            loadUsers();
        } catch (error) {
            console.error('❌ [Chat Widget] Error parsing user data:', error);
        }
    } else {
        console.warn('⚠️ [Chat Widget] Tidak ada user login di localStorage. Widget tetap tampil tapi tidak bisa chat.');
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
    }).catch((error) => console.error('❌ Error simpan ke RTDB:', error));
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
                <div>
                    <h3><i class="fas fa-user"></i> Chat Sipelita</h3>
                    <small style="opacity:0.8">Personal Chat</small>
                </div>
                <button class="close-btn" id="chatWidgetCloseBtn"><i class="fas fa-times"></i></button>
            </div>
            
            <div id="chatWidgetUsers" class="chat-widget-users">
                <div style="padding:20px;text-align:center;color:#999">Memuat pengguna...</div>
            </div>
            
            <div id="chatWidgetChatArea" class="chat-widget-chat-area" style="display: none;">
                <div class="chat-widget-chat-header">
                    <button class="chat-widget-back-btn" id="chatWidgetBackBtn">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </button>
                    <div class="chat-widget-chat-user-info">
                        <div class="chat-widget-avatar" id="chatWidgetAvatar">U</div>
                        <div>
                            <div class="chat-widget-chat-name" id="chatWidgetHeaderName">Nama User</div>
                            <div class="chat-widget-chat-status" id="chatWidgetHeaderStatus">Offline</div>
                        </div>
                    </div>
                </div>
                <div id="chatWidgetMessages" class="chat-widget-messages"></div>
                <div class="chat-widget-input">
                    <input type="text" id="chatWidgetInput" placeholder="Ketik pesan...">
                    <button id="chatWidgetSendBtn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

// Toggle Chat Widget
function toggleChat() {
    chatWidgetContainer.classList.toggle('active');
}

// Show User List (Kembali ke daftar pengguna)
function showUserList() {
    chatWidgetUsers.style.display = 'block';
    chatWidgetChatArea.style.display = 'none';
    currentChatPartnerId = null;
    currentChatRoomId = null;
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
}

// Setup Presence
function setupPresence() {
    const userStatusRef = ref(db, `users/${currentUserIdSafe}/status`);
    const userLastSeenRef = ref(db, `users/${currentUserIdSafe}/lastSeen`);
    const connectedRef = ref(db, '.info/connected');
    
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(userStatusRef, 'online');
            onDisconnect(userStatusRef).set('offline');
            onDisconnect(userLastSeenRef).set(serverTimestamp());
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
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Belum ada pengguna lain</div>';
            return;
        }
        
        let userCount = 0;
        Object.keys(users).forEach(uidSafe => {
            if (uidSafe === currentUserIdSafe) return;
            
            const user = users[uidSafe];
            const isOnline = user.status === 'online';
            const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
            const lastSeen = user.lastSeen || 0;
            
            let statusText = 'Offline';
            if (isOnline) {
                statusText = 'Online';
            } else if (lastSeen) {
                const date = new Date(lastSeen);
                const diffMinutes = Math.floor((new Date() - date) / 60000);
                if (diffMinutes < 1) statusText = 'Baru saja';
                else if (diffMinutes < 60) statusText = `${diffMinutes} menit yang lalu`;
                else if (diffMinutes < 1440) statusText = `${Math.floor(diffMinutes / 60)} jam yang lalu`;
                else statusText = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            }
            
            const userEl = document.createElement('div');
            userEl.className = 'chat-widget-user';
            userEl.dataset.uid = uidSafe;
            userEl.innerHTML = `
                <div class="avatar">
                    ${displayName.charAt(0).toUpperCase()}
                    ${isOnline ? '<div class="status-dot"></div>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${displayName}</div>
                    <div class="user-status" style="color: ${isOnline ? '#10b981' : '#94a3b8'}">
                        ${isOnline ? '🟢 Online' : `⏰ ${statusText}`}
                    </div>
                </div>
            `;
            
            userEl.addEventListener('click', () => openChat(uidSafe, displayName, isOnline, lastSeen));
            chatWidgetUsers.appendChild(userEl);
            userCount++;
        });
        
        if (userCount === 0) {
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Anda satu-satunya yang online</div>';
        }
    });
}

// Open Chat
function openChat(partnerIdSafe, partnerName, isOnline, lastSeen) {
    currentChatPartnerId = partnerIdSafe;
    currentChatRoomId = [currentUserIdSafe, partnerIdSafe].sort().join('_');
    
    chatWidgetHeaderName.textContent = partnerName;
    if (isOnline) {
        chatWidgetHeaderStatus.textContent = '🟢 Online';
        chatWidgetHeaderStatus.style.color = '#10b981';
    } else if (lastSeen) {
        const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        chatWidgetHeaderStatus.textContent = `⏰ Terakhir dilihat ${timeStr}`;
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    } else {
        chatWidgetHeaderStatus.textContent = 'Offline';
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    }
    
    document.getElementById('chatWidgetAvatar').textContent = partnerName.charAt(0).toUpperCase();
    chatWidgetUsers.style.display = 'none';
    chatWidgetChatArea.style.display = 'flex';
    
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"]`)?.classList.add('active');
    
    listenMessages();
    listenPartnerStatus(partnerIdSafe);
}

// Listen Partner Status Changes
function listenPartnerStatus(partnerIdSafe) {
    const partnerRef = ref(db, `users/${partnerIdSafe}`);
    onValue(partnerRef, (snapshot) => {
        const user = snapshot.val();
        if (!user) return;
        
        const isOnline = user.status === 'online';
        const lastSeen = user.lastSeen || 0;
        
        if (isOnline) {
            chatWidgetHeaderStatus.textContent = '🟢 Online';
            chatWidgetHeaderStatus.style.color = '#10b981';
        } else if (lastSeen) {
            const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            chatWidgetHeaderStatus.textContent = `⏰ Terakhir dilihat ${timeStr}`;
            chatWidgetHeaderStatus.style.color = '#94a3b8';
        }
        
        // Update di list juga
        const userEl = document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"] .user-status`);
        if (userEl) {
            if (isOnline) {
                userEl.textContent = '🟢 Online';
                userEl.style.color = '#10b981';
            } else if (lastSeen) {
                const diffMinutes = Math.floor((new Date() - new Date(lastSeen)) / 60000);
                let statusText = 'Offline';
                if (diffMinutes < 1) statusText = 'Baru saja';
                else if (diffMinutes < 60) statusText = `${diffMinutes} menit yang lalu`;
                else if (diffMinutes < 1440) statusText = `${Math.floor(diffMinutes / 60)} jam yang lalu`;
                else statusText = new Date(lastSeen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                userEl.textContent = `⏰ ${statusText}`;
                userEl.style.color = '#94a3b8';
            }
        }
        
        const statusDot = document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"] .status-dot`);
        if (statusDot) statusDot.style.display = isOnline ? 'block' : 'none';
    });
}

// Listen Messages
function listenMessages() {
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onValue(messagesQuery, (snapshot) => {
        chatWidgetMessages.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            chatWidgetMessages.innerHTML = `<div style="text-align:center;color:#999;padding:40px"><i class="fas fa-comments" style="font-size:48px;opacity:0.3;margin-bottom:10px"></i><p>Belum ada pesan. Sapa dia!</p></div>`;
            return;
        }
        
        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserIdSafe;
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            const msgEl = document.createElement('div');
            msgEl.className = `chat-widget-message ${isSent ? 'sent' : 'received'}`;
            msgEl.innerHTML = `<div class="message-text">${msg.text}</div><div class="message-time">${time}</div>`;
            chatWidgetMessages.appendChild(msgEl);
        });
        chatWidgetMessages.scrollTop = chatWidgetMessages.scrollHeight;
    });
}

// Send Message
function sendMessage() {
    const text = chatWidgetInput.value.trim();
    if (!text || !currentChatRoomId) return;
    
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    push(messagesRef, {
        senderId: currentUserIdSafe,
        senderName: currentUserName,
        text: text,
        timestamp: serverTimestamp()
    }).then(() => {
        chatWidgetInput.value = '';
        chatWidgetInput.focus();
    }).catch((error) => {
        console.error('❌ Error kirim pesan:', error);
        alert('Gagal kirim pesan: ' + error.message);
    });
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
