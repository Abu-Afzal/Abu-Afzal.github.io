import { db } from './firebase-config.js';
import { loadKegiatan } from './sican-kegiatan.js';
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
// LOGIKA SCANNER UTAMA DENGAN DUAL-VALIDASI (MASTER & DOUBLE ABSEN)
// =========================================================================
async function onScanSuccess(decodedText){
    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        // Validasi awal agar user memilih kegiatan dulu di dropdown
        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        let payload = {};
        const teksScan = decodedText.trim(); 

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
            const nisBersih = teksScan.trim();

            let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisBersih));
            let snapMaster = await getDocs(qMaster);

            if (snapMaster.empty && !isNaN(nisBersih)) {
                qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisBersih)));
                snapMaster = await getDocs(qMaster);
            }

            if (snapMaster.empty) {
                throw new Error(`NIS [${nisBersih}] tidak terdaftar di Database Master Admin!`);
            }

            let dataSiswa = {};
            snapMaster.forEach(docSnap => {
                dataSiswa = docSnap.data();
            });

            payload = {
                siswa_nis: String(dataSiswa.nis).trim(), 
                siswa_nama: dataSiswa.nama,
                siswa_kelas: dataSiswa.kelas,
                kegiatan: kegiatan,
                tanggal: tanggalHariIni(),
                jam: jamSekarang()
            };
        }

        // =========================================================================
        // VALIDASI GLOBAL: CEK DOUBLE ABSEN HARI INI
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

        // 1. Simpan data ke Firestore Database
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
