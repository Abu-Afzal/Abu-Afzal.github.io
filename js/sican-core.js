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
        if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            if (bagianData.length < 1) {
                throw new Error("Format QR Code Hashtag rusak atau tidak terbaca!");
            }
            nisSiswa = bagianData[0].trim(); // Ambil bagian NIS (Contoh: "240992")
        } 
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                nisSiswa = String(dataQR.nis || dataQR.nisn || "").trim();
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak / tidak valid!");
            }
        }
        else {
            nisSiswa = teksScan;
        }

        if (!nisSiswa) {
            throw new Error("Nomor NIS gagal diekstrak dari kode QR ini!");
        }

        // =========================================================================
        // TAHAP 2: VALIDASI NIS KE DATABASE MASTER PUSAT (sican_siswa)
        // Menggunakan pencarian string langsung sesuai gambar Firebase Console Anda
        // =========================================================================
        
        // Cari dengan asumsi NIS bertipe STRING (Sesuai tipe data di screenshot console Anda)
        let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisSiswa));
        let snapMaster = await getDocs(qMaster);

        // Cadangan: Jika tidak ketemu, cari sebagai tipe data NUMBER (Angka)
        if (snapMaster.empty && !isNaN(nisSiswa)) {
            qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisSiswa)));
            snapMaster = await getDocs(qMaster);
        }

        // Jika di kedua tipe tetap kosong, lemparkan error ke layar
        if (snapMaster.empty) {
            throw new Error(`NIS [${nisSiswa}] tidak ditemukan di Database Master Admin!`);
        }

        // AMBIL DATA SECARA LANGSUNG (Bebas dari Bug Delay forEach)
        const docSiswa = snapMaster.docs[0];
        const dataSiswaAsli = docSiswa.data();

        // Racik payload absensi menggunakan identitas resmi dari database master
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
        failedAudio.play().catch(e => console.log("Audio play diblokir browser"));
        alert("Gagal Memproses Scan:\n" + err.message);
        console.error(err);
    }
}
