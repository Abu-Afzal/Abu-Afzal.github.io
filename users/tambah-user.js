import { auth, db } from '../js/firebase-config.js';

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    renderCheckboxFitur,
    getSelectedFitur,
    SEMUA_FITUR
} from './fitur.js';

renderCheckboxFitur('checkboxFitur');

const formTambah = document.getElementById('formTambahUser');

const btnTambah  = document.getElementById('btnTambah');

formTambah?.addEventListener('submit', async(e)=>{

    e.preventDefault();

    const email    = document.getElementById('email').value.trim();

    const nama     = document.getElementById('nama').value.trim();

    const password = document.getElementById('password').value;

    const role     = document.getElementById('role').value;

    const fitur    = getSelectedFitur('checkboxFitur');

    try{

        btnTambah.disabled = true;

        btnTambah.innerHTML = 'Menyimpan...';

        const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        await setDoc(
            doc(db, 'users', email),
            {
                uid   : cred.user.uid,
                email,
                nama,
                role,
                fitur,
                createdAt : new Date().toISOString()
            }
        );

        alert('✅ User berhasil dibuat');

        formTambah.reset();

        renderCheckboxFitur('checkboxFitur');

        window.loadUsers();

    }catch(err){

        console.error(err);

        alert(err.message);

    }

    btnTambah.disabled = false;

    btnTambah.innerHTML = '💾 Simpan User';

});

document.getElementById('role')?.addEventListener('change', e=>{

    if(e.target.value === 'admin'){

        SEMUA_FITUR.forEach(f=>{

            const el = document.getElementById(
                `checkboxFitur_${f.id}`
            );

            if(el){
                el.checked = true;
            }

        });

    }

});
