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

    try{

        loadEl.style.display = 'block';
        tblEl.style.display  = 'none';

        const snapshot = await getDocs(
            collection(db, 'users')
        );

        tbody.innerHTML = '';

        if(snapshot.empty){

            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        Belum ada user
                    </td>
                </tr>
            `;

        }else{

            snapshot.forEach(docSnap=>{

                const data = docSnap.data();

                tbody.innerHTML += `
                    <tr>

                        <td>${data.nama || '-'}</td>

                        <td>${data.email || '-'}</td>

                        <td>
                            <span class="badge ${
                                data.role === 'admin'
                                ? 'badge-admin'
                                : 'badge-guru'
                            }">
                                ${data.role}
                            </span>
                        </td>

                        <td>
                            ${labelFitur(data.fitur || [])}
                        </td>

                        <td>
                            <span class="status-dot dot-ok"></span>
                            Aktif
                        </td>

                        <td>

                            <button
                                class="btn btn-warning btn-sm"
                                onclick="editUser('${docSnap.id}')"
                            >
                                Edit
                            </button>

                            <button
                                class="btn btn-danger btn-sm"
                                onclick="hapusUser('${docSnap.id}')"
                            >
                                Hapus
                            </button>

                        </td>

                    </tr>
                `;
            });
        }

        loadEl.style.display = 'none';
        tblEl.style.display  = 'block';

    }catch(err){

        console.error(err);

        loadEl.innerHTML = `
            <div style="color:red;">
                Gagal memuat data user
            </div>
        `;
    }
}

window.loadUsers = loadUsers;

loadUsers();
