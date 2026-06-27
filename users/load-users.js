import { db } from '../js/firebase-config.js';
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { labelFitur } from './fitur.js';

async function loadUsers(){

    const loadEl = document.getElementById('loadingUsers');
    const tblEl  = document.getElementById('tableUsers');
    const tbody  = document.getElementById('userTableBody');

    if(!loadEl || !tblEl || !tbody) return;

    try{
        loadEl.style.display = 'block';
        tblEl.style.display  = 'none';

        const snapshot = await getDocs(collection(db, 'users'));
        tbody.innerHTML = '';

        if(snapshot.empty){
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:#64748b; padding:20px;">
                        📭 Belum ada user terdaftar
                    </td>
                </tr>
            `;
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                
                // Render fitur badges
                let tampilanFitur = '-';
                try {
                    if (typeof labelFitur === 'function') {
                        tampilanFitur = labelFitur(data.fitur || []);
                    } else if (Array.isArray(data.fitur)) {
                        tampilanFitur = data.fitur.map(f => 
                            `<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600;margin-right:4px;">${f}</span>`
                        ).join('');
                    }
                } catch (e) {
                    tampilanFitur = Array.isArray(data.fitur) ? data.fitur.join(', ') : '-';
                }

                const badgeClass = data.role === 'admin' ? 'badge-admin' : 'badge-guru';
                const namaRole = data.role === 'admin' ? '👑 Admin' : '👤 Guru';

                // Escape password untuk keamanan (mencegah XSS)
                const rawPassword = data.password || '';
                const safePassword = rawPassword
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                // Render baris tabel dengan fitur toggle & copy password
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${data.nama || '-'}</strong></td>
                        <td>${data.email || '-'}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span id="pwd-${docSnap.id}" 
                                    style="font-family:'Courier New',monospace;font-weight:600;color:#1a237e;letter-spacing:1px;min-width:80px;">
                                    ${rawPassword ? '••••••••' : '••••••••'}
                                </span>
                                <button onclick="togglePassword('${docSnap.id}', '${safePassword}')" 
                                    style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.95rem;border-radius:4px;transition:all 0.2s;"
                                    onmouseover="this.style.background='#f1f5f9'"
                                    onmouseout="this.style.background='none'"
                                    title="Tampilkan/Sembunyikan password">
                                    👁️
                                </button>
                                <button onclick="copyPassword('${safePassword}')" 
                                    style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:0.95rem;border-radius:4px;transition:all 0.2s;"
                                    onmouseover="this.style.background='#f1f5f9'"
                                    onmouseout="this.style.background='none'"
                                    title="Copy password ke clipboard">
                                    📋
                                </button>
                            </div>
                        </td>
                        <td><span class="badge ${badgeClass}">${namaRole}</span></td>
                        <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                ${tampilanFitur}
                            </div>
                        </td>
                        <td>
    <button class="btn btn-warning btn-sm" onclick="if(window.bukaModalEdit){ window.bukaModalEdit('${docSnap.id}') }">✏️ Edit</button>
    <button class="btn btn-primary btn-sm" onclick="setPassword('${docSnap.id}', '${data.email.replace(/'/g, "\\'")}')" style="margin-left:5px;background:#10b981;">🔑 Set Password</button>
    <button class="btn btn-danger btn-sm" onclick="if(window.hapusUser){ window.hapusUser('${docSnap.id}') }" style="margin-left:5px;">🗑️ Hapus</button>
</td>
                    </tr>
                `;
            });
        }

        loadEl.style.display = 'none';
        tblEl.style.display  = 'block';

    } catch(err) {
        console.error(err);
        loadEl.innerHTML = `<div style="color:red; padding:20px;">❌ Gagal memuat data user: ${err.message}</div>`;
    }
}

// ══════════════════════════════════════════════
// 🔐 FITUR TOGGLE & COPY PASSWORD
// ══════════════════════════════════════════════

// Toggle show/hide password
window.togglePassword = (docId, password) => {
    const span = document.getElementById(`pwd-${docId}`);
    if (!span) return;
    
    if (span.textContent === '••••••••') {
        // Tampilkan password
        span.textContent = password;
        span.style.color = '#d32f2f'; // Merah saat ditampilkan
        span.style.letterSpacing = 'normal';
    } else {
        // Sembunyikan password
        span.textContent = '••••••••';
        span.style.color = '#1a237e'; // Kembali biru tua
        span.style.letterSpacing = '1px';
    }
};

// Copy password ke clipboard
window.copyPassword = async (password) => {
    try {
        await navigator.clipboard.writeText(password);
        
        // Tampilkan toast notification
        const toast = document.createElement('div');
        toast.textContent = '✅ Password berhasil disalin!';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        // Tambahkan animasi keyframes jika belum ada
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Hilangkan toast setelah 2 detik
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
        
    } catch (err) {
        // Fallback untuk browser lama
        const textArea = document.createElement('textarea');
        textArea.value = password;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert('✅ Password disalin: ' + password);
        } catch (e) {
            alert('❌ Gagal menyalin password. Silakan copy manual: ' + password);
        }
        
        document.body.removeChild(textArea);
    }
};

window.loadUsers = loadUsers;
loadUsers();
