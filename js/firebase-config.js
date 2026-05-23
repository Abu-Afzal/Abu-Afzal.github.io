import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDr7QQrwFLKKlqYdeNeKsNCjqo3KbLIjfs",
  authDomain: "masjid-al-muhajirin-1c33f.firebaseapp.com",
  databaseURL: "https://masjid-al-muhajirin-1c33f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "masjid-al-muhajirin-1c33f",
  storageBucket: "masjid-al-muhajirin-1c33f.firebasestorage.app",
  messagingSenderId: "612566112060",
  appId: "1:612566112060:web:509865825406532c10f039",
  measurementId: "G-4YHLHK0G3J"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
