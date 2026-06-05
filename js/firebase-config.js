```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// FIREBASE CONFIG
const firebaseConfig = {

  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",

  authDomain: "sipelita-digital.firebaseapp.com",

  databaseURL:
  "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "sipelita-digital",

  storageBucket: "sipelita-digital.firebasestorage.app",

  messagingSenderId: "787840817745",

  appId:
  "1:787840817745:web:e6b5237cfbb5e51be93670",

  measurementId: "G-1D5DWJV54E"
};


// INITIALIZE APP
const app = initializeApp(firebaseConfig);


// EXPORT SERVICES
export const auth = getAuth(app);

export const rtdb = getDatabase(app);

export const db = getFirestore(app);

export const storage = getStorage(app);


// OPTIONAL
export default app;
```
