import { db, storage } from './firebase-config.js';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

export const DokumenService = {
  // Upload file ke Storage + simpan metadata ke Firestore
  async uploadDokumen(file, kategori, namaDokumen) {
    if (!file || !kategori || !namaDokumen) throw new Error("Data tidak lengkap");
    
    const storageRef = ref(storage, `dokumen/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => { /* bisa tambahkan progress bar nanti */ },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "dokumen"), {
            nama: namaDokumen.trim(),
            kategori,
            url,
            fileName: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });
          resolve(url);
        }
      );
    });
  },

  // Ambil daftar dokumen (terbaru dulu)
  async getDokumen() {
    const q = query(collection(db, "dokumen"), orderBy("uploadedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Hapus dokumen + file di storage (opsional, untuk admin nanti)
  async hapusDokumen(dokId, storagePath) {
    await deleteDoc(doc(db, "dokumen", dokId));
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  }
};
