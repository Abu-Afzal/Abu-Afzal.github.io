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
    // Fungsi Login Modifikasi Otomatis (Aktivasi Mandiri)
    async login(email, password) {
        try {
            const formatEmail = email.trim().toLowerCase();

            // 1. Cek dulu apakah data email ini ada di Firestore Koleksi Users
            const q = query(collection(db, "users"), where("email", "==", formatEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, message: "Akun Anda belum terdaftar di sistem SIPELITA." };
            }

            const docSnap = querySnapshot.docs[0];
            const userData = docSnap.data();

            // 2. Jalankan Proses Sign In atau Auto Register ke Firebase Auth
            let user;
            try {
                // Coba login normal jika akun auth-nya sudah terbentuk
                const userCredential = await signInWithEmailAndPassword(auth, formatEmail, password);
                user = userCredential.user;
            } catch (authError) {
                // Jika password salah pada akun yang sudah aktif
                if (authError.code === 'auth/wrong-password') {
                    return { success: false, message: 'Password salah. Silakan periksa kembali.' };
                }
                
                // JIKA AKUN BELUM AKTIF DI AUTH (Tetapi password yang diketik sesuai dengan data dari Admin di Firestore)
                if (authError.code === 'auth/user-not-found' && password === userData.password) {
                    // Import fungsi register dinamis bawaan firebase auth
                    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
                    
                    // Buatkan akun Authentication-nya secara otomatis saat itu juga!
                    const newCredential = await createUserWithEmailAndPassword(auth, formatEmail, password);
                    user = newCredential.user;
                } else {
                    return { success: false, message: 'Login gagal. Email/password tidak cocok dengan data sistem.' };
                }
            }

            // 3. Jika Berhasil, Simpan info user di LocalStorage
            localStorage.setItem('sipelita_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                nama: userData.nama,
                role: userData.role
            }));
            
            return { success: true, role: userData.role, nama: userData.nama };

        } catch (error) {
            return { success: false, message: this.getErrorMessage(error.code) };
        }
    },
// EXPORT GLOBAL: Agar tombol HTML yang menggunakan onclick="logoutPengguna()" tetap bisa memanggilnya langsung
window.logoutPengguna = async function() {
    await AuthService.logout();
};
