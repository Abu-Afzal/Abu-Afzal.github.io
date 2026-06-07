export function tampilkanHasil(data){

    document.getElementById('namaSiswa')
        .innerText = data.nama;

    document.getElementById('kelasSiswa')
        .innerText = data.kelas;

    document.getElementById('kegiatanAktif')
        .innerText = data.kegiatan;
}
