import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getCountFromServer, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// PREMIUM TOAST NOTIFICATION 
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
    toast.innerHTML = `<div class="toast-icon">${icons[type]}</div><div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('closing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4500);
};

// ==========================================
// ULTRA-MAX PRO CONFIRMATION MODAL (NEW)
// ==========================================
window.showConfirmModal = function(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
    
    const box = document.createElement('div');
    box.style.cssText = "background:rgba(22, 25, 37, 0.95); border:1px solid rgba(255,255,255,0.1); padding:30px; border-radius:15px; text-align:center; max-width:400px; transform:scale(0.8); transition:0.3s; box-shadow: 0 20px 50px rgba(0,0,0,0.5);";
    
    box.innerHTML = `
        <div style="width:60px; height:60px; border-radius:50%; background:rgba(255, 75, 75, 0.1); color:var(--color-danger, #ff4b4b); display:flex; justify-content:center; align-items:center; font-size:28px; margin:0 auto 15px auto;">
            <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="color:#fff; margin-bottom:10px; font-size:22px;">${title}</h3>
        <p style="color:var(--color-text-secondary, #a0a5b1); font-size:14px; margin-bottom:25px; line-height:1.5;">${message}</p>
        <div style="display:flex; justify-content:center; gap:15px;">
            <button id="cancel-modal-btn" style="padding:10px 20px; border-radius:8px; border:none; background:rgba(255,255,255,0.1); color:#fff; cursor:pointer; font-weight:bold; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">Cancel</button>
            <button id="confirm-modal-btn" style="padding:10px 20px; border-radius:8px; border:none; background:var(--color-danger, #ff4b4b); color:#fff; cursor:pointer; font-weight:bold; transition:0.2s;" onmouseover="this.style.boxShadow='0 0 15px rgba(255,75,75,0.5)'" onmouseout="this.style.boxShadow='none'">Yes, Delete</button>
        </div>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = "1";
        box.style.transform = "scale(1)";
    }, 10);
    
    const close = () => {
        overlay.style.opacity = "0";
        box.style.transform = "scale(0.8)";
        setTimeout(() => overlay.remove(), 300);
    };
    
    document.getElementById('cancel-modal-btn').onclick = close;
    document.getElementById('confirm-modal-btn').onclick = () => {
        close();
        onConfirm();
    };
};

// ==========================================
// 1. Smart Admin Security Guard 
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const adminDoc = await getDoc(doc(db, "admins", user.uid));
            if (!adminDoc.exists()) {
                await signOut(auth);
                window.location.replace("admin-login.html");
            } else {
                showToast("Security Clearance Granted", "Welcome to your Admin Dashboard. System is fully operational.", "info");
                loadSystemStats();
            }
        } catch (error) {
            window.location.replace("admin-login.html");
        }
    } else {
        window.location.replace("admin-login.html");
    }
});

// ==========================================
// 2. SPA Navigation Logic
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
    });
});

const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
if(openSidebarBtn && sidebar) openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
if(closeSidebarBtn && sidebar) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// ==========================================
// 3. Fetch Live System Stats
// ==========================================
async function loadSystemStats() {
    try {
        const collUsers = collection(db, "users");
        const snapUsers = await getCountFromServer(collUsers);
        if(document.getElementById('stat-students')) document.getElementById('stat-students').textContent = snapUsers.data().count;

        const collMaterials = collection(db, "study_materials");
        const snapMaterials = await getCountFromServer(collMaterials);
        if(document.getElementById('stat-materials')) document.getElementById('stat-materials').textContent = snapMaterials.data().count;

        const collNotices = collection(db, "notices");
        const snapNotices = await getCountFromServer(collNotices);
        if(document.getElementById('stat-notices')) document.getElementById('stat-notices').textContent = snapNotices.data().count;
    } catch (error) {}
}

// ==========================================
// 4. Material Management (CRUD)
// ==========================================
const matForm = document.getElementById('material-form');
const matSubmitBtn = document.getElementById('mat-submit-btn');
const matCancelBtn = document.getElementById('mat-cancel-btn');
const formHeading = document.getElementById('form-heading');
const tableBody = document.getElementById('materials-table-body');
const materialsRef = collection(db, "study_materials");

async function loadMaterialsTable() {
    if(!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        const q = query(materialsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        tableBody.innerHTML = '';
        if(snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-text-secondary);">No materials found. Upload some!</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            let typeColor = data.type === 'note' ? '#00d2ff' : data.type === 'pyq' ? '#7a28cb' : '#ff4b4b';
            const typeBadge = `<span style="background: ${typeColor}22; color: ${typeColor}; padding: 3px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${data.type}</span>`;
            const safeData = encodeURIComponent(JSON.stringify({...data, id}));
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.innerHTML = `
                <td style="padding: 12px 10px;">${typeBadge}</td>
                <td style="padding: 12px 10px;">
                    <div style="font-weight: 600;">${data.subject}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${data.stream} - ${data.semester} | ${data.chapter}</div>
                </td>
                <td style="padding: 12px 10px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${data.title}">${data.title}</td>
                <td style="padding: 12px 10px; text-align: right;">
                    <a href="${data.driveLink}" target="_blank" style="color: #fff; margin-right: 12px;" title="View Link"><i class="fa-solid fa-link"></i></a>
                    <button onclick="editMaterial('${safeData}')" style="background: none; border: none; color: var(--color-neon-blue); cursor: pointer; margin-right: 12px; font-size: 16px;" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteMaterial('${id}')" style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: 16px;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-danger);">Error fetching data.</td></tr>';
    }
}

if(matForm) {
    matForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        matSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        matSubmitBtn.disabled = true;
        const docId = document.getElementById('mat-id').value;
        const materialData = {
            type: document.getElementById('mat-type').value,
            stream: document.getElementById('mat-stream').value,
            semester: document.getElementById('mat-semester').value,
            subject: document.getElementById('mat-subject').value,
            chapter: document.getElementById('mat-chapter').value,
            title: document.getElementById('mat-title').value,
            driveLink: document.getElementById('mat-link').value
        };
        try {
            if(docId) {
                await updateDoc(doc(db, "study_materials", docId), materialData);
                showToast("Resource Updated", "The study material has been successfully modified.", "success");
            } else {
                materialData.createdAt = serverTimestamp();
                await addDoc(materialsRef, materialData);
                showToast("Resource Published", "The study material has been successfully processed and is now live.", "success");
            }
            resetMaterialForm();
            loadMaterialsTable();
            loadSystemStats();
        } catch (error) {
            showToast("Upload Failed", "An error occurred while saving the material.", "error");
        } finally {
            matSubmitBtn.disabled = false;
        }
    });
}

// [UPDATED] Custom Delete Material
window.deleteMaterial = function(id) {
    showConfirmModal(
        "Delete Material?", 
        "Are you sure you want to permanently delete this material? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, "study_materials", id));
                showToast("Resource Deleted", "The material has been permanently removed.", "success");
                loadMaterialsTable();
                loadSystemStats();
            } catch (error) {
                showToast("Deletion Failed", "Unable to remove the selected material.", "error");
            }
        }
    );
};

window.editMaterial = function(safeDataStr) {
    const data = JSON.parse(decodeURIComponent(safeDataStr));
    document.getElementById('mat-id').value = data.id;
    document.getElementById('mat-type').value = data.type;
    document.getElementById('mat-stream').value = data.stream;
    document.getElementById('mat-semester').value = data.semester;
    document.getElementById('mat-subject').value = data.subject;
    document.getElementById('mat-chapter').value = data.chapter;
    document.getElementById('mat-title').value = data.title;
    document.getElementById('mat-link').value = data.driveLink;

    if(formHeading) { formHeading.textContent = "Edit Material"; formHeading.style.color = "var(--color-neon-purple)"; }
    if(matSubmitBtn) matSubmitBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Update Material';
    if(matCancelBtn) matCancelBtn.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function resetMaterialForm() {
    if(matForm) matForm.reset();
    document.getElementById('mat-id').value = '';
    if(formHeading) { formHeading.textContent = "Upload New Material"; formHeading.style.color = "var(--color-neon-blue)"; }
    if(matSubmitBtn) matSubmitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload Material';
    if(matCancelBtn) matCancelBtn.style.display = 'none';
}

if(matCancelBtn) matCancelBtn.addEventListener('click', resetMaterialForm);
const refreshMatBtn = document.getElementById('refresh-mat-btn');
if(refreshMatBtn) refreshMatBtn.addEventListener('click', loadMaterialsTable);
const materialsMenuBtn = document.querySelector('[data-target="materials-view"]');
if(materialsMenuBtn) materialsMenuBtn.addEventListener('click', loadMaterialsTable);

// ==========================================
// 5. Notice Board Management
// ==========================================
const noticeForm = document.getElementById('notice-form');
const noticeSubmitBtn = document.getElementById('notice-submit-btn');
const noticesTableBody = document.getElementById('notices-table-body');
const noticesRef = collection(db, "notices");

async function loadNoticesTable() {
    if(!noticesTableBody) return;
    noticesTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    try {
        const q = query(noticesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        noticesTableBody.innerHTML = '';
        if(snapshot.empty) {
            noticesTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 30px; color: var(--color-text-secondary);">No active notices.</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            let dateStr = 'Just Now';
            if(data.createdAt) {
                const dateObj = data.createdAt.toDate();
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.innerHTML = `
                <td style="padding: 12px 10px; color: var(--color-neon-blue); font-size: 13px; font-weight: 600;">${dateStr}</td>
                <td style="padding: 12px 10px;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${data.title}</div>
                    <div style="font-size: 13px; color: var(--color-text-secondary);">${data.description}</div>
                </td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button onclick="deleteNotice('${id}')" style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: 16px;" title="Delete Notice"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            noticesTableBody.appendChild(row);
        });
    } catch (error) {
        noticesTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 30px; color: var(--color-danger);">Error fetching notices.</td></tr>';
    }
}

if(noticeForm) {
    noticeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        noticeSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
        noticeSubmitBtn.disabled = true;
        const noticeData = {
            title: document.getElementById('notice-title').value,
            description: document.getElementById('notice-desc').value,
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(noticesRef, noticeData);
            showToast("Notice Broadcasted", "Your notice is now live on the student dashboard.", "success");
            noticeForm.reset();
            loadNoticesTable();
            loadSystemStats(); 
        } catch (error) {
            showToast("Broadcast Failed", "Could not publish the notice.", "error");
        } finally {
            noticeSubmitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Notice';
            noticeSubmitBtn.disabled = false;
        }
    });
}

// [UPDATED] Custom Delete Notice
window.deleteNotice = function(id) {
    showConfirmModal(
        "Revoke Notice?", 
        "Are you sure you want to delete this notice? It will be removed from the Student Dashboard instantly.",
        async () => {
            try {
                await deleteDoc(doc(db, "notices", id));
                showToast("Notice Revoked", "The selected notice has been securely removed.", "success");
                loadNoticesTable();
                loadSystemStats(); 
            } catch (error) {
                showToast("Deletion Failed", "Unable to remove the notice.", "error");
            }
        }
    );
};

const refreshNoticesBtn = document.getElementById('refresh-notices-btn');
if(refreshNoticesBtn) refreshNoticesBtn.addEventListener('click', loadNoticesTable);
const noticesMenuBtn = document.querySelector('[data-target="notices-view"]');
if(noticesMenuBtn) noticesMenuBtn.addEventListener('click', loadNoticesTable);

// ==========================================
// 6. Logout Logic
// ==========================================
const adminLogoutBtn = document.getElementById('admin-logout-btn');
if(adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "admin-login.html";
        }).catch((error) => console.error("Sign out error", error));
    });
}

// ==========================================
// 7. Student Management 
// ==========================================
const studentsTableBody = document.getElementById('students-table-body');
const usersRef = collection(db, "users");

async function loadStudentsTable() {
    if(!studentsTableBody) return;
    studentsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading Students...</td></tr>';
    try {
        const q = query(usersRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        studentsTableBody.innerHTML = '';
        if(snapshot.empty) {
            studentsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-text-secondary);">No students registered yet.</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            let dateStr = 'Unknown';
            if(data.createdAt) {
                const dateObj = data.createdAt.toDate();
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }
            let providerIcon = data.authProvider === 'google' ? '<i class="fa-brands fa-google"></i> Google' : '<i class="fa-solid fa-envelope"></i> Email';
            let providerColor = data.authProvider === 'google' ? '#ea4335' : '#00d2ff';
            
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.innerHTML = `
                <td style="padding: 12px 10px;">
                    <div style="font-weight: 600; font-size: 15px;">${data.name}</div>
                    <div style="font-size: 13px; color: var(--color-text-secondary);">${data.email}</div>
                </td>
                <td style="padding: 12px 10px;">
                    <span style="background: ${providerColor}22; color: ${providerColor}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${providerIcon}
                    </span>
                </td>
                <td style="padding: 12px 10px; color: var(--color-text-secondary); font-size: 13px;">${dateStr}</td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button onclick="removeStudent('${id}')" style="background: rgba(255, 75, 75, 0.1); border: 1px solid rgba(255, 75, 75, 0.3); color: var(--color-danger); padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 13px; transition: 0.3s;" onmouseover="this.style.background='rgba(255, 75, 75, 0.2)'" onmouseout="this.style.background='rgba(255, 75, 75, 0.1)'">
                        <i class="fa-solid fa-user-minus"></i> Remove
                    </button>
                </td>
            `;
            studentsTableBody.appendChild(row);
        });
    } catch (error) {
        studentsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-danger);">Error fetching student data.</td></tr>';
    }
}

// [UPDATED] Custom Remove Student
window.removeStudent = function(id) {
    showConfirmModal(
        "Remove Student?", 
        "Warning! Are you sure you want to remove this student's data? They won't be able to log in until they register again.",
        async () => {
            try {
                await deleteDoc(doc(db, "users", id));
                loadStudentsTable();
                loadSystemStats(); 
                showToast("Student Removed", "The student's record has been securely deleted.", "success");
            } catch (error) {
                showToast("Action Failed", "Could not remove the student record.", "error");
            }
        }
    );
};

const refreshStudentsBtn = document.getElementById('refresh-students-btn');
if(refreshStudentsBtn) refreshStudentsBtn.addEventListener('click', loadStudentsTable);
const studentsMenuBtn = document.querySelector('[data-target="students-view"]');
if(studentsMenuBtn) studentsMenuBtn.addEventListener('click', loadStudentsTable);

// ==========================================
// DYNAMIC CATEGORIES FOR ADMIN PANEL
// ==========================================
async function loadAdminDropdowns() {
    try {
        const catDocRef = doc(db, "settings", "categories");
        const catDoc = await getDoc(catDocRef);
        if (catDoc.exists()) {
            const data = catDoc.data();
            const streamSelect = document.getElementById('mat-stream');
            const semSelect = document.getElementById('mat-semester');
            const subSelect = document.getElementById('mat-subject');

            if(streamSelect && data.streams) streamSelect.innerHTML = '<option value="" disabled selected>Select Stream</option>' + data.streams.map(s => `<option value="${s}">${s}</option>`).join('');
            if(semSelect && data.semesters) semSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>' + data.semesters.map(s => `<option value="${s}">${s}</option>`).join('');
            if(subSelect && data.subjects) subSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>' + data.subjects.map(s => `<option value="${s}">${s}</option>`).join('');
        }
    } catch (error) {}
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminDropdowns();
});