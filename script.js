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

// TÊN MIỀN GIẢ DÙNG ĐỂ CHUYỂN "username" THÀNH EMAIL CHO FIREBASE AUTH
// (Firebase Authentication yêu cầu định danh dạng email)
const AUTH_EMAIL_DOMAIN = "@eduvault.local";
function usernameToEmail(username) {
    return username + AUTH_EMAIL_DOMAIN;
}

// HÀM ĐỊNH DẠNG THỜI GIAN THỰC
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
// Dùng trạng thái đăng nhập thật từ Firebase Auth làm nguồn xác thực duy nhất
// (an toàn hơn nhiều so với chỉ tin vào localStorage, vốn có thể bị người dùng tự sửa)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const studentDoc = await db.collection("students").doc(user.uid).get();
            if (!studentDoc.exists) {
                // Có tài khoản Auth nhưng không có hồ sơ tương ứng -> đăng xuất cho an toàn
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

function showLoginScreen() {
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("appContainer").classList.add("hidden");
}

function showDashboard() {
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
            
        userBadge.innerHTML = `<i class="fa-solid fa-user mr-1 text-red-900"></i> ${studentName} ${accessBadge}`;
        
        if (adminPanelsCourses) adminPanelsCourses.classList.add("hidden");
        if (adminPanelsDocs) adminPanelsDocs.classList.add("hidden");
        if (adminPanelsStudentDocs) adminPanelsStudentDocs.classList.add("hidden");
        
        const studentId = localStorage.getItem("studentId");
        if (studentId) {
            db.collection("students").doc(studentId).onSnapshot((doc) => {
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
            });
        }
    }
    loadLessons();
    loadDocuments();
    loadStudentDocuments();
    loadCommunityDocuments();
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

        // Tạo tài khoản thật trên Firebase Authentication (mật khẩu được Firebase
        // mã hóa/bảo mật phía máy chủ, không lưu dạng có thể đọc lại được nữa)
        const cred = await auth.createUserWithEmailAndPassword(usernameToEmail(user), rawPass);
        const uid = cred.user.uid;

        // Hồ sơ học sinh lưu tại students/{uid} — id trùng với Firebase Auth uid
        await db.collection("students").doc(uid).set({
            name: name,
            username: user,
            role: "student",
            hasVideoAccess: false,
            status: 'offline',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await auth.signOut(); // đăng ký xong không tự động đăng nhập, để quay lại màn hình đăng nhập

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
        // onAuthStateChanged (đăng ký ở trên) sẽ lo phần còn lại: đọc hồ sơ,
        // set localStorage và gọi showDashboard() khi đăng nhập thành công.
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
        // Lỗi mạng / CORS / không kết nối được tới Cloudinary
        console.error("Lỗi kết nối tới Cloudinary:", networkError);
        throw new Error("Không kết nối được tới Cloudinary (kiểm tra mạng/CORS).");
    }

    // Cloudinary trả về lỗi rõ ràng trong data.error khi request thất bại
    // (vd: sai upload_preset, preset chưa Unsigned, file vượt quá giới hạn dung lượng...)
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
        
        const videoFile = document.getElementById("videoFile").files[0];
        const docFile = document.getElementById("docFile").files[0];
        const hwFile = document.getElementById("hwFile").files[0];
        
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
                answerLink: answerLink 
            };

            btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Tải file...';
            
            // Xử lý ưu tiên Link Video hoặc Upload Video File
            if (videoFile) {
                updateData.videoUrl = await uploadFileToCloudinary(videoFile);
            } else if (videoLink) {
                updateData.videoUrl = videoLink;
            }

            if (docFile) updateData.docFileUrl = await uploadFileToCloudinary(docFile);
            if (hwFile) updateData.hwFileUrl = await uploadFileToCloudinary(hwFile);

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

function extractLessonNumber(title) {
    const match = title.match(/bài\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 9999;
}

function loadLessons() {
    const lessonList = document.getElementById("lessonList");
    const filterClass = document.getElementById("filterClass")?.value || "";
    const filterChapterElem = document.getElementById("filterChapter");
    const selectedChapter = filterChapterElem ? filterChapterElem.value.toLowerCase() : "";
    
    if (!lessonList) return;
    const role = localStorage.getItem("userRole");

    // Sắp xếp bài giảng theo thời gian thực (tạo gần đây lên trước hoặc theo thứ tự)
    db.collection("lessons").orderBy("createdAt", "asc").onSnapshot((snapshot) => {
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

        let htmlContent = '';

        if (tongOnLessons.length > 0 && (filterClass === '' || filterClass === 'tong-on') && !selectedChapter) {
            htmlContent += `
                <div class="mb-5">
                    <div class="flex items-center space-x-2 bg-gradient-to-r from-amber-800 to-amber-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mb-2.5 shadow-xs">
                        <i class="fa-solid fa-star text-amber-300"></i>
                        <span>PHẦN TỔNG ÔN TẬP</span>
                    </div>
                    <div class="space-y-2">
            `;
            tongOnLessons.forEach((lesson, idx) => {
                htmlContent += renderLessonItem(lesson, idx + 1, role);
            });
            htmlContent += `</div></div>`;
        }

        if (filterClass !== 'tong-on') {
            Object.keys(groupedByChapter).sort().forEach((chapter) => {
                htmlContent += `
                    <div class="mb-5 last:mb-0">
                        <div class="flex items-center space-x-2 bg-stone-800 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mb-2.5 shadow-xs">
                            <i class="fa-solid fa-book-open text-amber-500"></i>
                            <span>${chapter}</span>
                        </div>
                        <div class="space-y-2">
                `;
                groupedByChapter[chapter].forEach((lesson, idx) => {
                    htmlContent += renderLessonItem(lesson, idx + 1, role);
                });
                htmlContent += `</div></div>`;
            });
        }

        lessonList.innerHTML = htmlContent;
        updateChapterDropdown(uniqueChapters, selectedChapter);
    });
}

function updateChapterDropdown(uniqueChapters, currentSelected) {
    const dropdown = document.getElementById("filterChapter");
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">Tất cả chương</option>';
    Array.from(uniqueChapters).sort().forEach(ch => {
        const option = document.createElement("option");
        option.value = ch.toLowerCase();
        option.textContent = ch;
        if (option.value === currentSelected) option.selected = true;
        dropdown.appendChild(option);
    });
}

function renderLessonItem(lesson, indexNum, role) {
    let actionBtns = "";
    if (role === "admin") {
        const safeTitle = lesson.title.replace(/'/g, "\\'");
        const safeChapter = (lesson.chapter || '').replace(/'/g, "\\'");
        actionBtns = `
            <div class="flex items-center space-x-1 ml-2">
                <button onclick="editLesson('${lesson.id}', '${safeTitle}', '${lesson.class || ''}', '${safeChapter}')" class="btn-bouncy text-amber-700 hover:bg-amber-50 p-1.5 rounded-lg transition text-xs"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteLesson('${lesson.id}')" class="btn-bouncy text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition text-xs"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    const finalDocUrl = lesson.docFileUrl || lesson.docLink || lesson.docUrl;
    const finalHwUrl = lesson.hwFileUrl || lesson.answerLink;

    const docHtml = finalDocUrl ? `<a href="${finalDocUrl}" target="_blank" class="btn-bouncy text-[10px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 font-bold" onclick="event.stopPropagation()"><i class="fa-solid fa-file-pdf mr-1"></i> Tài liệu</a>` : '';
    const hwHtml = finalHwUrl ? `<a href="${finalHwUrl}" target="_blank" class="btn-bouncy text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 font-bold" onclick="event.stopPropagation()"><i class="fa-solid fa-pen-to-square mr-1"></i> Bài tập</a>` : '';
    
    const isTongOnClass = lesson.class === 'tong-on';
    const badgeText = isTongOnClass ? 'Tổng Ôn' : `Lớp ${lesson.class || '10'}`;
    const badgeStyle = isTongOnClass ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-orange-50 text-red-900 border border-orange-200';
    
    // Hiển thị ngày đăng thời gian thực
    const timeCreated = formatTimestamp(lesson.createdAt);

    return `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200/80 hover:border-red-900/40 hover:shadow-sm transition cursor-pointer group" onclick="playVideo('${lesson.videoUrl || ''}')">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-red-900 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs group-hover:bg-red-950 transition">
                    ${indexNum}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-stone-800 text-xs sm:text-sm truncate group-hover:text-red-900 transition">${lesson.title}</p>
                    <div class="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                        <span class="text-[9px] ${badgeStyle} px-1.5 py-0.5 rounded font-bold">${badgeText}</span>
                        <span class="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium"><i class="fa-regular fa-clock mr-1"></i>${timeCreated}</span>
                        ${docHtml}
                        ${hwHtml}
                    </div>
                </div>
            </div>
            ${actionBtns}
        </div>
    `;
}

window.playVideo = function(url) {
    const container = document.getElementById("videoContainer");
    const role = localStorage.getItem("userRole");
    const hasAccess = localStorage.getItem("hasVideoAccess") === "true";

    // Kiểm tra quyền hạn của tài khoản
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

    // Tự động nhận diện nhúng Youtube hoặc Video thông thường
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let embedUrl = url;
        if (url.includes("watch?v=")) {
            embedUrl = url.replace("watch?v=", "embed/");
        } else if (url.includes("youtu.be/")) {
            embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
        }
        container.innerHTML = `<iframe class="w-full h-full rounded-2xl" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        container.innerHTML = `<video controls autoplay class="w-full h-full object-contain bg-black rounded-2xl"><source src="${url}" type="video/mp4">Trình duyệt không hỗ trợ xem video trực tiếp.</video>`;
    }
};

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

// ĐÃ SỬA LỖI: Lọc bỏ tài khoản Admin, hiện Mật Khẩu & Nút Thu Hồi Quyền
function loadAccountsList() {
    const container = document.getElementById("accountListContainer");
    if (!container) return;

    db.collection("students").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-xs text-stone-400">Chưa có tài khoản nào.</p>';
            return;
        }

        let studentCount = 0;

        snapshot.forEach((doc) => {
            const acc = doc.data();

            // LỌC KHÔNG HIỂN THỊ TÀI KHOẢN ADMIN VÀO DANH SÁCH TÀI KHOẢN CẤP QUYỀN
            if (acc.role === "admin") return;

            studentCount++;
            const isOnline = acc.status === 'online';
            const dotClass = isOnline ? 'status-online' : 'status-offline';

            const accessStatus = acc.hasVideoAccess 
                ? '<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check"></i> Đã cấp quyền</span>' 
                : '<span class="text-amber-800 font-bold"><i class="fa-solid fa-lock"></i> Chưa cấp quyền</span>';

            const toggleAccessBtn = acc.hasVideoAccess
                ? `<button onclick="toggleVideoAccess('${doc.id}', false)" title="Thu hồi quyền" class="btn-bouncy text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded-lg border border-amber-300 transition"><i class="fa-solid fa-user-slash mr-1"></i>Thu hồi</button>`
                : `<button onclick="toggleVideoAccess('${doc.id}', true)" title="Cấp quyền xem" class="btn-bouncy text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-2 py-1 rounded-lg border border-emerald-300 transition"><i class="fa-solid fa-key mr-1"></i>Cấp quyền</button>`;

            const item = document.createElement("div");
            item.className = "flex flex-col p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs gap-1.5";
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-1.5">
                        <span class="status-dot ${dotClass}"></span>
                        <span class="font-extrabold text-stone-800 text-xs">${acc.name}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                        ${toggleAccessBtn}
                        <button onclick="deleteAccount('${doc.id}')" title="Xóa tài khoản" class="btn-bouncy text-rose-600 hover:bg-rose-100 p-1 rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-stone-600 bg-white p-1.5 rounded-lg border border-stone-200/60">
                    <span>User: <b class="text-stone-800">${acc.username}</b></span>
                    <span class="text-stone-400 italic">Mật khẩu được Firebase bảo mật, admin không xem được</span>
                </div>
                <div class="text-[10px]">Trạng thái: ${accessStatus}</div>
            `;
            container.appendChild(item);
        });

        if (studentCount === 0) {
            container.innerHTML = '<p class="text-xs text-stone-400">Chưa có tài khoản học sinh nào.</p>';
        }
    });
}

// BỔ SUNG: Thu hồi hoặc cấp quyền nhanh
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

function loadDocuments() {
    const list = document.getElementById("documentList");
    if (!list) return;
    const role = localStorage.getItem("userRole");

    db.collection("documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Chưa có tài liệu nào trong kho.</p>';
            return;
        }

        const bgColors = {
            'THPT': 'bg-amber-100 text-amber-900',
            'DGNL': 'bg-orange-100 text-orange-900',
            'DGTD': 'bg-rose-100 text-rose-900'
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            let adminBtns = "";
            if (role === "admin") {
                const safeTitle = data.title.replace(/'/g, "\\'");
                adminBtns = `
                    <div class="mt-3 pt-2 border-t border-stone-100 flex space-x-3">
                        <button onclick="editDoc('${id}', '${safeTitle}', '${data.category}')" class="btn-bouncy text-xs text-amber-800 font-bold hover:underline"><i class="fa-solid fa-pen"></i> Sửa</button>
                        <button onclick="deleteDoc('${id}')" class="btn-bouncy text-xs text-rose-600 font-bold hover:underline"><i class="fa-solid fa-trash"></i> Xóa</button>
                    </div>
                `;
            }

            const finalDocUrl = data.docFileUrl || data.docLink || data.fileUrl;
            const finalAnswerUrl = data.answerFileUrl || data.answerLink;

            let linksHtml = '';
            if (finalDocUrl) {
                linksHtml += `<a href="${finalDocUrl}" target="_blank" class="btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-amber-50 text-amber-900 px-3 py-2 rounded-xl hover:bg-amber-100 transition mb-2 border border-amber-200">
                    <i class="fa-solid fa-download mr-1.5"></i> Tải Tài Liệu / Đề Bài
                </a>`;
            }
            if (finalAnswerUrl) {
                linksHtml += `<a href="${finalAnswerUrl}" target="_blank" class="btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-rose-50 text-rose-900 px-3 py-2 rounded-xl hover:bg-rose-100 transition border border-rose-200">
                    <i class="fa-solid fa-check-double mr-1.5"></i> Tải Đáp Án Chi Tiết
                </a>`;
            }

            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";
            item.innerHTML = `
                <div class="mb-3">
                    <span class="px-2.5 py-0.5 ${bgColors[data.category] || 'bg-stone-100 text-stone-700'} text-[10px] rounded-md font-extrabold mb-2 inline-block">${data.category}</span>
                    <p class="font-bold text-stone-800 text-xs sm:text-sm leading-snug">${data.title}</p>
                </div>
                <div>
                    ${linksHtml}
                    ${adminBtns}
                </div>
            `;
            list.appendChild(item);
        });
    });
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

function loadStudentDocuments() {
    const list = document.getElementById("studentDocList");
    if (!list) return;
    const role = localStorage.getItem("userRole");

    db.collection("student_documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Chưa có tài liệu sinh viên nào.</p>';
            return;
        }

        const bgColors = {
            'Giáo Trình': 'bg-blue-100 text-blue-900',
            'Đề Thi HK': 'bg-emerald-100 text-emerald-900',
            'Bài Tập Lớn': 'bg-purple-100 text-purple-900',
            'Chuyên Ngành': 'bg-orange-100 text-orange-900'
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            let adminBtns = "";
            if (role === "admin") {
                const safeTitle = data.title.replace(/'/g, "\\'");
                adminBtns = `
                    <div class="mt-3 pt-2 border-t border-stone-100 flex space-x-3">
                        <button onclick="editStudentDoc('${id}', '${safeTitle}', '${data.category}')" class="btn-bouncy text-xs text-amber-800 font-bold hover:underline"><i class="fa-solid fa-pen"></i> Sửa</button>
                        <button onclick="deleteStudentDoc('${id}')" class="btn-bouncy text-xs text-rose-600 font-bold hover:underline"><i class="fa-solid fa-trash"></i> Xóa</button>
                    </div>
                `;
            }

            const finalUrl = data.docFileUrl || data.docLink;

            let downloadBtnHtml = finalUrl 
                ? `<a href="${finalUrl}" target="_blank" class="btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-blue-50 text-blue-900 px-3 py-2 rounded-xl hover:bg-blue-100 transition border border-blue-200">
                    <i class="fa-solid fa-download mr-1.5"></i> Xem / Tải Tài Liệu Sinh Viên
                   </a>`
                : `<span class="text-xs text-stone-400">Không có tệp đính kèm</span>`;

            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";
            item.innerHTML = `
                <div class="mb-3">
                    <span class="px-2.5 py-0.5 ${bgColors[data.category] || 'bg-stone-100 text-stone-700'} text-[10px] rounded-md font-extrabold mb-2 inline-block">${data.category}</span>
                    <p class="font-bold text-stone-800 text-xs sm:text-sm leading-snug">${data.title}</p>
                </div>
                <div>
                    ${downloadBtnHtml}
                    ${adminBtns}
                </div>
            `;
            list.appendChild(item);
        });
    });
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

    db.collection("community_documents").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-xs text-stone-400 col-span-2 text-center py-6">Chưa có tài liệu đóng góp nào. Hãy là người đầu tiên chia sẻ!</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            const finalUrl = data.fileUrl;

            let deleteBtn = "";
            if (currentRole === "admin" || (currentUserId && currentUserId === data.uploaderId)) {
                deleteBtn = `<button onclick="deleteCommunityDoc('${id}')" class="btn-bouncy text-xs text-rose-600 font-bold hover:underline mt-2 inline-block"><i class="fa-solid fa-trash mr-1"></i> Xóa chia sẻ</button>`;
            }

            let downloadBtn = finalUrl 
                ? `<a href="${finalUrl}" target="_blank" class="btn-bouncy flex items-center justify-center w-full text-xs font-bold bg-emerald-50 text-emerald-900 px-3 py-2 rounded-xl hover:bg-emerald-100 transition border border-emerald-200">
                    <i class="fa-solid fa-download mr-1.5"></i> Tải Tài Liệu Đóng Góp
                   </a>`
                : `<span class="text-xs text-stone-400">Không có liên kết tải</span>`;

            const item = document.createElement("div");
            item.className = "p-4 rounded-2xl flex flex-col justify-between border border-stone-200/80 bg-white shadow-xs";
            item.innerHTML = `
                <div class="mb-3">
                    <div class="flex justify-between items-center mb-1">
                        <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] rounded-md font-extrabold inline-block">${data.subject}</span>
                    </div>
                    <p class="font-bold text-stone-800 text-xs sm:text-sm leading-snug">${data.title}</p>
                    <p class="text-[10px] text-stone-400 mt-2"><i class="fa-solid fa-user text-stone-400 mr-1"></i>Người đăng: <strong class="text-stone-600">${data.uploaderName || 'Thành viên'}</strong></p>
                </div>
                <div>
                    ${downloadBtn}
                    ${deleteBtn}
                </div>
            `;
            list.appendChild(item);
        });
    });
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