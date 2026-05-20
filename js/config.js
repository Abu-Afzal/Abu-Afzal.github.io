const CONFIG = {
    appName: 'SIPELITA',
    version: '1.0.0',
    
    urls: {
        pusaka: 'https://absensi.kemenag.go.id',
        myasn: 'https://myasn.bkn.go.id/',
        emis: 'https://emis.kemenag.go.id/',
        simpeg: 'https://simpeg5.kemenag.go.id/',
        rdm: 'https://manbantaeng.rdmnet.my.id/'
    },
    
    layananUmum: [
        { 
            id: 'pusaka', 
            title: 'Pelaporan Pusaka', 
            desc: '', 
            color: '#9c27b0', 
            url: 'https://absensi.kemenag.go.id',
            logo: '../assets/images/icon-app.png'
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
        { icon: '🌐', title: 'Website', desc: '', color: '#37474f', page: 'website.html' },
        { icon: '🧾', title: 'PMBM', desc: '', color: '#00695c', page: 'pmbm.html' },
        { icon: '🏢', title: 'PTSP', desc: '', color: '#00897b', page: 'ptsp.html' },
        { icon: '📖', title: 'NILABS', desc: '', color: '#3949ab', page: 'nilabs.html' },
        { icon: '📗', title: 'RDM', desc: '', color: '#7e57c2', page: 'rdm.html' },
        { icon: '📈', title: 'ScoreUp!', desc: '', color: '#c62828', page: 'scoreup.html' }
    ]
};
