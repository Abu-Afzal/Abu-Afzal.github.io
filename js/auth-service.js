// js/auth-service.js
import { db } from './firebase-config.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();

export const AuthService = {
    // Fungsi Login
    async login(email, password) {
        try {
            // 1. Login via Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Cek Role di Firestore
            const docRef = doc(db, "users", user.email); // ID dokumen = email
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
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
        await signOut(auth);
        localStorage.removeItem('sipelita_user');
        window.location.href = 'login.html';
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
