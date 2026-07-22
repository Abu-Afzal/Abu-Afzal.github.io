// Import Firebase SDK (Modular v10.7.1)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, ref, set, push, onValue, onDisconnect, serverTimestamp, query, orderByChild, limitToLast 
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
let currentUserName = 'User';
const GROUP_CHAT_ID = 'group_chat_sipelita'; // ID room chat grup

// DOM Elements
let chatWidgetBtn, chatWidgetContainer, chatWidgetMessages, chatWidgetInput, sendBtn, chatWidgetOnlineUsers;

// Fungsi untuk encode email (replace . dengan _)
function encodeEmail(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_at_');
}

// Initialize Widget
export function initChatWidget() {
    console.log('🚀 Initializing group chat widget...');
    createWidgetHTML();
    
    // Ambil elemen DOM
    chatWidgetBtn = document.getElementById('chatWidgetBtn');
    chatWidgetContainer = document.getElementById('chatWidgetContainer');
    chatWidgetMessages = document.getElementById('chatWidgetMessages');
    chatWidgetInput = document.getElementById('chatWidgetInput');
    sendBtn = document.getElementById('chatWidgetSendBtn');
    chatWidgetOnlineUsers = document.getElementById('chatWidgetOnlineUsers');
    
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
            loadGroupMessages();
            trackOnlineUsers();
            
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

// Create Widget HTML (Group Chat Version)
function createWidgetHTML() {
    const widgetHTML = `
        <button id="chatWidgetBtn" class="chat-widget-btn">
            <i class="fas fa-comments"></i>
            <span class="badge" id="chatWidgetBadge" style="display:none">0</span>
        </button>
        
        <div id="chatWidgetContainer" class="chat-widget-container">
            <div class="chat-widget-header">
                <div>
                    <h3><i class="fas fa-users"></i> Grup Sipelita</h3>
                    <small id="chatWidgetOnlineUsers" style="opacity:0.8">0 online</small>
                </div>
                <button class="close-btn" id="chatWidgetCloseBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div id="chatWidgetMessages" class="chat-widget-messages">
                <div style="text-align:center;color:#999;padding:20px">Memuat pesan...</div>
            </div>
            
            <div class="chat-widget-input">
                <input type="text" id="chatWidgetInput" placeholder="Ketik pesan untuk grup...">
                <button id="chatWidgetSendBtn"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    
    // Event listener close button
    document.getElementById('chatWidgetCloseBtn').addEventListener('click', () => {
        chatWidgetContainer.classList.remove('active');
    });
}

// Toggle Chat Widget
function toggleChat() {
    chatWidgetContainer.classList.toggle('active');
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

// Track Online Users
function trackOnlineUsers() {
    const usersRef = ref(db, 'users');
    
    onValue(usersRef, (snapshot) => {
        const users = snapshot.val();
        let onlineCount = 0;
        
        if (users) {
            Object.values(users).forEach(user => {
                if (user.status === 'online') {
                    onlineCount++;
                }
            });
        }
        
        const onlineUsersEl = document.getElementById('chatWidgetOnlineUsers');
        if (onlineUsersEl) {
            onlineUsersEl.textContent = `${onlineCount} pengguna online`;
        }
    });
}

// Load Group Messages
function loadGroupMessages() {
    const messagesRef = ref(db, `chats/${GROUP_CHAT_ID}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50));
    
    onValue(messagesQuery, (snapshot) => {
        chatWidgetMessages.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            chatWidgetMessages.innerHTML = `
                <div style="text-align:center;color:#999;padding:40px">
                    <i class="fas fa-comments" style="font-size:48px;opacity:0.3;margin-bottom:10px"></i>
                    <p>Belum ada pesan. Jadilah yang pertama mengobrol!</p>
                </div>
            `;
            return;
        }
        
        Object.keys(messages).forEach(key => {
            const msg = messages[key];
            const isSent = msg.senderId === currentUserIdSafe;
            const senderName = msg.senderName || 'User';
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '';
            
            const msgEl = document.createElement('div');
            msgEl.className = `chat-widget-message ${isSent ? 'sent' : 'received'}`;
            
            msgEl.innerHTML = `
                <div class="message-sender" style="font-size:11px;color:#075e54;font-weight:600;margin-bottom:3px">
                    ${senderName}
                </div>
                <div class="message-text">${msg.text}</div>
                <div class="message-time" style="font-size:10px;color:#999;text-align:right;margin-top:3px">${time}</div>
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
    
    try {
        const messagesRef = ref(db, `chats/${GROUP_CHAT_ID}/messages`);
        
        push(messagesRef, {
            senderId: currentUserIdSafe,
            senderName: currentUserName,
            senderEmail: currentUserId,
            text: text,
            timestamp: serverTimestamp()
        }).then(() => {
            chatWidgetInput.value = '';
            chatWidgetInput.focus();
        }).catch((error) => {
            console.error(' Error kirim pesan:', error);
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
