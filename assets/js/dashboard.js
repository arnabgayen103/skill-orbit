import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
// 1. DOM Elements
// ==========================================
const greetingName = document.getElementById('greeting-name');
const userAvatarContainer = document.getElementById('user-avatar-container');
const profileNameDisplay = document.getElementById('profile-name-display');
const profileEmailDisplay = document.getElementById('profile-email-display');
const profileProviderBadge = document.getElementById('profile-provider-badge');
const profilePageAvatar = document.getElementById('profile-page-avatar');
const logoutBtn = document.getElementById('logout-btn');

// ==========================================
// 2. Authentication Check & User Data Fetch
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Load Dynamic Categories for Dropdowns
            loadDynamicCategories();

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                // Set Name & Greeting
                const firstName = userData.name.split(' ')[0];
                if(greetingName) greetingName.textContent = `Welcome, ${firstName}! 👋`;
                if(profileNameDisplay) profileNameDisplay.textContent = userData.name;
                if(profileEmailDisplay) profileEmailDisplay.textContent = userData.email;
                if(profileProviderBadge) profileProviderBadge.textContent = userData.authProvider === 'google' ? 'Google Account' : 'Email Account';

                // Set Avatar
                if (userData.photoURL) {
                    const imgTag = `<img src="${userData.photoURL}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    if(userAvatarContainer) userAvatarContainer.innerHTML = imgTag;
                    if(profilePageAvatar) profilePageAvatar.innerHTML = imgTag;
                } else {
                    const initial = userData.name.charAt(0).toUpperCase();
                    const initialTag = `<div class="avatar-initial" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--gradient-primary); color:#fff; font-weight:bold;">${initial}</div>`;
                    if(userAvatarContainer) userAvatarContainer.innerHTML = initialTag;
                    if(profilePageAvatar) profilePageAvatar.innerHTML = `<div class="avatar-initial" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--gradient-primary); color:#fff; font-size:40px; font-weight:bold;">${initial}</div>`;
                }

                // Hide Password update form if logged in via Google
                if(userData.authProvider === 'google') {
                    const passForm = document.getElementById('password-update-form');
                    if(passForm) passForm.style.display = 'none';
                    const passHeader = document.querySelector('.profile-body h4');
                    if(passHeader) passHeader.textContent = "Google Accounts cannot change password from here.";
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.href = "student-auth.html";
    }
});

// ==========================================
// 3. Sidebar Navigation (SPA Logic)
// ==========================================
const menuItems = document.querySelectorAll('.menu-item[data-target]');
const views = document.querySelectorAll('.dashboard-view');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(menu => menu.classList.remove('active'));
        item.classList.add('active');

        views.forEach(view => {
            view.classList.remove('active-view');
            view.classList.add('hidden-view');
        });

        const targetId = item.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        if(targetView) {
            targetView.classList.remove('hidden-view');
            targetView.classList.add('active-view');
        }

        if(window.innerWidth <= 992) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });
});

const openSidebarBtn = document.getElementById('open-sidebar');
if(openSidebarBtn) openSidebarBtn.addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
const closeSidebarBtn = document.getElementById('close-sidebar');
if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));

// ==========================================
// 4. Fetch Notes Logic
// ==========================================
const fetchNotesBtn = document.getElementById('fetch-notes-btn');
const notesContainer = document.getElementById('notes-results-container');

if(fetchNotesBtn) {
    fetchNotesBtn.addEventListener('click', async () => {
        const stream = document.getElementById('filter-stream').value;
        const semester = document.getElementById('filter-semester').value;
        const subject = document.getElementById('filter-subject').value;

        if(!stream || !semester || !subject) {
            showToast("Selection Required", "Please specify the Stream, Semester, and Subject to fetch study materials.", "info");
            return;
        }

        notesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-neon-blue);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Loading Notes...</p></div>';

        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            const userBookmarks = userData.bookmarks || []; 
            const bookmarkedIds = userBookmarks.map(b => b.id);

            const materialsRef = collection(db, "study_materials");
            const q = query(materialsRef, 
                where("type", "==", "note"),
                where("stream", "==", stream),
                where("semester", "==", semester),
                where("subject", "==", subject)
            );

            const querySnapshot = await getDocs(q);
            notesContainer.innerHTML = ''; 

            if(querySnapshot.empty) {
                notesContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-secondary);"><i class="fa-solid fa-folder-open" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i><p>No notes found for this selection.</p></div>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const noteId = docSnap.id;
                
                let driveLink = data.driveLink;
                if(driveLink.includes('/view')) {
                    driveLink = driveLink.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
                }

                const isBookmarked = bookmarkedIds.includes(noteId);
                const bookmarkIcon = isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
                const bookmarkColor = isBookmarked ? 'var(--color-neon-blue)' : 'var(--color-text-secondary)';

                const card = document.createElement('div');
                card.className = 'notice-card glass-effect fade-in-up';
                card.style.padding = '25px';
                card.style.borderRadius = 'var(--radius-lg)';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge" style="background: rgba(0, 210, 255, 0.1); padding: 5px 10px; border-radius: 20px; font-size: 12px; color: var(--color-neon-blue);">${data.chapter}</span>
                        <button class="bookmark-btn" onclick="toggleBookmark(this, '${noteId}', '${data.title}', '${data.chapter}', '${driveLink}')" style="background: none; border: none; color: ${bookmarkColor}; cursor: pointer; font-size: 16px; transition: 0.3s;" title="Save Bookmark">
                            <i class="${bookmarkIcon}"></i>
                        </button>
                    </div>
                    <h4 style="margin-top: 15px; font-size: 18px; color: #fff;">${data.title}</h4>
                    <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 15px;">Uploaded: Recently</p>
                    <button class="btn btn-primary open-note-btn" data-link="${driveLink}" data-title="${data.title}" style="padding: 10px 20px; font-size: 14px; border: none; border-radius: var(--radius-pill); cursor: pointer;">
                        Read Note <i class="fa-solid fa-lock"></i>
                    </button>
                `;
                notesContainer.appendChild(card);
            });

            document.querySelectorAll('.open-note-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const link = e.target.closest('button').getAttribute('data-link');
                    const title = e.target.closest('button').getAttribute('data-title');
                    openSecureViewer(title, link);
                });
            });

        } catch (error) {
            console.error("Error fetching notes: ", error);
            notesContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-danger);"><p>Error loading notes. Please try again.</p></div>';
        }
    });
}

// ==========================================
// 5. Bookmark System Logic
// ==========================================
window.toggleBookmark = async function(btnElement, noteId, title, chapter, link) {
    const user = auth.currentUser;
    if(!user) return;

    const icon = btnElement.querySelector('i');
    const isBookmarked = icon.classList.contains('fa-solid');
    const userRef = doc(db, "users", user.uid);
    const noteData = { id: noteId, title, chapter, link };

    try {
        if(isBookmarked) {
            icon.classList.replace('fa-solid', 'fa-regular');
            btnElement.style.color = "var(--color-text-secondary)";
            await updateDoc(userRef, { bookmarks: arrayRemove(noteData) });
        } else {
            icon.classList.replace('fa-regular', 'fa-solid');
            btnElement.style.color = "var(--color-neon-blue)";
            await updateDoc(userRef, { bookmarks: arrayUnion(noteData) });
        }
        
        const bookmarksView = document.getElementById('bookmarks-view');
        if(bookmarksView && bookmarksView.classList.contains('active-view')) {
            loadBookmarks();
        }
    } catch (error) {
        console.error("Error updating bookmark:", error);
        showToast("Action Failed", "Could not update your bookmarks. Please try again later.", "error");
    }
};

async function loadBookmarks() {
    const user = auth.currentUser;
    if(!user) return;

    const bContainer = document.getElementById('bookmarks-results-container');
    if(!bContainer) return;
    
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const bookmarks = userData.bookmarks || [];

        if(bookmarks.length === 0) {
            bContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
                    <i class="fa-regular fa-bookmark" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>You haven't bookmarked any notes yet.</p>
                </div>`;
            return;
        }

        bContainer.innerHTML = '';

        bookmarks.forEach(note => {
            const card = document.createElement('div');
            card.className = 'notice-card glass-effect fade-in-up';
            card.style.padding = '25px';
            card.style.borderRadius = 'var(--radius-lg)';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge" style="background: rgba(0, 210, 255, 0.1); padding: 5px 10px; border-radius: 20px; font-size: 12px; color: var(--color-neon-blue);">${note.chapter}</span>
                    <button class="bookmark-btn" onclick="toggleBookmark(this, '${note.id}', '${note.title}', '${note.chapter}', '${note.link}')" style="background: none; border: none; color: var(--color-neon-blue); cursor: pointer; font-size: 16px; transition: 0.3s;" title="Remove Bookmark">
                        <i class="fa-solid fa-bookmark"></i>
                    </button>
                </div>
                <h4 style="margin-top: 15px; font-size: 18px; color: #fff;">${note.title}</h4>
                <button class="btn btn-primary open-note-btn" data-link="${note.link}" data-title="${note.title}" style="padding: 10px 20px; font-size: 14px; border: none; border-radius: var(--radius-pill); cursor: pointer; margin-top: 15px;">
                    Read Note <i class="fa-solid fa-lock"></i>
                </button>
            `;
            bContainer.appendChild(card);
        });

        bContainer.querySelectorAll('.open-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = e.target.closest('button').getAttribute('data-link');
                const title = e.target.closest('button').getAttribute('data-title');
                openSecureViewer(title, link);
            });
        });

    } catch (error) {
        console.error("Error loading bookmarks:", error);
    }
}

const bookmarksMenuBtn = document.querySelector('[data-target="bookmarks-view"]');
if(bookmarksMenuBtn) bookmarksMenuBtn.addEventListener('click', loadBookmarks);


// ==========================================
// 6. Secure Document Viewer (Modal)
// ==========================================
const viewerModal = document.getElementById('doc-viewer-modal');
const closeViewerBtn = document.getElementById('close-viewer-btn');
const secureIframe = document.getElementById('secure-iframe');
const viewerTitle = document.getElementById('viewer-title');

function openSecureViewer(title, link) {
    if(viewerTitle) viewerTitle.textContent = title;
    if(secureIframe) secureIframe.src = link;
    if(viewerModal) viewerModal.style.display = 'flex';
}

if(closeViewerBtn) {
    closeViewerBtn.addEventListener('click', () => {
        viewerModal.style.display = 'none';
        secureIframe.src = ''; 
    });
}
if(viewerModal) viewerModal.addEventListener('contextmenu', e => e.preventDefault());


// ==========================================
// 7. Live Search Logic
// ==========================================
const searchInput = document.getElementById('live-search-input');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const activeView = document.querySelector('.active-view');
        if(!activeView) return;
        
        const cards = activeView.querySelectorAll('.notice-card');
        cards.forEach(card => {
            const titleElement = card.querySelector('h4');
            const badgeElement = card.querySelector('.badge');
            
            if (titleElement && badgeElement) {
                const title = titleElement.textContent.toLowerCase();
                const chapter = badgeElement.textContent.toLowerCase();
                
                if(title.includes(searchTerm) || chapter.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });

    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = "var(--color-neon-blue)";
        searchInput.style.boxShadow = "var(--glow-shadow)";
        searchInput.style.width = "300px";
    });

    searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = "rgba(255,255,255,0.1)";
        searchInput.style.boxShadow = "none";
        searchInput.style.width = "250px";
    });
}

// ==========================================
// 8. Profile Update & Support
// ==========================================
const passForm = document.getElementById('password-update-form');
if(passForm) {
    passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPass = document.getElementById('old-password').value;
        const newPass = document.getElementById('new-password').value;
        const passMsg = document.getElementById('pass-msg');
        const btn = document.getElementById('update-pass-btn');
        
        try {
            btn.innerHTML = 'Updating...';
            btn.disabled = true;
            
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, oldPass);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPass);
            
            showToast("Security Updated", "Your account password has been successfully changed.", "success");
            passForm.reset();
            passMsg.textContent = ""; 
            
        } catch (error) {
            showToast("Update Failed", error.message.replace("Firebase: ", ""), "error");
            passMsg.textContent = ""; 
        } finally {
            btn.innerHTML = 'Change Password';
            btn.disabled = false;
        }
    });
}

const supportForm = document.getElementById('support-form');
if(supportForm) {
    supportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Message Sent!';
        btn.style.background = "var(--color-success)";
        
        showToast("Message Dispatched", "Your support request has been securely sent to the administration team.", "success");

        setTimeout(() => {
            btn.innerHTML = 'Send Message';
            btn.style.background = "var(--gradient-primary)";
            e.target.reset();
        }, 3000);
    });
}

// ==========================================
// 9. Logout Logic
// ==========================================
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "student-auth.html";
        }).catch((error) => {
            console.error("Sign out error", error);
            showToast("Logout Failed", "An error occurred while logging out. Please try again.", "error");
        });
    });
}

// ==========================================
// 10. DYNAMIC CATEGORY FETCHING
// ==========================================
async function loadDynamicCategories() {
    try {
        const catDocRef = doc(db, "settings", "categories");
        const catDoc = await getDoc(catDocRef);
        
        if (catDoc.exists()) {
            const data = catDoc.data();
            
            const streamSelect = document.getElementById('filter-stream');
            const semSelect = document.getElementById('filter-semester');
            const subSelect = document.getElementById('filter-subject');

            if(streamSelect && data.streams && data.streams.length > 0) {
                streamSelect.innerHTML = '<option value="" disabled selected>Select Stream</option>' 
                    + data.streams.map(s => `<option value="${s}">${s}</option>`).join('');
            }
            if(semSelect && data.semesters && data.semesters.length > 0) {
                semSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>' 
                    + data.semesters.map(s => `<option value="${s}">${s}</option>`).join('');
            }
            if(subSelect && data.subjects && data.subjects.length > 0) {
                subSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>' 
                    + data.subjects.map(s => `<option value="${s}">${s}</option>`).join('');
            }
        }
    } catch(error) {
        console.error("Error loading dynamic categories:", error);
    }
}

// ==========================================
// 11. Fetch and Display Notices (NEW UPDATE)
// ==========================================
async function loadNotices() {
    const noticesContainer = document.getElementById('notices-container'); 
    
    if (!noticesContainer) return;

    try {
        noticesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-neon-blue);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Loading Notices...</p></div>';
        
        const noticesRef = collection(db, "notices");
        const q = query(noticesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        noticesContainer.innerHTML = '';

        if (querySnapshot.empty) {
            noticesContainer.innerHTML = '<div class="empty-state" style="text-align: center; padding: 40px; color: var(--color-text-secondary);"><i class="fa-solid fa-bell-slash" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i><p>No new notices at the moment.</p></div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            let dateStr = 'Just Now';
            if(data.createdAt) {
                const dateObj = data.createdAt.toDate();
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            const card = document.createElement('div');
            card.className = 'notice-card glass-effect fade-in-up';
            card.style.padding = '20px';
            card.style.marginBottom = '15px';
            card.style.borderLeft = '4px solid var(--color-neon-purple)';
            card.style.borderRadius = 'var(--radius-md)';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="color: #fff; margin: 0; font-size: 18px;">${data.title}</h4>
                    <span style="font-size: 12px; color: var(--color-neon-purple); background: rgba(122, 40, 203, 0.1); padding: 4px 10px; border-radius: 20px; font-weight: 600;">${dateStr}</span>
                </div>
                <p style="color: var(--color-text-secondary); font-size: 14px; margin: 0; line-height: 1.6;">${data.description}</p>
            `;
            
            noticesContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading notices:", error);
        noticesContainer.innerHTML = '<div style="color: var(--color-danger); text-align: center; padding: 20px;">Failed to load notices. Please try again.</div>';
    }
}

const noticesMenuBtn = document.querySelector('[data-target="notices-view"]');
if(noticesMenuBtn) noticesMenuBtn.addEventListener('click', loadNotices);

document.addEventListener("DOMContentLoaded", () => {
    loadNotices();
});

// ==========================================
// PWA FORCE INSTALLATION LOGIC (GATEKEEPER)
// ==========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .catch(err => console.error('Service Worker Error:', err));
    });
}

const installOverlay = document.getElementById('force-install-overlay');
const installBtn = document.getElementById('install-app-btn');
const iosInstruction = document.getElementById('ios-install-instruction');
let deferredPrompt = null;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (isStandalone) {
    if(installOverlay) installOverlay.style.display = 'none';
} else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && iosInstruction) {
        iosInstruction.style.display = 'block';
    }

    // Capture the native install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // Make sure the button is fully active and clickable
    if(installBtn) {
        installBtn.style.display = 'block'; 
        installBtn.style.cursor = 'pointer';

        installBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (deferredPrompt) {
                // Trigger real Chrome install prompt
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('App Installed Successfully');
                }
                deferredPrompt = null;
            } else {
                // If Chrome restricts direct prompt, give a stylish visual prompt & guide
                showToast(
                    "Action Required", 
                    "Please look at the right side of your browser's address bar and click the 'Install/Monitor' icon to set up the app.", 
                    "info"
                );

                // Visual highlight effect on browser address bar area
                console.log("Tip: Use the browser's top-right install icon.");
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if(installOverlay) installOverlay.style.display = 'none';
        showToast("Installation Complete", "Welcome to the premium app experience!", "success");
    });
}

// ==========================================
// PWA AUTO-UPDATE NOTIFICATION SYSTEM
// ==========================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(reg => {
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Show the Update Popup
                    const updatePopup = document.getElementById('update-popup');
                    if (updatePopup) {
                        updatePopup.style.display = 'block';
                    }
                }
            });
        });
    });

    // Handle Update Button Click
    const reloadBtn = document.getElementById('reload-app-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            window.location.reload(); // Automatically reloads and applies the new version
        });
    }
}

// ==========================================
// OFFLINE NOTE DOWNLOAD SYSTEM (PWA CACHE)
// ==========================================

// ১. নোট অফলাইনে সেভ করার ফাংশন
window.downloadNoteOffline = async (noteUrl, noteTitle) => {
    try {
        alert('Downloading Note... Please wait.');

        // ক্যাশ স্টোরেজ ওপেন করে ফাইলটি সেভ করা
        const cache = await caches.open('skill-orbit-offline-notes');
        await cache.add(noteUrl);

        // নোটের নাম ও লিংক লোকাল স্টোরেজে সেভ করা (যাতে অফলাইন পেজে দেখানো যায়)
        let offlineNotes = JSON.parse(localStorage.getItem('offlineNotes') || '[]');
        
        // চেক করা যে নোটটি আগে থেকে আছে কি না
        if(!offlineNotes.some(n => n.url === noteUrl)) {
            offlineNotes.push({ title: noteTitle, url: noteUrl });
            localStorage.setItem('offlineNotes', JSON.stringify(offlineNotes));
        }

        alert('✅ Download Complete! You can now read this without internet.');
        renderOfflineNotes(); // UI আপডেট করা
    } catch (error) {
        console.error('Offline save failed', error);
        alert('❌ Failed to download. Please check your internet connection.');
    }
};

// ২. অফলাইন পেজে নোটগুলো দেখানোর ফাংশন
window.renderOfflineNotes = () => {
    const container = document.getElementById('offline-results-container');
    if(!container) return;

    let offlineNotes = JSON.parse(localStorage.getItem('offlineNotes') || '[]');

    if (offlineNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
                <i class="fa-solid fa-cloud-arrow-down" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>You haven't downloaded any notes yet.</p>
            </div>`;
        return;
    }

    let html = '';
    offlineNotes.forEach((note, index) => {
        html += `
        <div class="notice-card glass-effect">
            <h4 style="color: #fff; margin-bottom: 10px;">${note.title}</h4>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn btn-primary" onclick="openDocument('${note.url}', '${note.title}')" style="padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; flex: 1;">
                    <i class="fa-solid fa-book-open"></i> Read Offline
                </button>
                <button class="btn btn-secondary" onclick="deleteOfflineNote(${index})" style="padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; background: rgba(255, 75, 75, 0.2); color: #ff4b4b;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
};

// ৩. অফলাইন নোট ডিলিট করার ফাংশন
window.deleteOfflineNote = (index) => {
    let offlineNotes = JSON.parse(localStorage.getItem('offlineNotes') || '[]');
    let noteToDelete = offlineNotes[index];
    
    // ক্যাশ থেকেও ফাইলটি রিমুভ করা
    caches.open('skill-orbit-offline-notes').then(cache => {
        cache.delete(noteToDelete.url);
    });

    // লিস্ট থেকে রিমুভ করা
    offlineNotes.splice(index, 1);
    localStorage.setItem('offlineNotes', JSON.stringify(offlineNotes));
    renderOfflineNotes();
};

// পেজ লোড হলে অফলাইন নোটগুলো রেন্ডার করা
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('offline-results-container')) {
        renderOfflineNotes();
    }
});
