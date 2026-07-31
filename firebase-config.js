// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0hRETLILHM-yqElC84xcrrrUApDkN020",
  authDomain: "skill-orbit-bbbb0.firebaseapp.com",
  projectId: "skill-orbit-bbbb0",
  storageBucket: "skill-orbit-bbbb0.firebasestorage.app",
  messagingSenderId: "153498898539",
  appId: "1:153498898539:web:d4477fb767d421d83aa12e",
  measurementId: "G-3X7ZSZKPHY"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };