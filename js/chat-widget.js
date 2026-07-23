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

// Fungsi untuk encode email (replace . dengan _)
function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

// Initialize Widget
export function initChatWidget() {
    console.log('🚀 Initializing personal chat widget...');
    createWidgetHTML();
    
    // Ambil elemen DOM
    chatWidgetBtn = document.getElementById('chatWidgetBtn');
    chatWidgetContainer = document.getElementById('chatWidgetContainer');
    chatWidgetUsers = document.getElementById('chatWidgetUsers');
    chatWidgetMessages = document.getElementById('chatWidgetMessages');
    chatWidgetInput = document.getElementById('chatWidgetInput');
    sendBtn = document.getElementById('chatWidgetSendBtn');
    chatWidgetChatArea = document.getElementById('chatWidgetChatArea');
    chatWidgetHeaderName = document.getElementById('chatWidgetHeaderName');
    chatWidgetHeaderStatus = document.getElementById('chatWidgetHeaderStatus');
    
    // Event Listeners
    if (chatWidgetBtn) chatWidgetBtn.addEventListener('click', toggleChat);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatWidgetInput) {
        chatWidgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // Cek user login
    checkExistingUser();
}

// Cek user yang sedang login
function checkExistingUser() {
    const userData = localStorage.getItem('sipelita_user');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            currentUserId = user.email;
            currentUserIdSafe = encodeEmail(user.email);
            currentUserName = user.nama || user.name || user.email.split('@')[0];
            
            console.log('✅ User terdeteksi:', currentUserName);
            
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
    }).catch((error) => {
        console.error('❌ Error simpan ke RTDB:', error);
    });
}

// Create Widget HTML (Personal Chat Version)
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
                <button class="close-btn" id="chatWidgetCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
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
    
    // Event listener close button
    document.getElementById('chatWidgetCloseBtn').addEventListener('click', () => {
        chatWidgetContainer.classList.remove('active');
    });
    
    // Event listener back button
    document.getElementById('chatWidgetBackBtn').addEventListener('click', () => {
        showUserList();
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
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Belum ada pengguna lain</div>';
            return;
        }
        
        let userCount = 0;
        Object.keys(users).forEach(uidSafe => {
            if (uidSafe === currentUserIdSafe) return; // Jangan tampilkan diri sendiri
            
            const user = users[uidSafe];
            const isOnline = user.status === 'online';
            const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
            const lastSeen = user.lastSeen || 0;
            
            // Format last seen
            let statusText = 'Offline';
            if (isOnline) {
                statusText = 'Online';
            } else if (lastSeen) {
                const date = new Date(lastSeen);
                const now = new Date();
                const diffMinutes = Math.floor((now - date) / 60000);
                
                if (diffMinutes < 1) {
                    statusText = 'Baru saja';
                } else if (diffMinutes < 60) {
                    statusText = `${diffMinutes} menit yang lalu`;
                } else if (diffMinutes < 1440) {
                    const hours = Math.floor(diffMinutes / 60);
                    statusText = `${hours} jam yang lalu`;
                } else {
                    statusText = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                }
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
    console.log('👤 Membuka chat dengan:', partnerName);
    
    currentChatPartnerId = partnerIdSafe;
    currentChatRoomId = [currentUserIdSafe, partnerIdSafe].sort().join('_');
    
    // Update header chat
    chatWidgetHeaderName.textContent = partnerName;
    
    // Format status di header
    if (isOnline) {
        chatWidgetHeaderStatus.textContent = '🟢 Online';
        chatWidgetHeaderStatus.style.color = '#10b981';
    } else if (lastSeen) {
        const date = new Date(lastSeen);
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        chatWidgetHeaderStatus.textContent = `⏰ Terakhir dilihat ${timeStr}`;
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    } else {
        chatWidgetHeaderStatus.textContent = 'Offline';
        chatWidgetHeaderStatus.style.color = '#94a3b8';
    }
    
    // Update avatar
    document.getElementById('chatWidgetAvatar').textContent = partnerName.charAt(0).toUpperCase();
    
    // Tampilkan area chat, sembunyikan user list
    chatWidgetUsers.style.display = 'none';
    chatWidgetChatArea.style.display = 'flex';
    
    // Highlight user aktif
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"]`)?.classList.add('active');
    
    // Load messages
    listenMessages();
    
    // Listen partner status changes
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
            const date = new Date(lastSeen);
            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            chatWidgetHeaderStatus.textContent = `⏰ Terakhir dilihat ${timeStr}`;
            chatWidgetHeaderStatus.style.color = '#94a3b8';
        } else {
            chatWidgetHeaderStatus.textContent = 'Offline';
            chatWidgetHeaderStatus.style.color = '#94a3b8';
        }
        
        // Update status di user list juga
        const userEl = document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"] .user-status`);
        if (userEl) {
            if (isOnline) {
                userEl.textContent = ' Online';
                userEl.style.color = '#10b981';
            } else if (lastSeen) {
                const date = new Date(lastSeen);
                const diffMinutes = Math.floor((new Date() - date) / 60000);
                let statusText = 'Offline';
                if (diffMinutes < 1) statusText = 'Baru saja';
                else if (diffMinutes < 60) statusText = `${diffMinutes} menit yang lalu`;
                else if (diffMinutes < 1440) statusText = `${Math.floor(diffMinutes / 60)} jam yang lalu`;
                else statusText = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                
                userEl.textContent = ` ${statusText}`;
                userEl.style.color = '#94a3b8';
            }
        }
        
        // Update online dot di avatar
        const statusDot = document.querySelector(`.chat-widget-user[data-uid="${partnerIdSafe}"] .status-dot`);
        if (statusDot) {
            statusDot.style.display = isOnline ? 'block' : 'none';
        }
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
            chatWidgetMessages.innerHTML = `
                <div style="text-align:center;color:#999;padding:40px">
                    <i class="fas fa-comments" style="font-size:48px;opacity:0.3;margin-bottom:10px"></i>
                    <p>Belum ada pesan. Sapa dia!</p>
                </div>
            `;
            return;
        }
        
        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserIdSafe;
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            const msgEl = document.createElement('div');
            msgEl.className = `chat-widget-message ${isSent ? 'sent' : 'received'}`;
            
            msgEl.innerHTML = `
                <div class="message-text">${msg.text}</div>
                <div class="message-time">${time}</div>
            `;
            
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
    } catch (error) {
        console.error('❌ Error di sendMessage:', error);
        alert('Terjadi kesalahan: ' + error.message);
    }
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
