import { db } from "./firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// =====================================
// SIMPAN KEGIATAN
// =====================================

const btnSimpan = document.getElementById('btnSimpan');

if(btnSimpan){

    btnSimpan.addEventListener('click', async ()=>{

        const nama =
            document.getElementById('namaKegiatan').value.trim();

        const status =
            document.getElementById('statusKegiatan').value;

        if(!nama){
            alert('Nama kegiatan wajib diisi');
            return;
        }

        try{

            await addDoc(collection(db,'master_kegiatan'),{
                nama,
                status,
                createdAt:new Date().toISOString()
            });

            alert('Kegiatan berhasil disimpan');

            document.getElementById('namaKegiatan').value='';

            loadKegiatan();

        }catch(err){

            console.error(err);
            alert(err.message);

        }

    });

}


// =====================================
// LOAD KEGIATAN
// =====================================

async function loadKegiatan(){

    const tbody =
        document.getElementById('tbodyKegiatan');

    if(!tbody) return;

    tbody.innerHTML=`
        <tr>
            <td colspan="3">
                Memuat...
            </td>
        </tr>
    `;

    try{

        const snapshot =
            await getDocs(collection(db,'master_kegiatan'));

        tbody.innerHTML='';

        if(snapshot.empty){

            tbody.innerHTML=`
                <tr>
                    <td colspan="3">
                        Belum ada kegiatan
                    </td>
                </tr>
            `;

            return;
        }

        snapshot.forEach(docSnap=>{

            const data = docSnap.data();

            tbody.innerHTML += `
                <tr>

                    <td>
                        ${data.nama}
                    </td>

                    <td>
                        <span class="badge">
                            ${data.status}
                        </span>
                    </td>

                    <td>
                        <button
                            class="btn-hapus"
                            onclick="hapusKegiatan('${docSnap.id}')">
                            Hapus
                        </button>
                    </td>

                </tr>
            `;

        });

    }catch(err){

        console.error(err);

    }

}

loadKegiatan();


// =====================================
// HAPUS
// =====================================

window.hapusKegiatan = async(id)=>{

    if(!confirm('Hapus kegiatan ini?')) return;

    try{

        await deleteDoc(doc(db,'master_kegiatan',id));

        loadKegiatan();

    }catch(err){

        console.error(err);

    }

}
