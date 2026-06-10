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
        const docRef = doc(db, "pkkm_berkas", idIndikator);
        
        const payload = {
            id_indikator: idIndikator,
            komponen: metadata.komponen,
            nama_dokumen: metadata.namaDokumen,
            tipe_file: fileFisik.type,
            nama_file_asli: fileFisik.name,
            file_base64: stringBase64,
            diupload_oleh: metadata.user || "Staf Madrasah",
            uploadedAt: new Date().toISOString()
        };

        await setDoc(docRef, payload, { merge: true });
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
            dataMaster[doc.id] = doc.data();
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
        await deleteDoc(doc(db, "pkkm_berkas", idIndikator));
        return { success: true };
    } catch (error) {
        console.error("Gagal hapus berkas:", error);
        throw error;
    }
}
