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

// Jalur audio yang sudah sinkron dengan folder GitHub assets/audio/
const successAudio = new Audio('assets/audio/success.mp3');
const failedAudio = new Audio('assets/audio/failed.mp3');

function tanggalHariIni(){
    return new Date()
        .toISOString()
        .split('T')[0];
}

function jamSekarang(){
    return new Date()
        .toLocaleTimeString('id-ID');
}

async function onScanSuccess(decodedText){
    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        // Validasi awal agar user memilih kegiatan dulu di dropdown
        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        let payload = {};

        // OPTI 1: JIKA QR CODE MENGGUNAKAN FORMAT BARU (Contoh: NIS#NAMA#KELAS)
        if (decodedText.includes('#')) {
            const bagianData = decodedText.split('#');
            
            // Validasi kelengkapan data hasil split
            if (bagianData.length < 3) {
                throw new Error("Format QR Code string kurang lengkap (Harus: NIS#NAMA#KELAS)");
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
        // OPTI 2: JIKA ADA YANG SCAN MENGGUNAKAN FORMAT JSON LAMA (CADANGAN)
        else {
            const dataQR = JSON.parse(decodedText);
            payload = {
                siswa_nis: dataQR.nis,
                siswa_nama: dataQR.nama,
                siswa_kelas: dataQR.kelas,
                kegiatan: kegiatan,
                tanggal: tanggalHariIni(),
                jam: jamSekarang()
            };
        }

        // 1. Simpan data ke Firestore Database
        await simpanAbsensi(payload);

        // 2. Perbarui Tampilan UI Kartu Hasil Scan
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // 3. Bunyikan suara sukses
        successAudio.play().catch(e => console.log("Audio play diblokir browser sebelum ada interaksi"));

    } catch(err) {
        // Tampilkan pesan error yang ramah di layar jika scan gagal/salah format
        alert("Gagal Memproses Scan: " + err.message);
        
        // Bunyikan suara gagal
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
            // Otomatis pakai kamera belakang jika mendeteksi lebih dari 1 kamera (di HP)
            const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
            
            html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: 250
                },
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
