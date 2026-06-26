// js/auth-service.js
import { db } from './firebase-config.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, // FIXED: Dipindahkan ke atas agar stabil & tidak memicu CORS error
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();

// Helper Pesan Error (Dipindahkan ke fungsi mandiri agar tidak rusak oleh konteks 'this')
function dapatkanPesanError(code) {
    switch(code) {
        case 'auth/user-not-found': 
        case 'auth/invalid-credential': 
            return 'Email atau password salah / tidak terdaftar.';
        case 'auth/wrong-password': 
            return 'Password salah. Silakan periksa kembali.';
        case 'auth/invalid-email': 
            return 'Format email salah.';
        case 'auth/too-many-requests': 
            return 'Terlalu banyak percobaan login gagal. Coba lagi nanti.';
        default: 
            return 'Login gagal. Periksa koneksi internet Anda.';
    }
}

// ══════════════════════════════════════════════
// 🔐 AUTO-LOGOUT SESSION TIMEOUT
// ══════════════════════════════════════════════
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 jam
const ACTIVITY_KEY = 'sipelita_last_activity';

function updateActivityTimestamp() {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
}

function checkSessionTimeout() {
    const lastActivity = localStorage.getItem(ACTIVITY_KEY);
    const sipelitaUser = localStorage.getItem('sipelita_user');
    
    if (!sipelitaUser) return true;
    
    if (!lastActivity) {
        updateActivityTimestamp();
        return true;
    }
    
    const elapsed = Date.now() - parseInt(lastActivity);
    
    if (elapsed > SESSION_TIMEOUT_MS) {
        console.log('⏰ Session timeout setelah', Math.round(elapsed / 1000 / 60 / 60), 'jam');
        
        localStorage.removeItem('sipelita_user');
        localStorage.removeItem(ACTIVITY_KEY);
        sessionStorage.removeItem('sipelita_user');
        
        alert('⏰ Session Anda telah berakhir karena tidak ada aktivitas selama 24 jam.\n\nSilakan login kembali.');
        
        // Redirect ke halaman login
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

function setupActivityListeners() {
    let throttleTimer = null;
    const activities = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    activities.forEach(event => {
        document.addEventListener(event, () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    updateActivityTimestamp();
                    throttleTimer = null;
                }, 30000);
            }
        }, { passive: true });
    });
}

// Jalankan saat file ini di-import
checkSessionTimeout();
setupActivityListeners();

// ══════════════════════════════════════════════
// AUTH SERVICE CLASS (KODE ASLI ANDA)
// ══════════════════════════════════════════════
export class AuthService {
    // ... kode existing Anda ...
}
export const AuthService = {
    // Fungsi Login Modifikasi Otomatis (Aktivasi Mandiri) - Versi Stabil Berhasil
async login(email, password) {
    try {
        const formatEmail = email.trim().toLowerCase();
        const formatPassword = password.trim();

        // 0. CLEAR SESSION LAMA sebelum login user baru
        localStorage.removeItem('sipelita_user');
        sessionStorage.removeItem('sipelita_user');

        // 1. Validasi awal: Cek ketersediaan data pengguna di Firestore koleksi "users"
        const q = query(collection(db, "users"), where("email", "==", formatEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Akun Anda belum terdaftar di sistem SIPELITA. Hubungi Admin." };
        }

        const docSnap = querySnapshot.docs[0];
        const userData = docSnap.data();

        // 2. Jalankan Proses Sign In atau Auto Register ke Firebase Auth
        let user;
        try {
            // Coba login normal jika akun auth-nya sudah diaktivasi sebelumnya
            const userCredential = await signInWithEmailAndPassword(auth, formatEmail, formatPassword);
            user = userCredential.user;
        } catch (authError) {
            console.log("Firebase Auth menganalisis status akun... Code:", authError.code);
            
            // Cek apakah akun belum aktif (user-not-found / invalid-credential) 
            // DAN password yang diketik guru cocok dengan password yang diset Admin di Firestore
            const akunBelumAktif = (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential');
            const passwordCocok = (formatPassword === userData.password);

            if (akunBelumAktif && passwordCocok) {
                console.log("Mempersiapkan pembuatan akun Authentication baru untuk:", formatEmail);
                
                // Buatkan kredensial login permanen secara otomatis di latar belakang
                const newCredential = await createUserWithEmailAndPassword(auth, formatEmail, formatPassword);
                user = newCredential.user;
            } else if (akunBelumAktif && !passwordCocok) {
                return { success: false, message: 'Akun Anda ditemukan, namun password awal salah.' };
            } else {
                return { success: false, message: dapatkanPesanError(authError.code) };
            }
        }

        // 3. Jika Berhasil (Login/Aktivasi), Simpan info user ke KEDUA storage
        const userDataLengkap = {
            uid: user.uid,
            email: user.email,
            nama: userData.nama,
            role: userData.role,
            fitur: userData.fitur || []  // ✅ TAMBAHKAN FIELD FITUR
        };
        
        // Simpan ke KEDUA storage agar konsisten
        localStorage.setItem('sipelita_user', JSON.stringify(userDataLengkap));
        sessionStorage.setItem('sipelita_user', JSON.stringify(userDataLengkap));
        
        console.log('✅ User login berhasil:', userDataLengkap);
        return { success: true, role: userData.role, nama: userData.nama };

    } catch (error) {
        console.error("Error pada sistem login utama:", error);
        return { success: false, message: dapatkanPesanError(error.code) };
    }
},

    // Cek Status Login (untuk proteksi halaman)
    checkAuth() {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// Daftarkan fungsi ke jendela browser global untuk penanganan tombol keluar
window.logoutPengguna = async function() {
    await AuthService.logout();
};
