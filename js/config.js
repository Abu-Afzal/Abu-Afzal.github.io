const CONFIG = {
    layananUmum: [
        { 
            id: 'pusaka', 
            title: 'Absensi Pusaka', 
            desc: '', 
            color: '#283593', 
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
            title: 'EMIS GTK', 
            desc: '', 
            color: '#7e57c2', 
            url: 'https://emis.kemenag.go.id/' 
        },
        { 
            id: 'simpeg', 
            icon: '📘', 
            title: 'SIMPEG 5', 
            desc: '', 
            color: '#546e7a', 
            url: 'https://simpeg5.kemenag.go.id/' 
        }
    ],
    
    layananMadrasah: [
        { icon: '🌐', title: 'Website', desc: '', color: '#37474f', page: 'pages/website.html' },
        { icon: '🧾', title: 'PMBM', desc: '', color: '#00695c', page: 'pages/pmbm.html' },
        { icon: '🏢', title: 'PTSP', desc: '', color: '#00897b', page: 'pages/ptsp.html' },
        { icon: '📖', title: 'NILABS', desc: '', color: '#3949ab', page: 'pages/nilabs.html' },
        { icon: '✅', title: 'SiTaat', desc: '', color: '#f57c00', page: 'pages/sitaat.html' },
        { icon: '🪪', title: 'SIDIKS', desc: '', color: '#263238', page: 'pages/sidiks.html' },
        { icon: '🎓', title: 'E-Learning', desc: '', color: '#d32f2f', page: 'pages/elearning.html' },
        { icon: '📁', title: 'E-Dokumen', desc: '', color: '#1e88e5', page: 'pages/edokumen.html' },
        { icon: '🏥', title: 'UKSmart', desc: '', color: '#e91e63', page: 'pages/uksmart.html' },
        { icon: '📚', title: 'E-Perpus', desc: '', color: '#6d4c41', page: 'pages/eperpus.html' },
        { icon: '🎯', title: 'Ekskul', desc: '', color: '#009688', page: 'pages/ekskul.html' },
        { icon: '👁️', title: 'Supervisi', desc: '', color: '#78909c', page: 'pages/supervisi.html' },
        { icon: '🏆', title: 'Prestasi', desc: '', color: '#546e7a', page: 'pages/prestasi.html' },
        { icon: '📊', title: 'PKKM', desc: '', color: '#1b5e20', page: 'pages/pkkm.html' },
        { 
            icon: '📗',  // ← Tetap tambahkan icon sebagai fallback
            title: 'RDM', 
            desc: '', 
            color: '#283593', 
            url: 'https://manbantaeng.rdmnet.my.id/',
            logo: 'assets/images/rapor-app.png'  // ← Path ke logo
        },
        { icon: '📈', title: 'ScoreUp!', desc: '', color: '#c62828', page: 'pages/scoreup.html' }
    ]
};
