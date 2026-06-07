import { db } from './firebase-config.js';
import { loadKegiatan } from './sican-kegiatan.js';

import { simpanAbsensi } from './sican-save.js';

import { tampilkanHasil } from './sican-ui.js';

init();

async function init(){

    await loadKegiatan();

    startScanner();
}

const successAudio = new Audio(
    'assets/audio/success.mp3'
);

const failedAudio = new Audio(
    'assets/audio/failed.mp3'
);

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

        const kegiatan =
            document.getElementById('kegiatanSelect').value;

        const payload = {

            siswa_nis: dataQR.nis,
            siswa_nama: dataQR.nama,
            siswa_kelas: dataQR.kelas,

            kegiatan: kegiatan,

            tanggal: tanggalHariIni(),
            jam: jamSekarang()
        };

        await simpanAbsensi(payload);

        tampilkanHasil({
            nama: payload.siswa_nama,
            kelas: payload.siswa_kelas,
            kegiatan: payload.kegiatan
        });

        successAudio.play();

    }
    catch(err){

        alert(err.message);

        failedAudio.play();

        console.error(err);
    }
}

function startScanner(){

    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras().then(devices => {

        if(devices.length){

            html5QrCode.start(

                devices[0].id,

                {
                    fps:10,
                    qrbox:250
                },

                onScanSuccess
            );
        }
    });
}
