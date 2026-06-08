export function tampilkanHasil(data){
    // 1. Masukkan data teks ke elemen HTML masing-masing
    const elNama = document.getElementById('namaSiswa');
    const elKelas = document.getElementById('kelasSiswa');
    const elKegiatan = document.getElementById('kegiatanAktif');

    if(elNama) elNama.innerText = data.nama;
    if(elKelas) elKelas.innerText = data.kelas;
    if(elKegiatan) elKegiatan.innerText = data.kegiatan;

    // =========================================================================
    // 2. FORCE SHOW: Memaksa elemen penampung hasil scan agar muncul di layar
    // =========================================================================
    
    // Cari tahu apa ID kontainer kartu hasil scan Anda di sican.html
    // Umumnya bernama 'resultContainer', 'scanResult', atau 'cardResult'
    const resultCard = document.getElementById('resultContainer') || 
                       document.getElementById('scanResult') || 
                       document.getElementById('hasilScan');

    if (resultCard) {
        // Tampilkan kontainer jika sebelumnya tersembunyi
        resultCard.style.display = 'block'; 
        
        // Opsional: Beri animasi kedip hijau instan sebagai penanda sukses absen
        resultCard.style.animation = 'none';
        setTimeout(() => {
            resultCard.style.border = '3px solid #2e7d32';
            resultCard.style.background = '#e8f5e9';
        }, 10);
        
        // Kembalikan ke warna normal setelah 3 detik jika diinginkan
        setTimeout(() => {
            resultCard.style.border = '';
            resultCard.style.background = '';
        }, 3000);
    } else {
        // Jika tidak ada kontainer tersembunyi, gunakan alert bawaan yang rapi sebagai fallback
        console.log("Kontainer UI hasil scan tidak ditemukan di HTML, memicu pemberitahuan alternatif.");
    }
}
