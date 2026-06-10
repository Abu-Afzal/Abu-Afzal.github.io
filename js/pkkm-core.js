import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    collection, 
    getDocs,
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. Mengubah file fisik kiriman user menjadi Teks Base64
export function konversiFileKeBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 2. Menyimpan berkas di Firestore (ID Dokumen Murni sesuai Screenshot 160)
export async function uploadDokumenPKKM(idIndikator, fileFisik, metadata) {
    try {
        const stringBase64 = await konversiFileKeBase64(fileFisik);
        
        // Tetap menggunakan idIndikator murni (e.g. "1.1.1") agar sinkron dengan database Anda saat ini
        const docRef = doc(db, "pkkm_berkas", idIndikator);
        
        const payload = {
            id_indikator: idIndikator,
            komponen: metadata.komponen || "Umum",
            nama_dokumen: metadata.namaDokumen || "Dokumen Tanpa Nama",
            tipe_file: fileFisik.type,
            nama_file_asli: fileFisik.name,
            file_base64: stringBase64,
            diupload_oleh: metadata.uploader_email || "Staf Madrasah",
            uploadedAt: new Date().toISOString()
        };

        await setDoc(docRef, payload);
        return { success: true };
    } catch (error) {
        console.error("Gagal simpan ke Firestore:", error);
        throw error;
    }
}

// 3. Mengambil seluruh database berkas PKKM untuk dirender di grid bawah
export async function ambilSemuaBerkasPKKM() {
    try {
        const querySnapshot = await getDocs(collection(db, "pkkm_berkas"));
        const dataMaster = {};
        querySnapshot.forEach((doc) => {
            dataMaster[doc.id] = doc.data();
        });
        console.log("Data berkas berhasil dimuat:", dataMaster);
        return dataMaster;
    } catch (error) {
        console.error("Gagal ambil data PKKM:", error);
        throw error;
    }
}

// 4. FUNGSI YANG HILANG (Wajib di-export agar pkkm-core.js tidak crash)
export async function hapusDokumenPKKM(idIndikator) {
    try {
        await deleteDoc(doc(db, "pkkm_berkas", idIndikator));
        console.log(`Berkas indikator ${idIndikator} berhasil dihapus dari database.`);
        return { success: true };
    } catch (error) {
        console.error("Gagal hapus berkas:", error);
        throw error;
    }
}

// 5. Mengambil master komponen dinamis untuk halaman utama/admin
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

// 6. Menyimpan master komponen baru dari halaman admin-pkkm.html
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
