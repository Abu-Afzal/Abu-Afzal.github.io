// Pastikan IMPORT Firebase Firestore Bapak sudah sesuai di baris paling atas
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { app } from "./firebase-config.js"; // Pastikan path config app Firebase Bapak benar

const db = getFirestore(app);
const KOLEKSI_MASTER = "master_pkkm";

// 1. DATA BACKUP DEFAULT (Sudah disamakan propertinya agar tidak 'undefined')
const BACKUP_KOMPONEN_DEFAULT = [
    {
        id: "1",
        nama: "Usaha Pengembangan Madrasah",
        target: 4, // Sudah disesuaikan menjadi 'target', bukan 'targetBerkas'
        warna: "#0d9488",
        indikator: ["1.1.1", "1.1.2"]
    }
];

// 2. FUNGSI AMBIL DATA (EXPORT)
export async function ambilMasterKomponen() {
    try {
        // Memastikan db dimasukkan sebagai argumen pertama collection()
        const rujukanKoleksi = collection(db, KOLEKSI_MASTER); 
        const snapshot = await getDocs(rujakanKoleksi);
        
        let daftarKomponen = [];
        snapshot.forEach((dokumen) => {
            daftarKomponen.push({ id: dokumen.id, ...dokumen.data() });
        });

        // Urutkan berdasarkan ID agar rapi
        daftarKomponen.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        // JIKA FIRESTORE KOSONG, GUNAKAN BACKUP DEFAULT
        if (daftarKomponen.length === 0) {
            return BACKUP_KOMPONEN_DEFAULT;
        }

        return daftarKomponen;
    } catch (error) {
        console.error("Gagal mengambil master data dari Firestore:", error);
        return BACKUP_KOMPONEN_DEFAULT; // Tetap return backup jika internet/koneksi error
    }
}

// 3. FUNGSI SIMPAN/UPDATE DATA (EXPORT)
export async function simpanMasterKomponenBaru(id, payload) {
    try {
        const rujukanDokumen = doc(db, KOLEKSI_MASTER, id);
        // setDoc membutuhkan objek murni biasa
        await setDoc(rujakanDokumen, payload, { merge: true });
        return true;
    } catch (error) {
        console.error("Gagal menyimpan ke Firestore:", error);
        throw error;
    }
}

// 4. FUNGSI HAPUS DATA (EXPORT)
export async function `hapusMasterKomponen`(id) {
    try {
        const rujukanDokumen = doc(db, KOLEKSI_MASTER, id);
        await deleteDoc(rujakanDokumen);
        return true;
    } catch (error) {
        console.error("Gagal menghapus dokumen di Firestore:", error);
        throw error;
    }
}
