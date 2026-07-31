import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const loginForm = document.getElementById('admin-login-form');
const authMessage = document.getElementById('auth-message');
const togglePassword = document.querySelector('.toggle-password');

// --- Helper: Show Message ---
const showMessage = (msg, type) => {
    if(!authMessage) return;
    authMessage.textContent = msg;
    authMessage.className = `auth-message msg-${type}`;
    authMessage.style.display = 'block';
};

// --- Password Hide/Show Logic ---
if(togglePassword) {
    togglePassword.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if(input.type === 'password') {
            input.type = 'text';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            input.type = 'password';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        }
    });
}

// ==========================================
// Ultra-Secure Admin Login Logic
// ==========================================
if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const btn = document.getElementById('admin-login-btn');

        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            btn.disabled = true;

            // 1. Authenticate with Firebase (Email & Password check)
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Security Check: Is this user in the "admins" database?
            const adminDoc = await getDoc(doc(db, "admins", user.uid));
            
            if (!adminDoc.exists()) {
                // If a normal student tries to login here, kick them out immediately!
                await signOut(auth);
                throw new Error("Access Denied: You do not have Admin privileges.");
            }

            // 3. Success! Allow access
            showMessage("Security Clearance Granted! Redirecting...", "success");
            setTimeout(() => window.location.href = "admin-dashboard.html", 1500);

        } catch (error) {
            // Ensure logout on any failure
            await signOut(auth);
            
            let errorMsg = error.message.replace("Firebase: ", "");
            // User friendly invalid credential message
            if(error.code === 'auth/invalid-credential') {
                errorMsg = "Invalid Email or Password.";
            }
            
            showMessage(errorMsg, "error");
            btn.innerHTML = 'Secure Login';
            btn.disabled = false;
        }
    });
}