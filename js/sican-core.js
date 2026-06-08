import { db } from './firebase-config.js';
import { loadKegiatan } from './sican-kegiatan.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

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
        // JALUR 3: KEBAL ERROR - JIKA BARCODE HANYA BERISI TEKS BIASA (Contoh: Hanya NISN)
        // =========================================================================
        else {
            payload = {
                siswa_nis: teksScan,              // Isi angka barcode dianggap sebagai nomor NIS/NISN
                siswa_nama: "Siswa Terdaftar",    // Nama cadangan (Aman di-save ke database)
                siswa_kelas: "-",
                kegiatan: kegiatan,
                tanggal: tanggalHariIni(),
                jam: jamSekarang()
            };
        }

        // 1. Simpan data ke Firestore Database (Koleksi: presensi_sican)
        await simpanAbsensi(payload);

        // 2. Perbarui Tampilan UI Kartu Hasil Scan di Layar
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // 3. Bunyikan suara sukses
        successAudio.play().catch(e => console.log("Audio play diblokir kebijakan browser"));

    } catch(err) {
        // Tampilkan pesan error yang ramah di layar jika scan gagal
        alert("Gagal Memproses Scan: " + err.message);
        failedAudio.play().catch(e => console.log("Audio play diblokir browser"));
        console.error(err);
    }
}

function startScanner(){
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Library Html5Qrcode belum termuat di HTML.");
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then(devices => {
        if(devices.length){
            const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
            html5QrCode.start(
                cameraId,
                { fps: 10, qrbox: 250 },
                onScanSuccess
            ).catch(err => {
                console.error("Gagal menjalankan kamera:", err);
            });
        } else {
            console.error("Kamera tidak ditemukan.");
        }
    }).catch(err => {
        console.error("Gagal mendeteksi kamera:", err);
    });
}
