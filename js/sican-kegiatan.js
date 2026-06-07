import {
    db
} from './firebase-config.js';

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadKegiatan(){

    const select =
        document.getElementById('kegiatanSelect');

    select.innerHTML =
        '<option value="">Pilih Kegiatan</option>';

    try{

        const snapshot =
            await getDocs(
                collection(db, 'kegiatan_absensi')
            );

        snapshot.forEach(doc => {

            const data = doc.data();

            select.innerHTML += `

                <option value="${data.nama}">
                    ${data.nama}
                </option>

            `;
        });

    }
    catch(err){

        console.error(
            'Gagal memuat kegiatan:',
            err
        );

        select.innerHTML =
            '<option>Gagal memuat</option>';
    }
}
