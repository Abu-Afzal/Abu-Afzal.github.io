import { db } from './firebase-config.js';
import { simpanAbsensi } from './sican-save.js';
import { tampilkanHasil } from './sican-ui.js';

// Satu Pintu Impor Firebase untuk Keperluan Dropdown & Validasi Dual-Database
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Variabel pengunci global agar kamera tidak melakukan scan bertubi-tubi (efek gema)
let sedangMemprosesScan = false;

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
// LOGIKA SCANNER UTAMA DENGAN FILTER URL & PROTEKSI JEDA KAMERA (COOLDOWN)
// =========================================================================
async function onScanSuccess(decodedText){
    // JALUR PENGAMAN: Jika kamera dalam masa jeda pemrosesan, abaikan scan frame ini!
    if (sedangMemprosesScan) return;

    try {
        const kegiatan = document.getElementById('kegiatanSelect').value;

        if (!kegiatan || kegiatan.trim() === "") {
            throw new Error("Silakan pilih kegiatan terlebih dahulu!");
        }

        // KUNCI SCANNER: Amankan status agar frame video selanjutnya tidak menerobos masuk
        sedangMemprosesScan = true;

        let teksScan = decodedText.trim(); 
        let nisSiswa = "";

        // =========================================================================
        // ANTISIPASI OTOMATIS: JIKA QR CODE TERNYATA BERISI LINK/URL (ME-QR, DLL)
        // =========================================================================
        if (teksScan.includes('http://') || teksScan.includes('https://')) {
            const bagianUrl = teksScan.split('/');
            const bagianUjung = bagianUrl[bagianUrl.length - 1].trim();
            
            if (bagianUjung.includes('#')) {
                nisSiswa = bagianUjung.split('#')[0].trim();
            } else {
                nisSiswa = bagianUjung;
            }
        }
        // JALUR 1: Jika QR berisi format hashtag biasa (Tanpa Link bawaan generator)
        else if (teksScan.includes('#')) {
            const bagianData = teksScan.split('#');
            nisSiswa = bagianData[0].trim(); 
        } 
        // JALUR 2: Jika QR berbentuk JSON
        else if (teksScan.startsWith('{') && teksScan.endsWith('}')) {
            try {
                const dataQR = JSON.parse(teksScan);
                nisSiswa = String(dataQR.nis || dataQR.nisn || "").trim();
            } catch (e) {
                throw new Error("Isi Barcode berupa JSON rusak!");
            }
        }
        // JALUR 3: Jika QR murni berisi teks biasa / angka NIS saja (Rekomendasi)
        else {
            nisSiswa = teksScan;
        }

        if (!nisSiswa) {
            throw new Error("Nomor NIS gagal diekstrak dari kode QR ini!");
        }

        // =========================================================================
        // TAHAP 2: VALIDASI NIS KE MASTER DATA (sican_siswa)
        // =========================================================================
        let qMaster = query(collection(db, "sican_siswa"), where("nis", "==", nisSiswa));
        let snapMaster = await getDocs(qMaster);

        if (snapMaster.empty && !isNaN(nisSiswa)) {
            qMaster = query(collection(db, "sican_siswa"), where("nis", "==", Number(nisSiswa)));
            snapMaster = await getDocs(qMaster);
        }

        if (snapMaster.empty) {
            throw new Error(`NIS [${nisSiswa}] tidak terdaftar di Database Master Admin!`);
        }

        // Ambil data dokumen pertama secara sinkron (Bebas Delay asinkronus)
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

        // =========================================================================
        // TAHAP 3: VALIDASI DOUBLE ABSEN HARI INI
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

        // =========================================================================
        // TAHAP 4: EKSEKUSI PENYIMPANAN DAN TAMPILAN UI
        // =========================================================================
        
        // Munculkan hasil ke UI terlebih dahulu agar terasa instan bagi user
        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        // Simpan data log logis ke Firestore
        await simpanAbsensi(payload);
        
        // Bunyikan suara sukses
        successAudio.play().catch(e => console.log("Audio diblokir browser"));

        // JEDA SUKSES: Beri waktu 3 detik bagi siswa untuk menarik kartunya dari kamera
        setTimeout(() => {
            sedangMemprosesScan = false; // Buka kembali kunci kamera untuk siswa selanjutnya
        }, 3000);

    } catch(err) {
        failedAudio.play().catch(e => console.log("Audio diblokir browser"));
        alert("Gagal Memproses Scan:\n" + err.message);
        console.error(err);

        // JEDA ERROR: Jika gagal/salah kartu, beri jeda 2 detik sebelum bisa scan kartu lain
        setTimeout(() => {
            sedangMemprosesScan = false;
        }, 2000);
    }
}

function startScanner(){
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Library Html5Qrcode belum termuat di HTML.");
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");

    // Fungsi dinamis untuk menghitung area kotak scan (qrbox) secara responsif
    const konfigurasiQrbox = (viewfinderWidth, viewfinderHeight) => {
        // Ambil dimensi terkecil dari layar kamera untuk dijadikan acuan kotak persegi
        const dimensiTerkecil = Math.min(viewfinderWidth, viewfinderHeight);
        
        // Kita set ukuran kotak scan sebesar 70% dari dimensi terkecil layar kamera
        // Ini membuat wilayah scan jauh lebih besar dan lega di layar full screen
        const ukuranKotak = Math.floor(dimensiTerkecil * 0.7);
        
        // Batasi batas minimum kotak scan di 250px dan maksimum di 600px agar tetap proporsional
        const ukuranFinal = Math.max(250, Math.min(600, ukuranKotak));
        
        return {
            width: ukuranFinal,
            height: ukuranFinal
        };
    };

    Html5Qrcode.getCameras().then(devices => {
        if(devices.length){
            // Memilih kamera belakang jika ada lebih dari 1 kamera (biasanya di HP)
            const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
            
            html5QrCode.start(
                cameraId,
                { 
                    fps: 15,          // Naikkan ke 15 fps agar pembacaan kamera lebih mulus dan cepat
                    qrbox: konfigurasiQrbox, // Menggunakan fungsi responsif di atas
                    aspectRatio: 1.777778   // Memaksa rasio kamera ke format 16:9 widescreen/full screen
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
