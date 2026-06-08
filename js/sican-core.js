import { db } from './firebase-config.js';
import { loadKegiatan } from './sican-kegiatan.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

// TAMBAHKAN IMPOR INI untuk keperluan query validasi ke Firestore
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Inisialisasi Aplikasi saat file dimuat
init();

async function init(){
    try {
        await loadKegiatan();
        startScanner();
    } catch (error) {
        console.error("Gagal menginisialisasi aplikasi:", error);
    }
}

const successAudio = new Audio('assets/audio/success.mp3');
const failedAudio = new Audio('assets/audio/failed.mp3');

function tanggalHariIni(){
    return new Date().toISOString().split('T')[0];
}

function jamSekarang(){
    return new Date().toLocaleTimeString('id-ID');
}

async function onScanSuccess(decodedText){
    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        // Validasi awal agar user memilih kegiatan dulu di dropdown
        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        let payload = {};
        const teksScan = decodedText.trim(); // Bersihkan spasi tak terlihat

        // =========================================================================
        // JALUR 1: JIKA QR CODE MENGGUNAKAN FORMAT HASHTAG (Contoh: NIS#NAMA#KELAS)
        // =========================================================================
        if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            
            if (bagianData.length < 3) {
                throw new Error("Format QR Code kurang lengkap (Harus: NIS#NAMA#KELAS)");
            }

            payload = {
                siswa_nis: bagianData[0].trim(),
                siswa_nama: bagianData[1].trim(),
                siswa_kelas: bagianData[2].trim(),
                kegiatan: kegiatan,
                tanggal: tanggalHariIni(),
                jam: jamSekarang()
            };
        } 
        // =========================================================================
        // JALUR 2: JIKA QR CODE ADALAH FORMAT STRUKTUR JSON YANG VALID
        // =========================================================================
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                payload = {
                    siswa_nis: dataQR.nis || dataQR.nisn || "Tidak Ada NIS",
                    siswa_nama: dataQR.nama || "Siswa Tanpa Nama",
                    siswa_kelas: dataQR.kelas || "-",
                    kegiatan: kegiatan,
                    tanggal: tanggalHariIni(),
                    jam: jamSekarang()
                };
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak / tidak valid!");
            }
        }
        // =========================================================================
        // JALUR 3: DINAMIS & AMAN - QR CODE HANYA TEKS BIASA / ANGKA NIS SAJA
        // =========================================================================
        else {
            const nisBersih = teksScan.trim(); // Bersihkan spasi di awal/akhir

            // KANDIDAT 1: Cari dengan anggapan NIS di Firestore berbentuk STRING (Teks)
            let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisBersih));
            let snapMaster = await getDocs(qMaster);

            // KANDIDAT 2: Jika tidak ketemu, coba cari dengan anggapan NIS di Firestore berbentuk NUMBER (Angka)
            if (snapMaster.empty && !isNaN(nisBersih)) {
                qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisBersih)));
                snapMaster = await getDocs(qMaster);
            }

            // Jika kedua cara di atas tetap tidak menemukan data, baru lemparkan error
            if (snapMaster.empty) {
                throw new Error(`NIS [${nisBersih}] tidak terdaftar di Database Master Admin!`);
            }

            let dataSiswa = {};
            snapMaster.forEach(docSnap => {
                dataSiswa = docSnap.data();
            });

            // Set payload berdasarkan data asli sekolah yang berhasil ditemukan
            payload = {
                // Pastikan dikonversi ke String agar seragam saat disimpan ke riwayat presensi
                siswa_nis: String(dataSiswa.nis).trim(), 
                siswa_nama: dataSiswa.nama,
                siswa_kelas: dataSiswa.kelas,
                kegiatan: kegiatan,
                tanggal: tanggalHariIni(),
                jam: jamSekarang()
            };
        }
