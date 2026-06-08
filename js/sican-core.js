import { db } from './firebase-config.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

// Variabel pengunci agar kamera tidak menscan bertubi-tubi
let sedangMemprosesScan = false;
// Satu Pintu Impor Firebase untuk Keperluan Dropdown & Validasi Dual-Database
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Inisialisasi Aplikasi saat file dimuat
init();

async function init(){
    try {
        await AmbilDaftarKegiatanPusat(); 
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
// FUNGSI PRODUSEN DROPDOWN - DIKUNCI SESUAI DATA PEMBIASAAN.JS
// =========================================================================
async function AmbilDaftarKegiatanPusat() {
    const kegiatanSelect = document.getElementById('kegiatanSelect');
    if (!kegiatanSelect) return;

    try {
        const snapshot = await getDocs(collection(db, "Kegiatan Absensi"));
        kegiatanSelect.innerHTML = '<option value="">-- Pilih Kegiatan --</option>';
        
        if (snapshot.empty) {
            kegiatanSelect.innerHTML = '<option value="">Belum ada kegiatan aktif</option>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            // Mengunci prioritas pada data.nama sesuai dengan pembiasaan.js
            const namaKegiatan = data.nama || data.kegiatan || doc.id; 
            
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
    // JIKA KAMERA SEDANG DALAM MASA JEDA/PROSES, REJECT SCAN SELANJUTNYA
    if (sedangMemprosesScan) return; 

    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        // Kunci sistem segera setelah QR terdeteksi pertama kali
        sedangMemprosesScan = true; 

        const teksScan = decodedText.trim(); 
        let nisSiswa = "";
        
        // TAHAP 1: EKSTRAKSI NIS
        if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            nisSiswa = bagianData[0].trim(); 
        } 
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                nisSiswa = String(dataQR.nis || dataQR.nisn || "").trim();
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak!");
            }
        }
        else {
            nisSiswa = teksScan;
        }

        if (!nisSiswa) {
            throw new Error("Nomor NIS gagal diekstrak!");
        }

        // TAHAP 2: VALIDASI NIS KE MASTER DATA (sican_siswa)
        let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisSiswa));
        let snapMaster = await getDocs(qMaster);

        if (snapMaster.empty && !isNaN(nisSiswa)) {
            qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisSiswa)));
            snapMaster = await getDocs(qMaster);
        }

        if (snapMaster.empty) {
            throw new Error(`NIS [${nisSiswa}] tidak terdaftar di Database Master Admin!`);
        }

        // Ambil data dokumen pertama secara sinkron
        const dataSiswaAsli = snapMaster.docs[0].data();

        // Susun payload presensi resmi
        let payload = {
            siswa_nis: String(dataSiswaAsli.nis).trim(), 
            siswa_nama: dataSiswaAsli.nama,
            siswa_kelas: dataSiswaAsli.kelas,
            kegiatan: kegiatan,
            tanggal: tanggalHariIni(),
            jam: jamSekarang()
        };

        // TAHAP 3: VALIDASI DOUBLE ABSEN HARI INI
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

        // =========================================================================
        // TAHAP 4: TAMPILKAN UI DAN SIMPAN DATA (SAAT SUKSES ABSEN)
        // =========================================================================
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        await simpanAbsensi(payload);
        successAudio.play().catch(e => console.log("Audio diblokir browser"));

        // JEDA SUKSES: Beri waktu 3 detik bagi operator/siswa untuk menarik kartunya
        setTimeout(() => {
            sedangMemprosesScan = false; // Buka kembali kunci kamera
        }, 3000); 

    } catch(err) {
        failedAudio.play().catch(e => console.log("Audio diblokir browser"));
        alert("Gagal Memproses Scan:\n" + err.message);
        console.error(err);

        // JEDA GAGAL: Jika gagal (misal salah kartu), beri jeda 2 detik sebelum scan ulang
        setTimeout(() => {
            sedangMemprosesScan = false;
        }, 2000);
    }
}
