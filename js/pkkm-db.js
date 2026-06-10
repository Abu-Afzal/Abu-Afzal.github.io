import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    collection, 
    getDocs,
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Mengubah file fisik kiriman user menjadi Teks Base64 (Trik E-Dokumen Bebas Biaya)
export function konversiFileKeBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Menyimpan atau menimpa berkas lama di Firestore
export async function uploadDokumenPKKM(idIndikator, fileFisik, metadata) {
    try {
        const stringBase64 = await konversiFileKeBase64(fileFisik);
        
        // REVISI AMAN: Memberikan prefix 'indikator_' agar karakter titik (contoh: 1.1.1) 
        // tidak merusak jalur pembacaan token ID dokumen di Firestore
        const namaDocAman = `indikator_${idIndikator.replace(/\./g, '_')}`;
        const docRef = doc(db, "pkkm_berkas", namaDocAman);
        
        // Sinkronisasi field payload agar membaca uploader_email dengan aman
        const payload = {
            id_indikator: idIndikator,
            komponen: metadata.komponen || "Umum",
            nama_dokumen: metadata.namaDokumen || "Dokumen Tanpa Nama",
            tipe_file: fileFisik.type,
            nama_file_asli: fileFisik.name,
            file_base64: stringBase64,
            uploader_email: metadata.uploader_email || "publik@madrasah.id",
            uploadedAt: new Date().toISOString()
        };

        // Menjalankan perintah setDoc murni
        await setDoc(docRef, payload);
        return { success: true };
    } catch (error) {
        console.error("Gagal simpan ke Firestore:", error);
        throw error;
    }
}

// Mengambil seluruh database berkas PKKM
export async function ambilSemuaBerkasPKKM() {
    try {
        const querySnapshot = await getDocs(collection(db, "pkkm_berkas"));
        const dataMaster = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Kembalikan key-nya menggunakan id_indikator aslinya (misal 1.1.1) agar grid bawah tidak patah
            if (data.id_indikator) {
                dataMaster[data.id_indikator] = data;
            } else {
                dataMaster[doc.id] = data;
            }
        });
        return dataMaster;
    } catch (error) {
        console.error("Gagal ambil data PKKM:", error);
        throw error;
    }
}

// Menghapus data dokumen dari Firestore
export async function hapusDokumenPKKM(idIndikator) {
    try {
        const namaDocAman = `indikator_${idIndikator.replace(/\./g, '_')}`;
        await deleteDoc(doc(db, "pkkm_berkas", namaDocAman));
        return { success: true };
    } catch (error) {
        console.error("Gagal hapus berkas:", error);
        throw error;
    }
}

// ==========================================================================
// MASTER DATA DARI HALAMAN ADMIN PKKM
// ==========================================================================
export async function ambilMasterKomponen() {
    try {
        const querySnapshot = await getDocs(collection(db, "pkkm_master"));
        let daftarKomponen = [];
        querySnapshot.forEach((doc) => {
            daftarKomponen.push(doc.data());
        });
        return daftarKomponen.sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
        console.error("Gagal mengambil master komponen:", error);
        return [];
    }
}

export async function simpanMasterKomponenBaru(id, dataPayload) {
    try {
        const docRef = doc(db, "pkkm_master", `komponen_${id}`);
        await setDoc(docRef, dataPayload);
        return true;
    } catch (error) {
        console.error("Gagal mendaftarkan komponen baru:", error);
        throw error;
    }
}
