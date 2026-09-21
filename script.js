// ==========================================
// CẤU HÌNH FIREBASE & CLOUDINARY
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBkrYwPmuEW_gmkIGXxjuNt8aQmRh7IFiM",
  authDomain: "khoahocbaigiang.firebaseapp.com",
  projectId: "khoahocbaigiang",
  storageBucket: "khoahocbaigiang.firebasestorage.app",
  messagingSenderId: "973950914132",
  appId: "1:973950914132:web:6f03491283a9cbf92027c1",
  measurementId: "G-JQ634Q72EJ"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const CLOUDINARY_PRESET = "manhducpham";

const AUTH_EMAIL_DOMAIN = "@eduvault.local";
function usernameToEmail(username) {
    return username + AUTH_EMAIL_DOMAIN;
}

// HÀM ESCAPE KÝ TỰ AN TOÀN CHỐNG XSS & ATTRIBUTE INJECTION
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Chỉ cho phép link http/https khi hiển thị làm <a href>, chặn các chiêu
// nhúng "javascript:alert(1)" hay "data:text/html,..." vào ô dán link,
// vì href kiểu đó sẽ chạy mã ngay khi người khác bấm vào link.
function isSafeUrl(url) {
    if (!url) return false;
    try {
        return /^https?:\/\//i.test(String(url).trim());
    } catch (e) {
        return false;
    }
}

// Kiểm tra các ô link do người dùng tự dán trước khi lưu vào database.
// Trả về true nếu tất cả hợp lệ (rỗng hoặc bắt đầu bằng http/https);
// nếu có link nguy hiểm (javascript:, data:...) thì báo lỗi và trả về false.
function validateLinksOrAlert(linksObj) {
    for (const label in linksObj) {
        const value = linksObj[label];
        if (value && !isSafeUrl(value)) {
            showCustomAlert(`Đường dẫn "${escapeHTML(label)}" không hợp lệ! Chỉ chấp nhận link bắt đầu bằng http:// hoặc https://`);
            return false;
        }
    }
    return true;
}

// HÀM ĐỊNH DẠNG THỜI GIAN THỰC
// ==========================================
// CUSTOM DROPDOWN DÙNG CHUNG (thay cho <select> gốc để tránh việc
// danh sách lựa chọn bị đè/chồng hình với nội dung phía dưới)
// ==========================================
function setupCustomDropdown(btnId, panelId, labelId, options, defaultValue, onChange) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    const label = document.getElementById(labelId);
    if (!btn || !panel || !label) return null;
 
    let currentValue = defaultValue || "";
    let currentOptions = options;
 
    function renderOptions() {
        panel.innerHTML = "";
        currentOptions.forEach(opt => {
            const item = document.createElement("div");
            item.className = "dropdown-option" + (opt.value === currentValue ? " active" : "");
            item.textContent = opt.label;
            item.addEventListener("click", () => {
                currentValue = opt.value;
                label.textContent = opt.label;
                closePanel();
                renderOptions();
                if (onChange) onChange(currentValue);
            });
            panel.appendChild(item);
        });
    }
 
    function openPanel() {
        document.querySelectorAll('.dropdown-panel').forEach(p => { if (p !== panel) p.classList.add('hidden'); });
        panel.classList.remove('hidden');
    }
    function closePanel() { panel.classList.add('hidden'); }
 
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.contains('hidden') ? openPanel() : closePanel();
    });
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btn) closePanel();
    });
 
    renderOptions();
 
    return {
        getValue: () => currentValue,
        setOptions: (newOptions, newValue) => {
            currentOptions = newOptions;
            const found = currentOptions.find(o => o.value === (newValue !== undefined ? newValue : currentValue));
            currentValue = found ? found.value : (currentOptions[0] ? currentOptions[0].value : "");
            label.textContent = found ? found.label : (currentOptions[0] ? currentOptions[0].label : "");
            renderOptions();
        }
    };
}
 
let filterClassDropdown = null;
let filterChapterDropdown = null;
 
function initLessonFilters() {
    if (filterClassDropdown) return;
    filterClassDropdown = setupCustomDropdown(
        "filterClassBtn", "filterClassPanel", "filterClassLabel",
        [
            { value: "", label: "Tất Cả Bài Giảng" },
            { value: "tong-on", label: "Phần Tổng Ôn" },
            { value: "10", label: "Lớp 10" },
            { value: "11", label: "Lớp 11" },
            { value: "12", label: "Lớp 12" },
            { value: "casio-hsa", label: "Casio HSA" }
        ],
        "",
        () => loadLessons()
    );
    filterChapterDropdown = setupCustomDropdown(
        "filterChapterBtn", "filterChapterPanel", "filterChapterLabel",
        [{ value: "", label: "Tất cả chương" }],
        "",
        () => loadLessons()
    );
}
initLessonFilters();
 
// ==========================================
// CHẤT LƯỢNG HIỂN THỊ VIDEO
// ==========================================
let currentSharpenLevel = 'off';
window.setSharpenLevel = function(level, btnEl) {
    currentSharpenLevel = level;
    document.querySelectorAll('.sharpen-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const el = document.querySelector('#videoContainer .video-el');
    if (el) {
        el.classList.remove('sharpen-off', 'sharpen-medium', 'sharpen-high');
        el.classList.add(level === 'medium' ? 'sharpen-medium' : level === 'high' ? 'sharpen-high' : 'sharpen-off');
    }
};
 
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Gần đây';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ==========================================
// KHỞI ĐỘNG HỆ THỐNG
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const studentDoc = await db.collection("students").doc(user.uid).get();
            if (!studentDoc.exists) {
                await doLogoutLogic();
                return;
            }
            const data = studentDoc.data();
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userRole", data.role || "student");
            localStorage.setItem("studentName", data.name);
            localStorage.setItem("studentId", user.uid);
            localStorage.setItem("hasVideoAccess", data.hasVideoAccess ? "true" : "false");
            await db.collection("students").doc(user.uid).update({ status: 'online' }).catch(() => {});
            showDashboard();
        } catch (e) {
            console.error("Lỗi tải hồ sơ người dùng:", e);
            showLoginScreen();
        }
    } else {
        localStorage.clear();
        showLoginScreen();
    }
});

function switchTab(tabName) {
    const tabs = ['courses', 'docs', 'studentDocs', 'communityDocs'];
    
    tabs.forEach(t => {
        const cap = t.charAt(0).toUpperCase() + t.slice(1);
        const content = document.getElementById(`tabContent${cap}`);
        const btn = document.getElementById(`tabBtn${cap}`);

        if (content && btn) {
            if (t === tabName) {
                content.classList.remove('hidden');
                btn.className = "btn-bouncy py-3.5 px-3 border-b-2 font-bold text-sm border-red-900 text-red-900 transition flex items-center space-x-2";
            } else {
                content.classList.add('hidden');
                btn.className = "btn-bouncy py-3.5 px-3 border-b-2 font-semibold text-sm border-transparent text-stone-500 hover:text-stone-800 transition flex items-center space-x-2";
            }
        }
    });
}

// ==========================================
// ĐĂNG NHẬP / ĐĂNG KÝ
// ==========================================
let isLoginMode = true;
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('loginForm').classList.toggle('hidden', !isLoginMode);
    document.getElementById('registerForm').classList.toggle('hidden', isLoginMode);
    document.getElementById('authTitle').innerText = isLoginMode ? "HỆ THỐNG ĐĂNG NHẬP" : "ĐĂNG KÝ TÀI KHOẢN";
    document.getElementById('authSubtitle').innerText = isLoginMode ? "Đăng nhập tài khoản để truy cập bài giảng & tài liệu!" : "Tạo tài khoản học sinh mới để tham gia học tập.";
    document.getElementById('btnToggleAuth').innerText = isLoginMode ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Quay lại đăng nhập";
}

// ==========================================
// QUẢN LÝ VÒNG ĐỜI LISTENER: theo dõi tất cả các onSnapshot đang hoạt
// động để hủy sạch mỗi khi chuyển tài khoản / đăng xuất, tránh việc
// listener của tài khoản cũ tiếp tục ghi đè dữ liệu vào phiên mới.
// ==========================================
let activeListeners = [];
function trackListener(unsubscribeFn) {
    activeListeners.push(unsubscribeFn);
    return unsubscribeFn;
}
function clearActiveListeners() {
    activeListeners.forEach(unsub => { try { unsub(); } catch (e) {} });
    activeListeners = [];
}

function showLoginScreen() {
    clearActiveListeners();
    clearInterval(presenceInterval);
    clearInterval(window.__accountsRefreshInterval);
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("appContainer").classList.add("hidden");
}

function showDashboard() {
    clearActiveListeners(); // dọn sạch listener của phiên trước (nếu có) trước khi bắt đầu phiên mới

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    
    const role = localStorage.getItem("userRole");
    const userBadge = document.getElementById("userBadge");
    const adminPanelsCourses = document.getElementById("adminPanelsCourses");
    const adminPanelsDocs = document.getElementById("adminPanelsDocs");
    const adminPanelsStudentDocs = document.getElementById("adminPanelsStudentDocs");

    if (role === "admin") {
        userBadge.innerHTML = '<i class="fa-solid fa-shield-halved mr-1 text-red-900"></i> Admin Quản Trị';
        if (adminPanelsCourses) adminPanelsCourses.classList.remove("hidden");
        if (adminPanelsDocs) adminPanelsDocs.classList.remove("hidden");
        if (adminPanelsStudentDocs) adminPanelsStudentDocs.classList.remove("hidden");
        loadAccountsList();
    } else {
        const studentName = localStorage.getItem("studentName") || "Tài khoản";
        const hasVideoAccess = localStorage.getItem("hasVideoAccess") === "true";
        
        let accessBadge = hasVideoAccess 
            ? `<span class="ml-1.5 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md"><i class="fa-solid fa-check"></i> Đã mở khóa</span>`
            : `<span class="ml-1.5 text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md"><i class="fa-solid fa-lock"></i> Chưa cấp quyền</span>`;
            
        userBadge.innerHTML = `<i class="fa-solid fa-user mr-1 text-red-900"></i> ${escapeHTML(studentName)} ${accessBadge}`;
        
        if (adminPanelsCourses) adminPanelsCourses.classList.add("hidden");
        if (adminPanelsDocs) adminPanelsDocs.classList.add("hidden");
        if (adminPanelsStudentDocs) adminPanelsStudentDocs.classList.add("hidden");
        
        const studentId = localStorage.getItem("studentId");
        if (studentId) {
            trackListener(db.collection("students").doc(studentId).onSnapshot((doc) => {
                if (!doc.exists) {
                    showCustomAlert("Tài khoản của bạn đã bị vô hiệu hóa!");
                    doLogoutLogic();
                } else {
                    const data = doc.data();
                    localStorage.setItem("hasVideoAccess", data.hasVideoAccess ? "true" : "false");
                    if (data.role && data.role !== localStorage.getItem("userRole")) {
                        doLogoutLogic();
                    }
                }
            }));
        }
    }
    // Reset trạng thái xem video/bộ lọc về mặc định cho phiên đăng nhập mới,
    // tránh việc video/lựa chọn lọc của tài khoản trước còn sót lại trên giao diện.
    const videoContainer = document.getElementById("videoContainer");
    if (videoContainer) {
        videoContainer.innerHTML = `
            <div class="text-center text-stone-400 p-6">
                <i class="fa-solid fa-circle-play text-6xl mb-3 text-red-800 opacity-80"></i>
                <p class="font-semibold text-stone-300">Chọn một bài học ở danh sách bên dưới để bắt đầu xem</p>
            </div>`;
    }

    loadLessons();
    loadDocuments();
    loadStudentDocuments();
    loadCommunityDocuments();
    startPresenceHeartbeat();
}

// ==========================================
// PRESENCE: cập nhật "đang online" theo thời gian thực thay vì chỉ
// dựa vào lúc đăng nhập/đăng xuất (không chính xác khi tắt trình
// duyệt đột ngột). Cứ mỗi 20s ghi lại lastActive, phía hiển thị coi
// tài khoản là online nếu lastActive cách đây chưa quá 40s.
// ==========================================
let presenceInterval = null;
function startPresenceHeartbeat() {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) return;
    const beat = () => {
        db.collection("students").doc(studentId).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'online'
        }).catch(() => {});
    };
    beat();
    clearInterval(presenceInterval);
    presenceInterval = setInterval(beat, 20000);

    window.addEventListener("beforeunload", () => {
        // Cố gắng đánh dấu offline ngay khi đóng tab (không đảm bảo 100%,
        // nhưng cơ chế lastActive hết hạn ở trên sẽ tự bù nếu lệnh này không kịp gửi)
        db.collection("students").doc(studentId).update({ status: 'offline' }).catch(() => {});
    });
}

function isAccountOnline(data) {
    if (!data.lastActive || typeof data.lastActive.toDate !== 'function') return false;
    const diffMs = Date.now() - data.lastActive.toDate().getTime();
    return diffMs < 40000; // còn hoạt động trong 40 giây gần nhất
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const user = document.getElementById("regUsername").value.trim().toLowerCase();
    const rawPass = document.getElementById("regPassword").value.trim();
    const btn = document.getElementById("btnRegister");

    if (!/^[a-z0-9_.]{3,}$/.test(user)) {
        showCustomAlert("Tên đăng nhập chỉ được chứa chữ thường, số, dấu chấm hoặc gạch dưới, tối thiểu 3 ký tự!");
        return;
    }
    if (rawPass.length < 6) {
        showCustomAlert("Mật khẩu phải có ít nhất 6 ký tự!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang xử lý...';

    try {
        const checkExist = await db.collection("students").where("username", "==", user).get();
        if (!checkExist.empty) {
            showCustomAlert("Tên đăng nhập này đã tồn tại!");
            return;
        }

        const cred = await auth.createUserWithEmailAndPassword(usernameToEmail(user), rawPass);
        const uid = cred.user.uid;

        await db.collection("students").doc(uid).set({
            name: name,
            username: user,
            role: "student",
            hasVideoAccess: false,
            status: 'offline',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await auth.signOut();
        showCustomAlert("Đăng ký thành công! Vui lòng đăng nhập.");
        document.getElementById("registerForm").reset();
        toggleAuthMode();
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        let msg = "Có lỗi xảy ra trong quá trình đăng ký!";
        if (error.code === "auth/email-already-in-use") msg = "Tên đăng nhập này đã tồn tại!";
        else if (error.code === "auth/weak-password") msg = "Mật khẩu quá yếu, cần ít nhất 6 ký tự!";
        showCustomAlert(msg);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i> Đăng Ký Tài Khoản';
    }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();
    const btn = document.getElementById("btnLogin");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Kiểm tra...';

    try {
        await auth.signInWithEmailAndPassword(usernameToEmail(username), password);
        document.getElementById("loginForm").reset();
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        let msg = "Sai tên đăng nhập hoặc mật khẩu!";
        if (error.code === "auth/too-many-requests") msg = "Bạn đã thử sai quá nhiều lần, vui lòng thử lại sau!";
        else if (error.code === "auth/network-request-failed") msg = "Lỗi kết nối mạng, vui lòng thử lại!";
        showCustomAlert(msg);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i> Đăng Nhập';
    }
});

window.logout = function() {
    showCustomConfirm("Bạn có chắc chắn muốn đăng xuất không?", function() { doLogoutLogic(); });
};

async function doLogoutLogic() {
    clearInterval(presenceInterval);
    const studentId = localStorage.getItem("studentId");
    if (studentId) {
        try { await db.collection("students").doc(studentId).update({ status: 'offline' }); } catch (e) {}
    }
    try { await auth.signOut(); } catch (e) {}
    localStorage.clear();
    showLoginScreen();
}

// ==========================================
// TẢI FILE UP CLOUDINARY
// ==========================================
async function uploadFileToCloudinary(file) {
    if (!file) return null;
    let resourceType = "auto";
    if (file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i)) resourceType = "raw";
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/qlxicqqw/${resourceType}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    let res, data;
    try {
        res = await fetch(uploadUrl, { method: "POST", body: formData });
        data = await res.json();
    } catch (networkError) {
        console.error("Lỗi kết nối tới Cloudinary:", networkError);
        throw new Error("Không kết nối được tới Cloudinary (kiểm tra mạng/CORS).");
    }

    if (!res.ok || data.error) {
        const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
        console.error("Lỗi Upload Cloudinary:", msg, data);
        throw new Error(`Cloudinary: ${msg}`);
    }

    if (!data.secure_url) {
        console.error("Cloudinary không trả về secure_url:", data);
        throw new Error("Cloudinary không trả về đường dẫn file hợp lệ.");
    }

    return data.secure_url;
}

// ==========================================
// MODULE KHÓA HỌC VIDEO
// ==========================================
const lessonForm = document.getElementById("lessonForm");
if (lessonForm) {
    lessonForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("lessonTitle").value.trim();
        const lessonClass = document.getElementById("lessonClass").value;
        const lessonChapter = document.getElementById("lessonChapter").value.trim();
        const videoLink = document.getElementById("lessonVideoLink").value.trim();
        const docLink = document.getElementById("lessonDocLink").value.trim();
        const answerLink = document.getElementById("lessonAnswerLink").value.trim();
        const answerVideoLink = document.getElementById("lessonAnswerVideoLink")?.value.trim() || "";
        const maxDownloads = parseInt(document.getElementById("lessonMaxDownloads")?.value, 10) || 0;

        if (!validateLinksOrAlert({ "Link Video": videoLink, "Link Tài liệu": docLink, "Link Đáp án": answerLink, "Link Video Chữa Bài": answerVideoLink })) return;

        const videoFile = document.getElementById("videoFile").files[0];
        const docFile = document.getElementById("docFile").files[0];
        const hwFile = document.getElementById("hwFile").files[0];
        const answerVideoFile = document.getElementById("answerVideoFile")?.files[0];
        
        const editingId = document.getElementById("editingLessonId").value;
        const btnUpload = document.getElementById("btnUploadLesson");

        if (!title) { showCustomAlert("Vui lòng nhập tên bài học!"); return; }
        btnUpload.disabled = true;

        try {
            const updateData = { 
                title: title, 
                class: lessonClass, 
                chapter: lessonChapter, 
                docLink: docLink, 
                answerLink: answerLink,
                maxDownloads: maxDownloads
            };

            btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Tải file...';
            
            if (videoFile) {
                updateData.videoUrl = await uploadFileToCloudinary(videoFile);
            } else if (videoLink) {
                updateData.videoUrl = videoLink;
            }

            if (answerVideoFile) {
                updateData.answerVideoUrl = await uploadFileToCloudinary(answerVideoFile);
            } else if (answerVideoLink) {
                updateData.answerVideoUrl = answerVideoLink;
            }

            if (docFile) updateData.docFileUrl = await uploadFileToCloudinary(docFile);
            if (hwFile) updateData.hwFileUrl = await uploadFileToCloudinary(hwFile);

            if (!editingId) updateData.downloadCount = 0;

            if (editingId) {
                btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Cập nhật...';
                await db.collection("lessons").doc(editingId).update(updateData);
                showCustomAlert("Cập nhật bài học thành công!");
            } else {
                btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang lưu...';
                updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("lessons").add(updateData);
                showCustomAlert("Phát hành bài học thành công!");
            }
            resetLessonForm();
        } catch (error) {
            console.error("Lỗi lưu bài học:", error);
            showCustomAlert("Lỗi khi tải dữ liệu lên! Chi tiết: " + (error.message || error));
        } finally {
            btnUpload.disabled = false;
        }
    });
}

function loadLessons() {
    const lessonList = document.getElementById("lessonList");
    const filterClass = filterClassDropdown ? filterClassDropdown.getValue() : "";
    const selectedChapter = filterChapterDropdown ? filterChapterDropdown.getValue().toLowerCase() : "";
    
    if (!lessonList) return;
    const role = localStorage.getItem("userRole");

    trackListener(db.collection("lessons").orderBy("createdAt", "asc").onSnapshot((snapshot) => {
        lessonList.innerHTML = "";
        if (snapshot.empty) {
            lessonList.innerHTML = '<p class="text-stone-400 text-xs p-4 text-center">Chưa có bài học nào.</p>';
            updateChapterDropdown(new Set(), "");
            return;
        }

        const uniqueChapters = new Set();
        const groupedByChapter = {};
        const tongOnLessons = [];
        let totalFiltered = 0;

        snapshot.forEach((doc) => {
            const lesson = doc.data();
            const lessonClass = lesson.class ? String(lesson.class) : '10';
            const chapterVal = (lesson.chapter || '').trim();
            const chapterLower = chapterVal.toLowerCase();
            const isTongOn = lessonClass === 'tong-on' || chapterLower.includes('tong-on') || chapterLower.includes('tổng ôn');

            if (filterClass === 'tong-on') {
                if (isTongOn) {
                    tongOnLessons.push({ id: doc.id, ...lesson, class: lessonClass });
                    totalFiltered++;
                }
                return;
            }

            if (filterClass && lessonClass !== filterClass) return;
            if (chapterVal && !isTongOn) uniqueChapters.add(chapterVal);

            if (isTongOn) {
                if (!selectedChapter) {
                    tongOnLessons.push({ id: doc.id, ...lesson, class: lessonClass });
                    totalFiltered++;
                }
                return;
            }

            if (selectedChapter && chapterLower !== selectedChapter) return;

            totalFiltered++;
            const chapterName = chapterVal ? chapterVal.toUpperCase() : "CHƯƠNG CHUNG";
            if (!groupedByChapter[chapterName]) groupedByChapter[chapterName] = [];
            groupedByChapter[chapterName].push({ id: doc.id, ...lesson, class: lessonClass });
        });

        if (totalFiltered === 0) {
            lessonList.innerHTML = '<p class="text-stone-400 text-xs p-6 text-center">Không tìm thấy bài học phù hợp.</p>';
            updateChapterDropdown(uniqueChapters, selectedChapter);
            return;
        }

        if (tongOnLessons.length > 0 && (filterClass === '' || filterClass === 'tong-on') && !selectedChapter) {
            const tongOnHeader = document.createElement("div");
            tongOnHeader.className = "mb-2.5";
            tongOnHeader.innerHTML = `
                <div class="flex items-center space-x-2 bg-gradient-to-r from-amber-800 to-amber-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mb-2.5 shadow-xs">
                    <i class="fa-solid fa-star text-amber-300"></i>
                    <span>PHẦN TỔNG ÔN</span>
                </div>
            `;
            const tongOnContainer = document.createElement("div");
            tongOnContainer.className = "space-y-2 mb-5";
            tongOnLessons.forEach((lesson, idx) => {
                tongOnContainer.appendChild(renderLessonItemDOM(lesson, idx + 1, role));
            });
            tongOnHeader.appendChild(tongOnContainer);
            lessonList.appendChild(tongOnHeader);
        }

        if (filterClass !== 'tong-on') {
            Object.keys(groupedByChapter).sort().forEach((chapter) => {
                const chapterWrapper = document.createElement("div");
                chapterWrapper.className = "mb-5 last:mb-0";
                
                const safeChapterTitle = escapeHTML(chapter);
                chapterWrapper.innerHTML = `
                    <div class="flex items-center space-x-2 bg-stone-800 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mb-2.5 shadow-xs">
                        <i class="fa-solid fa-book-open text-amber-500"></i>
                        <span>${safeChapterTitle}</span>
                    </div>
                `;
                const lessonsContainer = document.createElement("div");
                lessonsContainer.className = "space-y-2";
                
                groupedByChapter[chapter].forEach((lesson, idx) => {
                    lessonsContainer.appendChild(renderLessonItemDOM(lesson, idx + 1, role));
                });
                chapterWrapper.appendChild(lessonsContainer);
                lessonList.appendChild(chapterWrapper);
            });
        }

        updateChapterDropdown(uniqueChapters, selectedChapter);
    }));
}

function updateChapterDropdown(uniqueChapters, currentSelected) {
    if (!filterChapterDropdown) return;
    const options = [{ value: "", label: "Tất cả chương" }];
    Array.from(uniqueChapters).sort().forEach(ch => {
        options.push({ value: ch.toLowerCase(), label: ch });
    });
    filterChapterDropdown.setOptions(options, currentSelected || "");
}

// SỬ DỤNG DOM API AN TOÀN CHO BÀI HỌC
function renderLessonItemDOM(lesson, indexNum, role) {
    const item = document.createElement("div");
    item.className = "flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200/80 hover:border-red-900/40 hover:shadow-sm transition cursor-pointer group";
    item.addEventListener("click", () => playVideo(lesson.videoUrl || ''));

    const leftDiv = document.createElement("div");
    leftDiv.className = "flex items-center space-x-3 flex-1 min-w-0";

    const badgeNum = document.createElement("div");
    badgeNum.className = "w-8 h-8 rounded-xl bg-red-900 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs group-hover:bg-red-950 transition";
    badgeNum.textContent = indexNum;

    const infoDiv = document.createElement("div");
    infoDiv.className = "flex items-center space-x-3 flex-1 min-w-0";

    const titleDiv = document.createElement("div");
    titleDiv.className = "flex-1 min-w-0";

    const pTitle = document.createElement("p");
    pTitle.className = "font-bold text-stone-800 text-xs sm:text-sm truncate group-hover:text-red-900 transition";
    pTitle.textContent = lesson.title || '';

    const metaDiv = document.createElement("div");
    metaDiv.className = "flex items-center space-x-2 mt-1 flex-wrap gap-y-1";

    const classLabelMap = { 'tong-on': 'Tổng Ôn', 'casio-hsa': 'Casio HSA' };
    const isNumericClass = /^\d+$/.test(lesson.class || '');
    const badgeText = classLabelMap[lesson.class] || (isNumericClass ? `Lớp ${lesson.class}` : (lesson.class || 'Lớp 10'));
    const badgeClass = lesson.class === 'tong-on' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-orange-50 text-red-900 border border-orange-200';

    const spanBadge = document.createElement("span");
    spanBadge.className = `text-[9px] ${badgeClass} px-1.5 py-0.5 rounded font-bold`;
    spanBadge.textContent = badgeText;

    const timeCreated = formatTimestamp(lesson.createdAt);
    const spanTime = document.createElement("span");
    spanTime.className = "text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium";
    spanTime.innerHTML = `<i class="fa-regular fa-clock mr-1"></i>${escapeHTML(timeCreated)}`;

    metaDiv.appendChild(spanBadge);
    metaDiv.appendChild(spanTime);

    const finalDocUrl = lesson.docFileUrl || lesson.docLink || lesson.docUrl;
    const maxDl = parseInt(lesson.maxDownloads, 10) || 0;
    const dlCount = parseInt(lesson.downloadCount, 10) || 0;
    const limitReached = maxDl > 0 && dlCount >= maxDl;

    if (finalDocUrl && isSafeUrl(finalDocUrl)) {
        if (limitReached) {
            const spanLimited = document.createElement("span");
            spanLimited.className = "text-[10px] bg-stone-200 text-stone-500 px-2 py-0.5 rounded-md border border-stone-300 font-bold";
            spanLimited.innerHTML = '<i class="fa-solid fa-ban mr-1"></i> Hết lượt tải';
            metaDiv.appendChild(spanLimited);
        } else {
            const aDoc = document.createElement("a");
            aDoc.href = finalDocUrl;
            aDoc.target = "_blank";
            aDoc.className = "btn-bouncy text-[10px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 font-bold";
            aDoc.innerHTML = maxDl > 0
                ? `<i class="fa-solid fa-file-pdf mr-1"></i> Tài liệu (còn ${maxDl - dlCount} lượt)`
                : '<i class="fa-solid fa-file-pdf mr-1"></i> Tài liệu';
            aDoc.addEventListener("click", (e) => {
                e.stopPropagation();
                if (lesson.id) incrementLessonDownload(lesson.id);
            });
            metaDiv.appendChild(aDoc);
        }
    }

    const finalAnswerVideoUrl = lesson.answerVideoUrl;
    if (finalAnswerVideoUrl && isSafeUrl(finalAnswerVideoUrl)) {
        const aAnsVideo = document.createElement("span");
        aAnsVideo.className = "btn-bouncy text-[10px] bg-rose-50 text-rose-900 px-2 py-0.5 rounded-md border border-rose-200 font-bold cursor-pointer";
        aAnsVideo.innerHTML = '<i class="fa-solid fa-chalkboard-user mr-1"></i> Video chữa bài';
        aAnsVideo.addEventListener("click", (e) => {
            e.stopPropagation();
            playVideo(finalAnswerVideoUrl);
        });
        metaDiv.appendChild(aAnsVideo);
    }

    const finalHwUrl = lesson.hwFileUrl || lesson.answerLink;
    if (finalHwUrl && isSafeUrl(finalHwUrl)) {
        const aHw = document.createElement("a");
        aHw.href = finalHwUrl;
        aHw.target = "_blank";
        aHw.className = "btn-bouncy text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 font-bold";
        aHw.innerHTML = '<i class="fa-solid fa-pen-to-square mr-1"></i> Bài tập';
        aHw.addEventListener("click", (e) => e.stopPropagation());
        metaDiv.appendChild(aHw);
    }

    titleDiv.appendChild(pTitle);
    titleDiv.appendChild(metaDiv);
    infoDiv.appendChild(titleDiv);
    leftDiv.appendChild(badgeNum);
    leftDiv.appendChild(infoDiv);
    item.appendChild(leftDiv);

    if (role === "admin") {
        const actionDiv = document.createElement("div");
        actionDiv.className = "flex items-center space-x-1 ml-2";

        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-bouncy text-amber-700 hover:bg-amber-50 p-1.5 rounded-lg transition text-xs";
        btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        btnEdit.addEventListener("click", (e) => {
            e.stopPropagation();
            editLesson(lesson.id, lesson.title || '', lesson.class || '', lesson.chapter || '');
        });

        const btnDel = document.createElement("button");
        btnDel.className = "btn-bouncy text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition text-xs";
        btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnDel.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteLesson(lesson.id);
        });

        actionDiv.appendChild(btnEdit);
        actionDiv.appendChild(btnDel);
        item.appendChild(actionDiv);
    }

    return item;
}

function incrementLessonDownload(lessonId) {
    db.collection("lessons").doc(lessonId).update({
        downloadCount: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});
}
 
window.playVideo = function(url) {
    const container = document.getElementById("videoContainer");
    const role = localStorage.getItem("userRole");
    const hasAccess = localStorage.getItem("hasVideoAccess") === "true";

    if (role !== "admin" && !hasAccess) {
        container.innerHTML = `
            <div class="text-center p-6 flex flex-col items-center justify-center h-full bg-stone-900 text-white rounded-2xl border border-red-900/30">
                <div class="w-16 h-16 bg-red-950/80 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 border border-red-800/50 shadow-lg animate-bounce">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <p class="font-extrabold text-red-400 text-lg sm:text-xl tracking-tight">TÀI KHOẢN CHƯA ĐƯỢC CẤP QUYỀN TRUY CẬP</p>
                <p class="text-xs sm:text-sm text-stone-300 mt-2 max-w-md leading-relaxed">
                    Bạn chưa được cấp quyền xem bài giảng video. Vui lòng liên hệ với Admin để kích hoạt tài khoản của bạn!
                </p>
                <span class="mt-4 inline-flex items-center px-3 py-1 bg-stone-800 border border-stone-700 text-amber-400 text-xs rounded-lg font-medium">
                    <i class="fa-solid fa-circle-info mr-1.5"></i> Bạn vẫn có thể xem & tải tài liệu bình thường.
                </span>
            </div>
        `;
        return;
    }

    if (!url || url === 'null' || url === 'undefined') {
        container.innerHTML = `
            <div class="text-center p-6 flex flex-col items-center justify-center h-full">
                <i class="fa-solid fa-file-lines text-5xl mb-3 text-stone-400"></i>
                <p class="font-medium text-stone-300 text-sm">Bài học này chưa có Video bài giảng.</p>
            </div>
        `;
        return;
    }

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let embedUrl = url;
        if (url.includes("watch?v=")) {
            embedUrl = url.replace("watch?v=", "embed/");
        } else if (url.includes("youtu.be/")) {
            embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
        }
        container.innerHTML = `<iframe class="w-full h-full rounded-2xl video-el sharpen-${currentSharpenLevel}" src="${escapeHTML(embedUrl)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        container.innerHTML = `<video controls autoplay class="w-full h-full object-contain bg-black rounded-2xl video-el sharpen-${currentSharpenLevel}"><source src="${escapeHTML(url)}" type="video/mp4">Trình duyệt không hỗ trợ xem video trực tiếp.</video>`;
    }
};

// Mở khung <details> quản trị đang gập (nếu có) và cuộn tới form khi bấm "Sửa",
// vì sau khi gộp form vào khung gập, form có thể đang ẩn nếu admin chưa bấm mở.
function openAdminDetailsAndScrollTo(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const details = form.closest('details');
    if (details) details.open = true;
    setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

window.editLesson = function(id, title, lessonClass, chapter) {
    document.getElementById("editingLessonId").value = id;
    document.getElementById("lessonTitle").value = title;
    if (lessonClass) document.getElementById("lessonClass").value = lessonClass;
    document.getElementById("lessonChapter").value = chapter || "";
    
    document.getElementById("formTitle").innerHTML = '<i class="fa-solid fa-pen-to-square mr-2 text-amber-800"></i> Cập Nhật Bài Học';
    const btn = document.getElementById("btnUploadLesson");
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Lưu Cập Nhật';
    btn.className = "btn-bouncy flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md shadow-amber-900/20";
    document.getElementById("btnCancelEdit").classList.remove("hidden");
    openAdminDetailsAndScrollTo("lessonForm");
};

window.resetLessonForm = function() {
    document.getElementById("lessonForm").reset();
    document.getElementById("editingLessonId").value = "";
    document.getElementById("formTitle").innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2 text-red-900"></i> Tải Lên Bài Mới';
    const btn = document.getElementById("btnUploadLesson");
    btn.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> Phát Hành';
    btn.className = "btn-bouncy flex-1 bg-red-900 hover:bg-red-950 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md shadow-red-900/20";
    document.getElementById("btnCancelEdit").classList.add("hidden");
};

window.deleteLesson = function(id) {
    showCustomConfirm("Xóa bài học này vĩnh viễn?", async function() {
        await db.collection("lessons").doc(id).delete();
    });
};

// ==========================================
// QUẢN LÝ TÀI KHOẢN (ADMIN)
// ==========================================
window.grantVideoAccess = async function() {
    const username = document.getElementById("grantUsername").value.trim().toLowerCase();
    if (!username) { showCustomAlert("Nhập tên đăng nhập cần cấp quyền!"); return; }
    
    const btn = document.getElementById("btnGrantAccess");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Tìm kiếm...';

    try {
        const snapshot = await db.collection("students").where("username", "==", username).get();
        if (snapshot.empty) {
            showCustomAlert("Không tìm thấy tài khoản học sinh này!");
        } else {
            const docId = snapshot.docs[0].id;
            await db.collection("students").doc(docId).update({ hasVideoAccess: true });
            showCustomAlert(`Đã cấp quyền xem video cho tài khoản [${username}]!`);
            document.getElementById("grantUsername").value = "";
        }
    } catch (e) {
        showCustomAlert("Lỗi hệ thống khi mở khóa!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-circle mr-1"></i> Mở Khóa Tài Khoản';
    }
};

let latestAccountsSnapshot = null;
function loadAccountsList() {
    const container = document.getElementById("accountListContainer");
    if (!container) return;

    trackListener(db.collection("students").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        latestAccountsSnapshot = snapshot;
        renderAccountsList();
    }));

    // Tự vẽ lại định kỳ để chấm online/offline "hết hạn" đúng lúc,
    // kể cả khi không có ghi dữ liệu mới nào xảy ra trong lúc đó.
    clearInterval(window.__accountsRefreshInterval);
    window.__accountsRefreshInterval = setInterval(renderAccountsList, 10000);
}

function renderAccountsList() {
    const container = document.getElementById("accountListContainer");
    const snapshot = latestAccountsSnapshot;
    if (!container || !snapshot) return;

    container.innerHTML = "";
    if (snapshot.empty) {
        container.innerHTML = '<p class="text-xs text-stone-400">Chưa có tài khoản nào.</p>';
        return;
    }

    let studentCount = 0;

    snapshot.forEach((doc) => {
        const acc = doc.data();
        if (acc.role === "admin") return;

        studentCount++;
        const isOnline = isAccountOnline(acc);
        const dotClass = isOnline ? 'status-online' : 'status-offline';

        const accessStatus = acc.hasVideoAccess 
            ? '<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check"></i> Đã cấp quyền</span>' 
            : '<span class="text-amber-800 font-bold"><i class="fa-solid fa-lock"></i> Chưa cấp quyền</span>';

        const item = document.createElement("div");
        item.className = "flex flex-col p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs gap-1.5";
        
        const topRow = document.createElement("div");
        topRow.className = "flex items-center justify-between";
        
        const leftInfo = document.createElement("div");
        leftInfo.className = "flex items-center space-x-1.5";
        
        const spanDot = document.createElement("span");
        spanDot.className = `status-dot ${dotClass}`;
        spanDot.title = isOnline ? "Đang online" : "Offline";
        
        const spanName = document.createElement("span");
        spanName.className = "font-extrabold text-stone-800 text-xs";
        spanName.textContent = acc.name || '';

        const spanStatusText = document.createElement("span");
        spanStatusText.className = isOnline ? "text-[10px] text-emerald-600 font-bold" : "text-[10px] text-stone-400 font-semibold";
        spanStatusText.textContent = isOnline ? "Online" : "Offline";
        
        leftInfo.appendChild(spanDot);
        leftInfo.appendChild(spanName);
        leftInfo.appendChild(spanStatusText);
        
        const rightBtns = document.createElement("div");
        rightBtns.className = "flex items-center space-x-1";
        
        const toggleBtn = document.createElement("button");
        toggleBtn.className = acc.hasVideoAccess 
            ? "btn-bouncy text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded-lg border border-amber-300 transition" 
            : "btn-bouncy text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-2 py-1 rounded-lg border border-emerald-300 transition";
        toggleBtn.innerHTML = acc.hasVideoAccess ? '<i class="fa-solid fa-user-slash mr-1"></i>Thu hồi' : '<i class="fa-solid fa-key mr-1"></i>Cấp quyền';
        toggleBtn.addEventListener("click", () => toggleVideoAccess(doc.id, !acc.hasVideoAccess));
        
        const delAccBtn = document.createElement("button");
        delAccBtn.className = "btn-bouncy text-rose-600 hover:bg-rose-100 p-1 rounded-lg transition";
            delAccBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delAccBtn.addEventListener("click", () => deleteAccount(doc.id));
            
            rightBtns.appendChild(toggleBtn);
            rightBtns.appendChild(delAccBtn);
            
            topRow.appendChild(leftInfo);
            topRow.appendChild(rightBtns);

            const midRow = document.createElement("div");
            midRow.className = "flex items-center justify-between text-[11px] text-stone-600 bg-white p-1.5 rounded-lg border border-stone-200/60";
            midRow.innerHTML = `<span>User: <b class="text-stone-800">${escapeHTML(acc.username)}</b></span><span class="text-stone-400 italic">Mật khẩu được bảo mật</span>`;

            const botRow = document.createElement("div");
            botRow.className = "text-[10px]";
            botRow.innerHTML = `Trạng thái: ${accessStatus}`;

            item.appendChild(topRow);
            item.appendChild(midRow);
            item.appendChild(botRow);
            container.appendChild(item);
    });

    if (studentCount === 0) {
        container.innerHTML = '<p class="text-xs text-stone-400">Chưa có tài khoản học sinh nào.</p>';
    }
}

window.toggleVideoAccess = async function(docId, enable) {
    try {
        await db.collection("students").doc(docId).update({ hasVideoAccess: enable });
        showCustomAlert(enable ? "Đã cấp quyền xem video thành công!" : "Đã thu hồi quyền xem video!");
    } catch(e) {
        showCustomAlert("Cập nhật quyền thất bại!");
    }
};

window.deleteAccount = function(id) {
    showCustomConfirm("Xóa vĩnh viễn tài khoản này?", async function() {
        await db.collection("students").doc(id).delete();
    });
};

// ==========================================
// MODULE KHO TÀI LIỆU CHUNG
// ==========================================
const docManagerForm = document.getElementById("docManagerForm");
if (docManagerForm) {
    docManagerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const category = document.getElementById("docCategory").value;
        const title = document.getElementById("docMainTitle").value.trim();
        const docLink = document.getElementById("docMainLink").value.trim();
        const answerLink = document.getElementById("docAnswerLink").value.trim();
        
        const docFile = document.getElementById("docMainFile").files[0];
        const answerFile = document.getElementById("docAnswerFile").files[0];
        
        const editingId = document.getElementById("editingDocId").value;
        const btnUpload = document.getElementById("btnUploadDocManager");

        if (!title) return;
        if (!validateLinksOrAlert({ "Link Tài liệu": docLink, "Link Đáp án": answerLink })) return;
        btnUpload.disabled = true;

        try {
            const updateData = { title: title, category: category, docLink: docLink, answerLink: answerLink };

            btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Tải file...';
            if (docFile) updateData.docFileUrl = await uploadFileToCloudinary(docFile);
            if (answerFile) updateData.answerFileUrl = await uploadFileToCloudinary(answerFile);

            if (editingId) {
                btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Cập nhật...';
                await db.collection("documents").doc(editingId).update(updateData);
                showCustomAlert("Cập nhật tài liệu thành công!");
            } else {
                btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang lưu...';
                updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("documents").add(updateData);
                showCustomAlert("Tải lên tài liệu thành công!");
            }
            resetDocForm();
        } catch (error) {
            console.error("Lỗi tải lên tài liệu:", error);
            showCustomAlert("Lỗi khi tải lên tài liệu! Chi tiết: " + (error.message || error));
        } finally {
            btnUpload.disabled = false;
        }
    });
}

let docCategoryFilterValue = "";
window.setDocCategoryFilter = function(btnEl, cat) {
    docCategoryFilterValue = cat;
    document.querySelectorAll('#docCategoryFilter .doc-filter-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    loadDocuments();
};

function loadDocuments() {
    const list = document.getElementById("documentList");
    if (!list) return;
    const role = localStorage.getItem("userRole");

    trackListener(db.collection("documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";

        const searchText = (document.getElementById("docSearchInput")?.value || "").trim().toLowerCase();
        const filteredDocs = snapshot.docs.filter((doc) => {
            const data = doc.data();
            if (docCategoryFilterValue && data.category !== docCategoryFilterValue) return false;
            if (searchText && !(data.title || "").toLowerCase().includes(searchText)) return false;
            return true;
        });

        if (filteredDocs.length === 0) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Không tìm thấy tài liệu phù hợp.</p>';
            return;
        }

        const bgColors = {
            'THPT': 'bg-amber-100 text-amber-900',
            'DGNL': 'bg-orange-100 text-orange-900',
            'DGTD': 'bg-rose-100 text-rose-900'
        };

        filteredDocs.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";

            const topDiv = document.createElement("div");
            topDiv.className = "mb-3";
            
            const catSpan = document.createElement("span");
            catSpan.className = `px-2.5 py-0.5 ${bgColors[data.category] || 'bg-stone-100 text-stone-700'} text-[10px] rounded-md font-extrabold mb-2 inline-block`;
            catSpan.textContent = data.category || '';
            
            const titleP = document.createElement("p");
            titleP.className = "font-bold text-stone-800 text-xs sm:text-sm leading-snug";
            titleP.textContent = data.title || '';
            
            topDiv.appendChild(catSpan);
            topDiv.appendChild(titleP);

            const botDiv = document.createElement("div");
            
            const finalDocUrl = data.docFileUrl || data.docLink || data.fileUrl;
            if (finalDocUrl && isSafeUrl(finalDocUrl)) {
                const aDoc = document.createElement("a");
                aDoc.href = finalDocUrl;
                aDoc.target = "_blank";
                aDoc.className = "btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-amber-50 text-amber-900 px-3 py-2 rounded-xl hover:bg-amber-100 transition mb-2 border border-amber-200";
                aDoc.innerHTML = '<i class="fa-solid fa-download mr-1.5"></i> Tải Tài Liệu / Đề Bài';
                botDiv.appendChild(aDoc);
            }

            const finalAnswerUrl = data.answerFileUrl || data.answerLink;
            if (finalAnswerUrl && isSafeUrl(finalAnswerUrl)) {
                const aAns = document.createElement("a");
                aAns.href = finalAnswerUrl;
                aAns.target = "_blank";
                aAns.className = "btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-rose-50 text-rose-900 px-3 py-2 rounded-xl hover:bg-rose-100 transition border border-rose-200";
                aAns.innerHTML = '<i class="fa-solid fa-check-double mr-1.5"></i> Tải Đáp Án Chi Tiết';
                botDiv.appendChild(aAns);
            }

            if (role === "admin") {
                const adminDiv = document.createElement("div");
                adminDiv.className = "mt-3 pt-2 border-t border-stone-100 flex space-x-3";
                
                const btnEdit = document.createElement("button");
                btnEdit.className = "btn-bouncy text-xs text-amber-800 font-bold hover:underline";
                btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Sửa';
                btnEdit.addEventListener("click", () => editDoc(id, data.title || '', data.category || ''));

                const btnDel = document.createElement("button");
                btnDel.className = "btn-bouncy text-xs text-rose-600 font-bold hover:underline";
                btnDel.innerHTML = '<i class="fa-solid fa-trash"></i> Xóa';
                btnDel.addEventListener("click", () => deleteDoc(id));

                adminDiv.appendChild(btnEdit);
                adminDiv.appendChild(btnDel);
                botDiv.appendChild(adminDiv);
            }

            item.appendChild(topDiv);
            item.appendChild(botDiv);
            list.appendChild(item);
        });
    }));
}

window.editDoc = function(id, title, category) {
    document.getElementById("editingDocId").value = id;
    document.getElementById("docMainTitle").value = title;
    document.getElementById("docCategory").value = category;
    
    document.getElementById("formDocTitle").innerHTML = '<i class="fa-solid fa-pen text-amber-800 mr-2"></i> Chỉnh Sửa Tài Liệu';
    const btn = document.getElementById("btnUploadDocManager");
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Lưu Cập Nhật';
    document.getElementById("btnCancelEditDoc").classList.remove("hidden");
    switchTab('docs');
    openAdminDetailsAndScrollTo("docManagerForm");
};

window.resetDocForm = function() {
    document.getElementById("docManagerForm").reset();
    document.getElementById("editingDocId").value = "";
    document.getElementById("formDocTitle").innerHTML = '<i class="fa-solid fa-file-arrow-up text-red-900 mr-2"></i> Đăng Tài Liệu Mới';
    document.getElementById("btnUploadDocManager").innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Lưu & Đăng Bài';
    document.getElementById("btnCancelEditDoc").classList.add("hidden");
};

window.deleteDoc = function(id) {
    showCustomConfirm("Xóa tài liệu này khỏi kho?", async function() {
        await db.collection("documents").doc(id).delete();
    });
};

// ==========================================
// TÍNH NĂNG: TÀI LIỆU SINH VIÊN
// ==========================================
const studentDocForm = document.getElementById("studentDocForm");
if (studentDocForm) {
    studentDocForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const category = document.getElementById("studentDocCategory").value;
        const title = document.getElementById("studentDocTitle").value.trim();
        const docLink = document.getElementById("studentDocLink").value.trim();
        const docFile = document.getElementById("studentDocFile").files[0];
        
        const editingId = document.getElementById("editingStudentDocId").value;
        const btnUpload = document.getElementById("btnUploadStudentDoc");

        if (!title) return;
        if (!validateLinksOrAlert({ "Link Tài liệu": docLink })) return;
        btnUpload.disabled = true;

        try {
            const updateData = { title: title, category: category, docLink: docLink };

            btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tải...';
            if (docFile) updateData.docFileUrl = await uploadFileToCloudinary(docFile);

            if (editingId) {
                await db.collection("student_documents").doc(editingId).update(updateData);
                showCustomAlert("Cập nhật tài liệu sinh viên thành công!");
            } else {
                updateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("student_documents").add(updateData);
                showCustomAlert("Thêm tài liệu sinh viên thành công!");
            }
            resetStudentDocForm();
        } catch (error) {
            console.error("Lỗi tải lên tài liệu sinh viên:", error);
            showCustomAlert("Lỗi khi tải lên tài liệu sinh viên! Chi tiết: " + (error.message || error));
        } finally {
            btnUpload.disabled = false;
        }
    });
}

let studentDocCategoryFilterValue = "";
window.setStudentDocCategoryFilter = function(btnEl, cat) {
    studentDocCategoryFilterValue = cat;
    document.querySelectorAll('#studentDocCategoryFilter .doc-filter-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    loadStudentDocuments();
};

function loadStudentDocuments() {
    const list = document.getElementById("studentDocList");
    if (!list) return;
    const role = localStorage.getItem("userRole");

    trackListener(db.collection("student_documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";

        const searchText = (document.getElementById("studentDocSearchInput")?.value || "").trim().toLowerCase();
        const filteredDocs = snapshot.docs.filter((doc) => {
            const data = doc.data();
            if (studentDocCategoryFilterValue && data.category !== studentDocCategoryFilterValue) return false;
            if (searchText && !(data.title || "").toLowerCase().includes(searchText)) return false;
            return true;
        });

        if (filteredDocs.length === 0) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Không tìm thấy tài liệu phù hợp.</p>';
            return;
        }

        const bgColors = {
            'Giáo Trình': 'bg-blue-100 text-blue-900',
            'Đề Thi HK': 'bg-emerald-100 text-emerald-900',
            'Bài Tập Lớn': 'bg-purple-100 text-purple-900',
            'Chuyên Ngành': 'bg-orange-100 text-orange-900'
        };

        filteredDocs.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";

            const topDiv = document.createElement("div");
            topDiv.className = "mb-3";
            
            const catSpan = document.createElement("span");
            catSpan.className = `px-2.5 py-0.5 ${bgColors[data.category] || 'bg-stone-100 text-stone-700'} text-[10px] rounded-md font-extrabold mb-2 inline-block`;
            catSpan.textContent = data.category || '';
            
            const titleP = document.createElement("p");
            titleP.className = "font-bold text-stone-800 text-xs sm:text-sm leading-snug";
            titleP.textContent = data.title || '';
            
            topDiv.appendChild(catSpan);
            topDiv.appendChild(titleP);

            const botDiv = document.createElement("div");
            const finalUrl = data.docFileUrl || data.docLink;

            if (finalUrl && isSafeUrl(finalUrl)) {
                const aLink = document.createElement("a");
                aLink.href = finalUrl;
                aLink.target = "_blank";
                aLink.className = "btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-blue-50 text-blue-900 px-3 py-2 rounded-xl hover:bg-blue-100 transition border border-blue-200";
                aLink.innerHTML = '<i class="fa-solid fa-download mr-1.5"></i> Xem / Tải Tài Liệu Sinh Viên';
                botDiv.appendChild(aLink);
            } else {
                const spanNone = document.createElement("span");
                spanNone.className = "text-xs text-stone-400";
                spanNone.textContent = "Không có tệp đính kèm";
                botDiv.appendChild(spanNone);
            }

            if (role === "admin") {
                const adminDiv = document.createElement("div");
                adminDiv.className = "mt-3 pt-2 border-t border-stone-100 flex space-x-3";
                
                const btnEdit = document.createElement("button");
                btnEdit.className = "btn-bouncy text-xs text-amber-800 font-bold hover:underline";
                btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i> Sửa';
                btnEdit.addEventListener("click", () => editStudentDoc(id, data.title || '', data.category || ''));

                const btnDel = document.createElement("button");
                btnDel.className = "btn-bouncy text-xs text-rose-600 font-bold hover:underline";
                btnDel.innerHTML = '<i class="fa-solid fa-trash"></i> Xóa';
                btnDel.addEventListener("click", () => deleteStudentDoc(id));

                adminDiv.appendChild(btnEdit);
                adminDiv.appendChild(btnDel);
                botDiv.appendChild(adminDiv);
            }

            item.appendChild(topDiv);
            item.appendChild(botDiv);
            list.appendChild(item);
        });
    }));
}

window.editStudentDoc = function(id, title, category) {
    document.getElementById("editingStudentDocId").value = id;
    document.getElementById("studentDocTitle").value = title;
    document.getElementById("studentDocCategory").value = category;
    
    document.getElementById("formStudentDocTitle").innerHTML = '<i class="fa-solid fa-pen text-amber-800 mr-2"></i> Chỉnh Sửa Tài Liệu Sinh Viên';
    const btn = document.getElementById("btnUploadStudentDoc");
    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Lưu Cập Nhật';
    document.getElementById("btnCancelEditStudentDoc").classList.remove("hidden");
    switchTab('studentDocs');
    openAdminDetailsAndScrollTo("studentDocForm");
};

window.resetStudentDocForm = function() {
    document.getElementById("studentDocForm").reset();
    document.getElementById("editingStudentDocId").value = "";
    document.getElementById("formStudentDocTitle").innerHTML = '<i class="fa-solid fa-file-circle-plus text-red-900 mr-2"></i> Đăng Tài Liệu Sinh Viên';
    document.getElementById("btnUploadStudentDoc").innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Đăng Tài Liệu';
    document.getElementById("btnCancelEditStudentDoc").classList.add("hidden");
};

window.deleteStudentDoc = function(id) {
    showCustomConfirm("Xóa tài liệu sinh viên này?", async function() {
        await db.collection("student_documents").doc(id).delete();
    });
};

// ==========================================
// TÍNH NĂNG: TÀI LIỆU ĐÓNG GÓP CHUNG
// ==========================================
const communityUploadForm = document.getElementById("communityUploadForm");
if (communityUploadForm) {
    communityUploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subject = document.getElementById("communitySubject").value.trim();
        const title = document.getElementById("communityTitle").value.trim();
        const link = document.getElementById("communityLink").value.trim();
        const file = document.getElementById("communityFile").files[0];
        const btn = document.getElementById("btnUploadCommunityDoc");

        if (!title || !subject) {
            showCustomAlert("Vui lòng điền đầy đủ tiêu đề và môn học!");
            return;
        }
        if (!validateLinksOrAlert({ "Link tài liệu": link })) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang đăng lên...';

        try {
            let fileUrl = null;
            if (file) {
                fileUrl = await uploadFileToCloudinary(file);
            }

            const studentName = localStorage.getItem("studentName") || "Học sinh";
            const studentId = localStorage.getItem("studentId");
            const role = localStorage.getItem("userRole") || "student";

            await db.collection("community_documents").add({
                title: title,
                subject: subject,
                fileUrl: fileUrl || link,
                uploaderName: role === "admin" ? "Admin: ManhDucPham" : studentName,
                uploaderId: studentId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showCustomAlert("Cảm ơn bạn đã đóng góp tài liệu lên cộng đồng!");
            communityUploadForm.reset();
        } catch (error) {
            console.error("Lỗi tải tài liệu đóng góp:", error);
            showCustomAlert("Lỗi khi tải tài liệu đóng góp lên! Chi tiết: " + (error.message || error));
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-share-nodes mr-1.5"></i> Đăng Tải Lên Cộng Đồng';
        }
    });
}

function loadCommunityDocuments() {
    const list = document.getElementById("communityDocList");
    if (!list) return;

    const currentRole = localStorage.getItem("userRole");
    const currentUserId = localStorage.getItem("studentId");

    trackListener(db.collection("community_documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";

        const searchText = (document.getElementById("communityDocSearchInput")?.value || "").trim().toLowerCase();
        const filteredDocs = snapshot.docs.filter((doc) => {
            const data = doc.data();
            if (!searchText) return true;
            const haystack = `${data.title || ''} ${data.subject || ''}`.toLowerCase();
            return haystack.includes(searchText);
        });

        if (filteredDocs.length === 0) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Không tìm thấy tài liệu phù hợp.</p>';
            return;
        }

        filteredDocs.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const finalUrl = data.fileUrl;

            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";

            const topDiv = document.createElement("div");
            topDiv.className = "mb-3";
            
            const subWrapper = document.createElement("div");
            subWrapper.className = "flex justify-between items-center mb-1";
            
            const subSpan = document.createElement("span");
            subSpan.className = "px-2.5 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] rounded-md font-extrabold inline-block";
            subSpan.textContent = data.subject || '';
            subWrapper.appendChild(subSpan);

            const titleP = document.createElement("p");
            titleP.className = "font-bold text-stone-800 text-xs sm:text-sm leading-snug";
            titleP.textContent = data.title || '';

            const uploaderP = document.createElement("p");
            uploaderP.className = "text-[10px] text-stone-400 mt-2";
            uploaderP.innerHTML = `<i class="fa-solid fa-user text-stone-400 mr-1"></i>Người đăng: <strong class="text-stone-600">${escapeHTML(data.uploaderName || 'Thành viên')}</strong>`;

            topDiv.appendChild(subWrapper);
            topDiv.appendChild(titleP);
            topDiv.appendChild(uploaderP);

            const botDiv = document.createElement("div");
            if (finalUrl && isSafeUrl(finalUrl)) {
                const aLink = document.createElement("a");
                aLink.href = finalUrl;
                aLink.target = "_blank";
                aLink.className = "btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-emerald-50 text-emerald-900 px-3 py-2 rounded-xl hover:bg-emerald-100 transition border border-emerald-200";
                aLink.innerHTML = '<i class="fa-solid fa-download mr-1.5"></i> Tải Tài Liệu Đóng Góp';
                botDiv.appendChild(aLink);
            } else {
                const spanNone = document.createElement("span");
                spanNone.className = "text-xs text-stone-400";
                spanNone.textContent = "Không có liên kết tải";
                botDiv.appendChild(spanNone);
            }

            if (currentRole === "admin" || (currentUserId && currentUserId === data.uploaderId)) {
                const delBtn = document.createElement("button");
                delBtn.className = "btn-bouncy text-xs text-rose-600 font-bold hover:underline mt-2 inline-block";
                delBtn.innerHTML = '<i class="fa-solid fa-trash mr-1"></i> Xóa chia sẻ';
                delBtn.addEventListener("click", () => deleteCommunityDoc(id));
                botDiv.appendChild(delBtn);
            }

            item.appendChild(topDiv);
            item.appendChild(botDiv);
            list.appendChild(item);
        });
    }));
}

window.deleteCommunityDoc = function(id) {
    showCustomConfirm("Xóa bài đóng góp này?", async function() {
        await db.collection("community_documents").doc(id).delete();
    });
};

// ==========================================
// CUSTOM ALERT & CONFIRM MODAL
// ==========================================
function showCustomConfirm(message, onYes) {
    const modal = document.getElementById('custom-confirm');
    document.getElementById('confirm-text').innerText = message;
    modal.classList.remove('hidden'); 
    modal.classList.add('flex');

    document.getElementById('confirm-yes').style.display = 'inline-block';
    document.getElementById('confirm-no').style.display = 'inline-block';
    
    document.getElementById('confirm-yes').onclick = function() { 
        modal.classList.add('hidden'); 
        modal.classList.remove('flex'); 
        onYes(); 
    };
    document.getElementById('confirm-no').onclick = function() { 
        modal.classList.add('hidden'); 
        modal.classList.remove('flex'); 
    };
}

function showCustomAlert(message) {
    const modal = document.getElementById('custom-confirm');
    document.getElementById('confirm-text').innerText = message;
    modal.classList.remove('hidden'); 
    modal.classList.add('flex');

    document.getElementById('confirm-yes').style.display = 'inline-block';
    document.getElementById('confirm-no').style.display = 'none';
    
    document.getElementById('confirm-yes').onclick = function() { 
        modal.classList.add('hidden'); 
        modal.classList.remove('flex'); 
    };
}
