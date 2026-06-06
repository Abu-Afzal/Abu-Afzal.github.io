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
                        Belum ada user terdaftar
                    </td>
                </tr>
            `;
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                
                let tampilanFitur = '-';
                try {
                    if (typeof labelFitur === 'function') {
                        tampilanFitur = labelFitur(data.fitur || []);
                    } else if (Array.isArray(data.fitur)) {
                        tampilanFitur = data.fitur.join(', ');
                    }
                } catch (e) {
                    tampilanFitur = Array.isArray(data.fitur) ? data.fitur.join(', ') : '-';
                }

                const badgeClass = data.role === 'admin' ? 'badge-admin' : 'badge-guru';
                const namaRole = data.role === 'admin' ? '👑 Admin' : '👤 Guru';

                // Render baris tabel dengan total 6 kolom (Termasuk kolom password)
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${data.nama || '-'}</strong></td>
                        <td>${data.email || '-'}</td>
                        <td><code style="background:#f1f5f9; padding:3px 6px; border-radius:4px; font-family:monospace;">${data.password || '******'}</code></td>
                        <td><span class="badge ${badgeClass}">${namaRole}</span></td>
                        <td>${tampilanFitur}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="if(window.bukaModalEdit){ window.bukaModalEdit('${docSnap.id}') }">✏️ Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="if(window.hapusUser){ window.hapusUser('${docSnap.id}') }">🗑️ Hapus</button>
                        </td>
                    </tr>
                `;
            });
        }

        loadEl.style.display = 'none';
        tblEl.style.display  = 'block';

    } catch(err) {
        console.error(err);
        loadEl.innerHTML = `<div style="color:red; padding:20px;">❌ Gagal memuat data user</div>`;
    }
}

window.loadUsers = loadUsers;
loadUsers();
