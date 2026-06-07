import { db } from './firebase-config.js'; // Pastikan file ini ada di folder js/
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

// PERBAIKAN JALUR AUDIO: Karena sican.html berada di folder sican/, 
// jalur relatif audio diambil dari posisi file HTML yang membukanya, yaitu 'assets/...'
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
    try{
        const dataQR = JSON.parse(decodedText);
        const kegiatan = document.getElementById('kegiatanSelect').value;

        // Validasi jika data kegiatan belum termuat atau gagal memuat
        if (!kegiatan || kegiatan.includes("Gagal") || kegiatan.includes("Memuat")) {
            throw new Error("Silakan pilih kegiatan yang valid terlebih dahulu!");
        }

        const payload = {
            siswa_nis: dataQR.nis,
            siswa_nama: dataQR.nama,
            siswa_kelas: dataQR.kelas,
            kegiatan: kegiatan,
            tanggal: tanggalHariIni(),
            jam: jamSekarang()
        };

        // Simpan ke Firestore Database
        await simpanAbsensi(payload);

        // Update UI secara visual melalui modul UI
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // Mainkan audio sukses
        successAudio.play().catch(e => console.log("Audio diblokir browser sebelum ada interaksi:", e));

    } catch(err) {
        alert(err.message);
        // Mainkan audio gagal
        failedAudio.play().catch(e => console.log("Audio diblokir browser:", e));
        console.error(err);
    }
}

function startScanner(){
    // Memastikan library Html5Qrcode dari CDN unpkg sudah siap di halaman HTML
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Library Html5Qrcode belum termuat sempurna di HTML.");
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then(devices => {
        if(devices.length){
            // Menggunakan kamera belakang jika tersedia (indeks terakhir biasanya kamera belakang pada HP)
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
            console.error("Kamera tidak ditemukan di perangkat ini.");
        }
    }).catch(err => {
        console.error("Gagal mendapatkan daftar kamera:", err);
    });
}
