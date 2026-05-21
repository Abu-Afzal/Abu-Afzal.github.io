// Konfigurasi User Demo (Untuk Produksi, gunakan Backend!)
const DEMO_USERS = {
    admin: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'Administrator Sistem',
        permissions: ['all']
    },
    guru: {
        username: 'guru',
        password: 'guru123',
        role: 'guru',
        name: 'Guru Pengajar',
        permissions: ['view_dashboard', 'view_rapor', 'view_absensi']
    }
};

// Cek apakah user sudah login
function checkAuth() {
    const user = localStorage.getItem('sipelita_user');
    const token = localStorage.getItem('sipelita_token');
    
    if (user && token) {
        return JSON.parse(user);
    }
    return null;
}

// Login function
async function login(username, password, role) {
    // Simulasi delay network
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const user = DEMO_USERS[role];
    
    if (user && user.username === username && user.password === password) {
        // Buat token sederhana (untuk demo)
        const token = btoa(`${user.username}-${Date.now()}`);
        
        // Simpan ke localStorage
        const userData = {
            username: user.username,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('sipelita_user', JSON.stringify(userData));
        localStorage.setItem('sipelita_token', token);
        
        return { success: true, user: userData };
    }
    
    return { success: false, error: 'Username, password, atau role tidak sesuai' };
}

// Logout function
function logout() {
    localStorage.removeItem('sipelita_user');
    localStorage.removeItem('sipelita_token');
    window.location.href = 'login.html';
}

// Redirect jika belum login
function requireAuth() {
    const user = checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Cek permission
function hasPermission(permission) {
    const user = checkAuth();
    if (!user) return false;
    
    // Admin punya semua akses
    if (user.role === 'admin' || user.permissions.includes('all')) {
        return true;
    }
    
    return user.permissions.includes(permission);
}

// Event Listener untuk Form Login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const errorMsg = document.getElementById('errorMsg');
            const loginBtn = document.getElementById('loginBtn');
            
            // Validasi input
            if (!username || !password || !role) {
                showError('Semua field harus diisi', errorMsg);
                return;
            }
            
            // Loading state
            loginBtn.disabled = true;
            loginBtn.querySelector('.btn-text').style.display = 'none';
            loginBtn.querySelector('.btn-loading').style.display = 'inline';
            errorMsg.classList.remove('show');
            
            // Proses login
            const result = await login(username, password, role);
            
            if (result.success) {
                // Redirect ke dashboard
                window.location.href = 'index.html';
            } else {
                // Tampilkan error
                showError(result.error, errorMsg);
                
                // Reset button
                loginBtn.disabled = false;
                loginBtn.querySelector('.btn-text').style.display = 'inline';
                loginBtn.querySelector('.btn-loading').style.display = 'none';
            }
        });
    }
    
    // Auto-redirect jika sudah login di halaman login
    if (window.location.pathname.includes('login.html')) {
        const user = checkAuth();
        if (user) {
            window.location.href = 'index.html';
        }
    }
});

function showError(message, element) {
    element.textContent = message;
    element.classList.add('show');
}

// Export functions untuk digunakan di file lain
window.Auth = {
    checkAuth,
    login,
    logout,
    requireAuth,
    hasPermission
};
