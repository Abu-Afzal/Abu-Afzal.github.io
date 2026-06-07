import { db } from './firebase-config.js';

import {
collection,
addDoc,
getDocs,
query,
where
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function simpanAbsensi(data){

    const q = query(
        collection(db,'absensi'),

        where('tanggal','==',data.tanggal),
        where('siswa_nis','==',data.siswa_nis),
        where('kegiatan','==',data.kegiatan)
    );

    const cek = await getDocs(q);

    if(!cek.empty){

        throw new Error(
            'Siswa sudah melakukan absensi kegiatan ini hari ini'
        );
    }

    await addDoc(
        collection(db,'absensi'),
        data
    );
}
