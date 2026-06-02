import { AuthService } from './auth-service.js';

// ==========================================================================
// HANDLE SISTEM OTENTIKASI & VALIDASI TOMBOL LOGIN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Cek status autentikasi aktif saat halaman dimuat
    try {
        const loggedInUser = AuthService.checkAuth();
        if (loggedInUser) {
            // Jika sudah terdaftar sesi aktif, langsung lompat ke dashboard
            window.location.href = 'index.html';
        }
    } catch(e) {
        console.log("Sistem autentikasi lokal siap menerima input pengguna.");
    }

    const loginForm = document.getElementById('landingLoginForm');
    const errorMsg = document.getElementById('errorMsg');
    const btnLogin = document.getElementById('btnLogin');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Atur ulang status elemen error & tombol
            errorMsg.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'MEMPROSES...';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                // Eksekusi fungsi login utama pada core service
                const result = await AuthService.login(email, password);
                
                if (result && result.success) {
                    // Berhasil masuk, alihkan ke dashboard admin/guru
                    window.location.href = 'index.html';
                } else {
                    // Kasus validasi data salah dari database
                    errorMsg.textContent = result ? result.message : 'Akses ditolak. Email atau password salah.';
                    errorMsg.style.display = 'block';
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'MASUK PORTAL';
                }
            } catch (err) {
                // Kasus koneksi internet mati atau server Firebase crash
                console.error("Firebase Connection Error:", err);
                errorMsg.textContent = 'Gagal terhubung ke server database Firebase.';
                errorMsg.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.textContent = 'MASUK PORTAL';
            }
        });
    }
});
