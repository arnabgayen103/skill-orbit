import { auth, db, googleProvider } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// PREMIUM TOAST NOTIFICATION FUNCTION
// ==========================================
window.showToast = function(title, message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-exclamation"></i>',
        info: '<i class="fa-solid fa-bell"></i>'
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 4.5 seconds
    setTimeout(() => {
        toast.classList.add('closing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4500);
};

// ==========================================
// DOM Elements
// ==========================================
const loginTab = document.getElementById('show-login');
const signupTab = document.getElementById('show-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authMessage = document.getElementById('auth-message');
const togglePasswords = document.querySelectorAll('.toggle-password');
const googleBtn = document.getElementById('google-signin-btn');

// --- Tab Switching Logic ---
if(loginTab && signupTab) {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active-form');
        loginForm.classList.remove('hidden-form');
        signupForm.classList.add('hidden-form');
        signupForm.classList.remove('active-form');
        if(authMessage) authMessage.style.display = 'none';
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active-form');
        signupForm.classList.remove('hidden-form');
        loginForm.classList.add('hidden-form');
        loginForm.classList.remove('active-form');
        if(authMessage) authMessage.style.display = 'none';
    });
}

// --- Password Hide/Show Logic ---
togglePasswords.forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if(input.type === 'password') {
            input.type = 'text';
            this.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            input.type = 'password';
            this.classList.replace('fa-eye', 'fa-eye-slash');
        }
    });
});

// ==========================================
// Sign Up Logic (With Email Verification)
// ==========================================
if(signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const btn = document.getElementById('signup-btn');

        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
            btn.disabled = true;

            // 1. Create User in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Save User Data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                authProvider: 'email',
                createdAt: serverTimestamp()
            });

            // 3. Send Verification Email
            await sendEmailVerification(user);

            // 4. Force Sign Out 
            await signOut(auth);

            // 5. Show Professional Success Message
            showToast("Account Initialized", "A verification link has been dispatched to your email. Please verify your identity to proceed.", "success");
            
            // Switch to Login Tab automatically after 4 seconds
            setTimeout(() => {
                signupTab.classList.remove('active');
                loginTab.classList.add('active');
                signupForm.classList.remove('active-form');
                signupForm.classList.add('hidden-form');
                loginForm.classList.remove('hidden-form');
                loginForm.classList.add('active-form');
                signupForm.reset();
                if(authMessage) authMessage.style.display = 'none';
            }, 4000);

        } catch (error) {
            showToast("Registration Incomplete", error.message.replace("Firebase: ", ""), "error");
        } finally {
            btn.innerHTML = 'Sign Up';
            btn.disabled = false;
        }
    });
}

// ==========================================
// Login Logic (With Email Verification Check)
// ==========================================
if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');

        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
            btn.disabled = true;

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Security Check: Is the email verified?
            if (!user.emailVerified) {
                await signOut(auth);
                throw new Error("unverified-email");
            }

            showToast("Access Granted", "Welcome back! Preparing your learning workspace...", "success");
            setTimeout(() => window.location.href = "student-dashboard.html", 1500);

        } catch (error) {
            if (error.message === "unverified-email") {
                showToast("Verification Pending", "Please verify your email address via the link sent to your inbox to unlock your account.", "error");
            } else {
                // Generic error for wrong email/password
                showToast("Access Denied", "Invalid credentials. Please verify your email and password and try again.", "error");
            }
            btn.innerHTML = 'Login';
            btn.disabled = false;
        }
    });
}

// ==========================================
// Google Login Logic 
// ==========================================
if(googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
            googleBtn.disabled = true;
            
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName,
                    email: user.email,
                    authProvider: 'google',
                    createdAt: serverTimestamp()
                });
            }
            
            showToast("Secure Connection Established", "Google authentication successful. Redirecting to your workspace...", "success");
            setTimeout(() => window.location.href = "student-dashboard.html", 1500);
            
        } catch (error) {
            showToast("Authentication Interrupted", "Could not establish a secure connection with Google. Please try again.", "error");
            googleBtn.innerHTML = '<i class="fa-brands fa-google"></i> Continue with Google';
            googleBtn.disabled = false;
        }
    });
}