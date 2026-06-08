import { db } from './firebase-config.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

// Satu Pintu Impor Firebase untuk Keperluan Dropdown & Validasi Dual-Database
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Inisialisasi Aplikasi saat file dimuat
init();

async function init(){
    try {
        await AmbilDaftarKegiatanPusat(); // Menggunakan fungsi internal yang bebas konflik
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

// =========================================================================
// FUNGSI PRODUSEN DROPDOWN - MANDIRI & BEBAS TABRAKAN MODULE
// =========================================================================
async function AmbilDaftarKegiatanPusat() {
    const kegiatanSelect = document.getElementById('kegiatanSelect');
    if (!kegiatanSelect) return;

    try {
        // Mengambil langsung menggunakan instance impor satu pintu
        const snapshot = await getDocs(collection(db, "Kegiatan Absensi"));
        kegiatanSelect.innerHTML = '<option value="">-- Pilih Kegiatan --</option>';
        
        if (snapshot.empty) {
            kegiatanSelect.innerHTML = '<option value="">Belum ada kegiatan aktif</option>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const namaKegiatan = data.kegiatan || data.nama || doc.id; 
            
            const opt = document.createElement('option');
            opt.value = namaKegiatan;
            opt.textContent = namaKegiatan;
            kegiatanSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Gagal memuat komponen kegiatan:", err);
        kegiatanSelect.innerHTML = '<option value="">Gagal memuat data kegiatan</option>';
    }
}

// =========================================================================
// LOGIKA SCANNER UTAMA DENGAN VALIDASI DATA MASTER UNTUK SEMUA JALUR
// =========================================================================
async function onScanSuccess(decodedText){
    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        // Validasi awal agar user memilih kegiatan dulu di dropdown
        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        const teksScan = decodedText.trim(); // Bersihkan spasi tak terlihat
        let nisSiswa = "";

        // =========================================================================
        // TAHAP 1: EKSTRAKSI NILAI NIS BERDASARKAN FORMAT QR CODE YANG MASUK
        // =========================================================================
        
        // JALUR 1: Jika menggunakan Format Hashtag (Contoh: 240992#A.Aldy Al Mansyah#XII.1)
        if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            if (bagianData.length < 1) {
                throw new Error("Format QR Code Hashtag rusak atau tidak terbaca!");
            }
            nisSiswa = bagianData[0].trim(); // Ambil bagian pertamanya saja yaitu nomor NIS
        } 
        // JALUR 2: Jika menggunakan Format JSON
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                nisSiswa = String(dataQR.nis || dataQR.nisn || "").trim();
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak / tidak valid!");
            }
        }
        // JALUR 3: Jika QR Code murni berisi Teks Biasa / Angka NIS Saja (Contoh: 240992)
        else {
            nisSiswa = teksScan;
        }

        // Antisipasi jika hasil ekstraksi NIS ternyata kosong
        if (!nisSiswa) {
            throw new Error("Nomor NIS gagal diekstrak dari kode QR ini!");
        }

        // =========================================================================
        // TAHAP 2: VALIDASI NIS KE DATABASE MASTER PUSAT (sican_siswa)
        // =========================================================================
        
        // KANDIDAT A: Cari dengan asumsi field 'nis' di Firestore bertipe STRING (Teks)
        let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisSiswa));
        let snapMaster = await getDocs(qMaster);

        // KANDIDAT B: Jika tidak ketemu, cari dengan asumsi field 'nis' bertipe NUMBER (Angka)
        if (snapMaster.empty && !isNaN(nisSiswa)) {
            qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisSiswa)));
            snapMaster = await getDocs(qMaster);
        }

        // Jika kedua tipe data di atas tetap menghasilkan data kosong, blokir akses!
        if (snapMaster.empty) {
            throw new Error(`NIS [${nisSiswa}] tidak terdaftar di Database Master Admin!`);
        }

        // Ekstrak data profil resmi siswa dari database master hasil upload Excel Anda
        let dataSiswaAsli = {};
        snapMaster.forEach(docSnap => {
            dataSiswaAsli = docSnap.data();
        });

        // Racik payload absensi menggunakan identitas asli dari database admin sekolah
        let payload = {
            siswa_nis: String(dataSiswaAsli.nis).trim(), 
            siswa_nama: dataSiswaAsli.nama,
            siswa_kelas: dataSiswaAsli.kelas,
            kegiatan: kegiatan,
            tanggal: tanggalHariIni(),
            jam: jamSekarang()
        };

        // =========================================================================
        // TAHAP 3: VALIDASI GLOBAL ANTI DOUBLE-ABSEN HARI INI
        // =========================================================================
        const qCekAbsen = query(
            collection(db, "presensi_sican"),
            where("nis", "==", payload.siswa_nis),
            where("tanggal", "==", payload.tanggal),
            where("kegiatan", "==", payload.kegiatan)
        );
        const snapAbsen = await getDocs(qCekAbsen);

        if (!snapAbsen.empty) {
            throw new Error(`${payload.siswa_nama} sudah melakukan absensi ${payload.kegiatan} hari ini!`);
        }

        // 1. Simpan data log absensi ke Firestore Database via sican-save.js
        await simpanAbsensi(payload);

        // 2. Perbarui Tampilan UI Kartu Hasil Scan di Layar via sican-ui.js
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // 3. Bunyikan suara sukses
        successAudio.play().catch(e => console.log("Audio play diblokir kebijakan browser"));

    } catch(err) {
        // Mengarahkan suara gagal dan melemparkan alert jika terjadi error di atas
        failedAudio.play().catch(e => console.log("Audio play diblokir browser"));
        alert("Gagal Memproses Scan:\n" + err.message);
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
