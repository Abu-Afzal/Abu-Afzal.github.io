// Import Firebase SDK (Modular v10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// State untuk notifikasi
let lastReadTimestamp = {}; // Waktu terakhir chat dibuka per partner
let currentOpenChat = null; 

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetUsers, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetChatArea, chatWidgetHeaderName, chatWidgetHeaderStatus;

function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

export function initChatWidget() {
    console.log('🚀 [Chat Widget] Memulai inisialisasi...');
    createWidgetHTML();
    
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
        console.error('❌ [Chat Widget] Gagal membuat elemen HTML.');
        return;
    }

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
    
    checkExistingUser();
}

function checkExistingUser() {
    const userData = localStorage.getItem('sipelita_user');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            currentUserId = user.email;
            currentUserIdSafe = encodeEmail(user.email);
            currentUserName = user.nama || user.name || user.email.split('@')[0];
            
            setupUserInRTDB();
            setupPresence();
            loadUsers();
            listenForNewMessages();
        } catch (error) {
            console.error('❌ [Chat Widget] Error parsing user data:', error);
        }
    }
}

function setupUserInRTDB() {
    const userRef = ref(db, `users/${currentUserIdSafe}`);
    set(userRef, {
        name: currentUserName,
        email: currentUserId,
        status: 'online',
        lastSeen: serverTimestamp()
    }).catch((error) => console.error('❌ Error simpan ke RTDB:', error));
}

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
                    <div class="chat-widget-chat-user-info">
                        <button class="chat-widget-back-icon" id="chatWidgetBackBtn">
                            <i class="fas fa-chevron-left"></i>
                        </button>
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

function toggleChat() {
    chatWidgetContainer.classList.toggle('active');
}

function showUserList() {
    chatWidgetUsers.style.display = 'block';
    chatWidgetChatArea.style.display = 'none';
    
    if (currentOpenChat) {
        // Tandai waktu baca saat kembali ke list
        lastReadTimestamp[currentOpenChat] = Date.now();
        updateNotificationBadge();
        currentOpenChat = null;
    }
    
    currentChatPartnerId = null;
    currentChatRoomId = null;
    document.querySelectorAll('.chat-widget-user').forEach(el => el.classList.remove('active'));
}

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

function loadUsers() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        if (!chatWidgetUsers) return;
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
            if (!user.name || user.name === 'User' || user.name.length < 3) return;
            
            const isOnline = user.status === 'online';
            const displayName = user.name;
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
                        ${isOnline ? ' Online' : statusText}
                    </div>
                </div>
            `;
            
            userEl.addEventListener('click', () => openChat(uidSafe, displayName, isOnline, lastSeen));
            chatWidgetUsers.appendChild(userEl);
            userCount++;
        });
        
        if (userCount === 0) {
            chatWidgetUsers.innerHTML = '<div style="padding:20px;text-align:center;color:#999">Tidak ada pengguna lain</div>';
        }
    });
}

function openChat(partnerIdSafe, partnerName, isOnline, lastSeen) {
    currentChatPartnerId = partnerIdSafe;
    currentChatRoomId = [currentUserIdSafe, partnerIdSafe].sort().join('_');
    currentOpenChat = partnerIdSafe; 
    
    // Tandai waktu baca dan reset notifikasi
    lastReadTimestamp[partnerIdSafe] = Date.now();
    updateNotificationBadge();
    
    chatWidgetHeaderName.textContent = partnerName;
    if (isOnline) {
        chatWidgetHeaderStatus.textContent = '🟢 Online';
        chatWidgetHeaderStatus.style.color = '#10b981';
    } else if (lastSeen) {
        const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        chatWidgetHeaderStatus.textContent = `Terakhir dilihat ${timeStr}`;
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

function listenPartnerStatus(partnerIdSafe) {
    const partnerRef = ref(db, `users/${partnerIdSafe}`);
    onValue(partnerRef, (snapshot) => {
        const user = snapshot.val();
        if (!user) return;
        
        const isOnline = user.status === 'online';
        const lastSeen = user.lastSeen || 0;
        
        if (isOnline) {
            chatWidgetHeaderStatus.textContent = ' Online';
            chatWidgetHeaderStatus.style.color = '#10b981';
        } else if (lastSeen) {
            const timeStr = new Date(lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            chatWidgetHeaderStatus.textContent = `Terakhir dilihat ${timeStr}`;
            chatWidgetHeaderStatus.style.color = '#94a3b8';
        }
    });
}

function listenMessages() {
    const messagesRef = ref(db, `chats/${currentChatRoomId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onValue(messagesQuery, (snapshot) => {
        if (!chatWidgetMessages) return;
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

// === DIPERBAIKI: Logika notifikasi yang akurat ===
function listenForNewMessages() {
    if (!currentUserIdSafe) return;
    const chatsRef = ref(db, 'chats');
    
    onValue(chatsRef, (snapshot) => {
        const chats = snapshot.val();
        if (!chats) return;
        
        let totalUnread = 0;
        
        Object.keys(chats).forEach(roomId => {
            if (roomId.includes(currentUserIdSafe)) {
                const roomData = chats[roomId];
                const messages = roomData.messages;
                if (!messages) return;
                
                const [user1, user2] = roomId.split('_');
                const partnerId = user1 === currentUserIdSafe ? user2 : user1;
                
                // Jika chat ini sedang dibuka, anggap sudah dibaca
                if (partnerId === currentOpenChat) {
                    lastReadTimestamp[partnerId] = Date.now();
                    return;
                }
                
                // Dapatkan waktu terakhir dibaca untuk partner ini
                const lastRead = lastReadTimestamp[partnerId] || 0;
                let roomUnread = 0;
                
                // Hitung HANYA pesan yang belum dibaca (timestamp > lastRead)
                Object.values(messages).forEach(msg => {
                    const msgTime = msg.timestamp || 0;
                    // Pesan dianggap belum dibaca jika:
                    // 1. Dari partner (bukan diri sendiri)
                    // 2. Timestamp pesan LEBIH BARU dari waktu terakhir dibaca
                    if (msg.senderId !== currentUserIdSafe && msgTime > lastRead) {
                        roomUnread++;
                    }
                });
                
                totalUnread += roomUnread;
            }
        });
        
        updateNotificationBadge(totalUnread);
    });
}

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

function updateNotificationBadge(totalCount) {
    const badge = document.getElementById('chatWidgetBadge');
    if (!badge) return;
    
    if (totalCount && totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : totalCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
