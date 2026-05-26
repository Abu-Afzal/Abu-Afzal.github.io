// js/auth-service.js
import { db } from './firebase-config.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// FIXED: Semua import digabungkan dan diletakkan di paling atas file
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();

export const AuthService = {
    // Fungsi Login
    async login(email, password) {
        try {
            // 1. Login via Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Cek Role di Firestore menggunakan Query Email
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const userData = docSnap.data();
                
                // Simpan info user di LocalStorage agar tidak hilang saat refresh
                localStorage.setItem('sipelita_user', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    nama: userData.nama,
                    role: userData.role
                }));
                return { success: true, role: userData.role, nama: userData.nama };
            } else {
                // Jika email ada di Auth tapi tidak di Firestore (User belum didaftarkan admin)
                return { success: false, message: "Akun Anda belum terdaftar di sistem SIPELITA." };
            }
        } catch (error) {
            return { success: false, message: this.getErrorMessage(error.code) };
        }
    },

    // Fungsi Logout
    async logout() {
        try {
            await signOut(auth);
            localStorage.removeItem('sipelita_user');
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Gagal logout:", error);
        }
    },

    // Cek Status Login (untuk proteksi halaman)
    checkAuth() {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Helper Pesan Error
    getErrorMessage(code) {
        switch(code) {
            case 'auth/user-not-found': return 'Email tidak terdaftar';
            case 'auth/wrong-password': return 'Password salah';
            case 'auth/invalid-email': return 'Format email salah';
            case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
            default: return 'Login gagal. Coba lagi.';
        }
    }
};

// EXPORT GLOBAL: Agar tombol HTML yang menggunakan onclick="logoutPengguna()" tetap bisa memanggilnya langsung
window.logoutPengguna = async function() {
    await AuthService.logout();
};
