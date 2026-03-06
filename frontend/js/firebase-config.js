
// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyUDpOct_C3J5k4tG2rBo0dtCn8qSAx_s",
  authDomain: "rentilla-app.firebaseapp.com",
  projectId: "rentilla-app",
  storageBucket: "rentilla-app.firebasestorage.app",
  messagingSenderId: "1043447766005",
  appId: "1:1043447766005:web:15c70cc5879ffbfbacdebc",
  measurementId: "G-00Y4392NX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// export for use in other files
export { auth, db };
