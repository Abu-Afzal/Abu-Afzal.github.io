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
        // JALUR 3: JIKA BARCODE HANYA BERISI TEKS BIASA (Hanya NIS / NISN)
        // =========================================================================
        else {
            const nisSiswa = teksScan;
            let namaDitemukan = "Siswa Tidak Dikenal";
            let kelasDitemukan = "-";

            try {
                // Ambil data master siswa dari Firestore untuk mencari tahu nama pemilik NIS ini
                // SINKRONISASI: Menghubungkan ke koleksi 'sipena_siswa' sesuai Firebase Rules Anda
                const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
                
                // Cari dokumen siswa yang field 'nis' atau 'nisn'-nya cocok dengan barcode
                const qSiswa = query(collection(db, "sipena_siswa"), where("nis", "==", nisSiswa));
                const querySnapshot = await getDocs(qSiswa);

                if (!querySnapshot.empty) {
                    // Jika data siswa ditemukan di database master
                    querySnapshot.forEach((docSiswa) => {
                        const dataSiswa = docSiswa.data();
                        namaDitemukan = dataSiswa.nama || dataSiswa.siswa_nama;
                        kelasDitemukan = dataSiswa.kelas || dataSiswa.siswa_kelas || "-";
                    });
                } else {
                    console.warn(`NIS ${nisSiswa} tidak terdaftar di database master sipena_siswa.`);
                }
            } catch (errMaster) {
                console.error("Gagal mengambil data master siswa:", errMaster);
            }

            // Susun data absensi menggunakan nama asli yang berhasil ditarik dari database
            payload = {
                siswa_nis: nisSiswa,
                siswa_nama: namaDitemukan, 
                siswa_kelas: kelasDitemukan,
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
