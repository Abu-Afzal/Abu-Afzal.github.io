const CONFIG = {
    layananUmum: [
        { 
            id: 'pusaka', 
            title: 'Absensi Pusaka', 
            desc: '', 
            color: '#ffffff', 
            url: 'https://pusaka-v3.kemenag.go.id/',
            logo: 'assets/images/icon-app.png'
        },
        { 
            id: 'pusaka', 
            icon: '📜',
            title: 'Pelaporan Pusaka', 
            desc: '', 
            color: '#9c27b0', 
            url: 'https://absensi.kemenag.go.id'
        },
        { 
            id: 'myasn', 
            icon: '👤', 
            title: 'MyASN BKN', 
            desc: '', 
            color: '#673ab7', 
            url: 'https://myasn.bkn.go.id/' 
        },
        { 
            id: 'emis', 
            icon: '💻', 
            title: 'SIMPATIKA', 
            desc: '', 
            color: '#7e57c2', 
            url: 'https://simpatika.kemenag.go.id/madrasah',
            logo: 'assets/images/emis-app.png'
        },
        { 
            id: 'simpeg', 
            icon: '📘', 
            title: 'SIMPEG 5', 
            desc: '', 
            color: '#546e7a', 
            url: 'https://simpeg5.kemenag.go.id/' 
        },
        { 
            id: 'pelatihan', 
            icon: '📘', 
            title: 'Pintar Kemenag', 
            desc: '', 
            color: '#afb6b5', 
            url: 'https://pintar.kemenag.go.id/'
            logo: 'assets/images/pintar-app.png'
        }
    ],
    
    layananMadrasah: [
        { icon: '👨‍💼', title: 'Admin Users', desc: '', color: '#dc3309', page: '/admin-users.html' },
        { 
            icon: '📢', 
            title: 'Kelola Berita', 
            desc: '', 
            color: '#673ab7', 
            url: 'pages/kelola-berita.html' 
        },
        { 
            icon: '🌐', 
            title: 'Website', 
            desc: '', 
            color: '#37474f', 
            url: 'https://www.manbantaeng.sch.id/' 
        },
        { icon: '🧾', title: 'PMBM', desc: 'Penerimaan Mueid Baru Madrasah', color: '#00695c', page: 'pages/pmbm.html' },
        { icon: '📖', title: 'SIPENA', desc: 'Sistem Penilaian dan Absensi', color: '#3949ab', page: 'pages/sipena.html' },
        { icon: '⏱️', title: 'Jadwal Mengajar', desc: '', color: '#a704c8', page: 'pages/jadwal-mengajar.html' },
        { icon: '✅', title: 'SiTaat', desc: '', color: '#f57c00', page: 'pages/sitaat.html' },
        { 
            icon: '📷', 
            title: 'SICAN', 
            desc: 'Scan Absensi Siswa', 
            color: '#0d47a1', 
            url: 'sican/sican.html'
        },
        { icon: '🎓', title: 'E-Learning', desc: '', color: '#d32f2f', page: 'pages/elearning.html' },
        { icon: '📁', title: 'E-Dokumen', desc: '', color: '#1e88e5', page: 'pages/edokumen.html' },
        { icon: '🏥', title: 'UKSmart', desc: '', color: '#e91e63', page: 'pages/uksmart.html' },
        { icon: '📚', title: 'Jurnal Mengajar', desc: '', color: '#6d4c41', page: 'pages/jurnal-online.html' },
        { icon: '👥', title: 'Master Siswa', desc: 'Kelola Data Siswa', color: '#009688', page: 'sican/siswa-sican.html',role: 'admin' },
        { icon: '📝', title: 'Supervisi', desc: '', color: '#78909c', page: 'pages/supervisi.html' },
        { icon: '🏆', title: 'Prestasi', desc: '', color: '#546e7a', page: 'pages/prestasi.html' },
        { icon: '👨‍💼', title: 'PKKM', desc: 'Penilaian Kinerja Kepala Madrasah', color: '#1b5e20', page: 'pkkm.html' },
        { icon: '🛠️', title: 'Master PKKM', desc: 'Kelola Instrumen PKKM', color: '#0dd940', page: '/pages/master-pkkm.html' },
        { 
            icon: '📗',  // ← Tetap tambahkan icon sebagai fallback
            title: 'RDM', 
            desc: 'Raport Digital Madrasah', 
            color: '#283593', 
            url: 'https://manbantaeng.rdmnet.my.id/',
            logo: 'assets/images/rapor-app.png'  // ← Path ke logo
        },
        { icon: '📈', title: 'LCKH', desc: 'Laporan Capaian Kinerja Harian', color: '#c62828', page: 'pages/jurnal.html' },
        { 
            icon: '📊', 
            title: 'Rekap Absensi', 
            desc: 'Lihat & Download Rekapitulasi Absen', 
            color: '#d79119', 
            url: 'sican/rekap-sican.html' 
        }
    ]
};
