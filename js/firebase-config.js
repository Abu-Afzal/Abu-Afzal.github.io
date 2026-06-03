import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
// 1. TAMBAHKAN IMPORT FIRESTORE DI SINI
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670",
  measurementId: "G-1D5DWJV54E"
};

const app = initializeApp(firebaseConfig);

// 2. KITA EKSPOR DUA-DUANYA AGAR AMAN
export const rtdb = getDatabase(app);      // RTDB lama tetap bisa diakses dengan nama rtdb jika dibutuhkan
export const db = getFirestore(app);        // Variabel db SEKARANG MENJADI FIRESTORE
export const storage = getStorage(app);
