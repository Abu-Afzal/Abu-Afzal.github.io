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

// Mengambil seluruh database berkas PKKM dari Firestore
export async function ambilSemuaBerkasPKKM() {
    try {
        const querySnapshot = await getDocs(collection(db, "pkkm_berkas"));
        const dataMaster = {};
        
        querySnapshot.forEach((doc) => {
            // doc.id di sini bernilai "1.1.1", "2.1.1", dll sesuai Screenshot (160)
            dataMaster[doc.id] = doc.data();
        });
        
        console.log("Data Berkas PKKM berhasil dimuat ke lokal:", dataMaster);
        return dataMaster; // Mengembalikan object dengan key berupa ID Indikator (e.g. dataMaster["1.1.1"])
    } catch (error) {
        console.error("Gagal ambil data berkas PKKM dari database:", error);
        throw error;
    }
}
