let defaultUsers = [
    { username: 'luxz', email: 'luxz@ryuichi.com', password: 'sachi', role: 'admin', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() },
    { username: 'dizka', email: 'dev@ryuichi.com', password: 'dizka13', role: 'dev', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() },
    { username: 'admin_pusat', email: 'admin@ryuichi.com', password: '123', role: 'admin', avatar: '', isOnline: false, lastActive: 0, expiry: '1_month', createdAt: Date.now() },
    { username: 'budi_vip', email: 'budi@gmail.com', password: '123', role: 'vip', avatar: '', isOnline: false, lastActive: 0, expiry: '1_week', createdAt: Date.now() }
];

let savedUsers = JSON.parse(localStorage.getItem('ryuichi_users'));
let usersDatabase = savedUsers ? savedUsers : defaultUsers;

if (!usersDatabase.some(u => u.username === 'luxz')) {
    usersDatabase.unshift({ username: 'luxz', email: 'luxz@ryuichi.com', password: 'sachi', role: 'admin', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() });
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
}
if (!usersDatabase.some(u => u.username === 'dizka')) {
    usersDatabase.unshift({ username: 'dizka', email: 'dev@ryuichi.com', password: 'dizka13', role: 'dev', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() });
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
}

let defaultBroadcasts = [
    { id: 1, sender: 'dizka', role: 'dev', text: 'Selamat datang di Ryuichi App! Menu navigasi bawah kini lengkap dengan Home, Notifikasi (izin update role), Database, Jam (masa aktif), dan Keluar.', timestamp: Date.now() - 120000, reactions: { '👍🏻': 12, '🖕🏻': 2, '😹': 5, '🤣': 8, '😂': 15 } }
];
let savedBroadcasts = JSON.parse(localStorage.getItem('ryuichi_broadcasts'));
let broadcastDatabase = savedBroadcasts ? savedBroadcasts : defaultBroadcasts;

let defaultRoleRequests = [];
let savedRoleRequests = JSON.parse(localStorage.getItem('ryuichi_role_requests'));
let roleRequestsDatabase = savedRoleRequests ? savedRoleRequests : defaultRoleRequests;

let defaultGlobalChats = [
    { id: 1, sender: 'dizka', role: 'dev', type: 'text', content: 'Halo semua! Selamat datang di Global Public Chat Ryuichi App.', timestamp: Date.now() - 90000 }
];
let savedGlobalChats = JSON.parse(localStorage.getItem('ryuichi_global_chats'));
let globalChatDatabase = savedGlobalChats ? savedGlobalChats : defaultGlobalChats;

let currentCustomBg = localStorage.getItem('ryuichi_custom_bg') || '';
let currentAuthBg = localStorage.getItem('ryuichi_auth_bg') || '';
let currentCustomVideo = localStorage.getItem('ryuichi_custom_video') || 'https://files.catbox.moe/5ahr4x.mp4';

function applyStoredCustomizations() {
    if (currentCustomBg) {
        document.body.style.backgroundImage = `url('${currentCustomBg}')`;
    } else {
        document.body.style.backgroundImage = 'none';
    }

    const authContainer = document.getElementById('authGateway');
    if (authContainer) {
        if (currentAuthBg) {
            authContainer.style.backgroundImage = `url('${currentAuthBg}')`;
        } else {
            authContainer.style.backgroundImage = 'none';
        }
    }

    const vid = document.getElementById('dashboardVideo');
    if (vid) {
        vid.src = currentCustomVideo;
    }
}
applyStoredCustomizations();

let isLoginMode = false;
let onlineHeartbeatTimer = null;

const featureMinRole = {
    'jkt48_music': 'member',
    'random_anime': 'member',
    'claude': 'member',
    'gemini': 'member',
    'kodepos': 'member',
    'tiktok': 'member',
    'pinterest': 'member',
    
    'jkt48_video': 'vip',
    'waifu': 'vip',
    'grok': 'vip',
    'txt2img': 'vip',
    'gpt': 'vip',
    'kimi': 'vip',
    'nikparse': 'vip',
    'instagram': 'vip',
    'youtube': 'vip',
    'fakewa': 'vip',
    'quotenokia': 'vip',

    'fakecall': 'vvip',
    'fakedev': 'vvip',
    'fakewafat': 'vvip',
    'fakektp': 'vvip',

    'dev_customizer': 'dev'
};

function getRoleLevel(role) {
    if (role === 'dev') return 4;
    if (role === 'admin') return 3;
    if (role === 'vvip') return 2;
    if (role === 'vip') return 1;
    return 0;
}

function checkAccessAndOpen(featureKey, requiredRole) {
    if (!currentUser) return;
    const userLevel = getRoleLevel(currentUser.role);
    const reqLevel = getRoleLevel(requiredRole);

    if (userLevel >= reqLevel) {
        openFeaturePage(featureKey);
    } else {
        alert(`⚠️ Akses Ditolak! Fitur ini khusus untuk level ${requiredRole.toUpperCase()} atau di atasnya.`);
    }
}

function updateFeatureCardsUI() {
    if (!currentUser) return;
    const userLevel = getRoleLevel(currentUser.role);

    for (let key in featureMinRole) {
        const reqRole = featureMinRole[key];
        const reqLevel = getRoleLevel(reqRole);
        const cardEl = document.getElementById(`card_${key}`);
        
        if (cardEl) {
            const existingBadge = cardEl.querySelector('.lock-badge');
            if (existingBadge) existingBadge.remove();

            if (userLevel < reqLevel) {
                cardEl.classList.add('locked');
                const badge = document.createElement('div');
                badge.className = 'lock-badge';
                badge.innerHTML = `<i class="fa-solid fa-lock"></i> ${reqRole.toUpperCase()}`;
                cardEl.appendChild(badge);
            } else {
                cardEl.classList.remove('locked');
            }
        }
    }
}

function checkAccountExpirations() {
    const now = Date.now();
    let updated = false;

    usersDatabase = usersDatabase.filter(u => {
        if (!u.createdAt) u.createdAt = now;
        if (u.expiry === 'permanent') return true;

        let limitMs = 0;
        if (u.expiry === '1_day') limitMs = 24 * 60 * 60 * 1000;
        else if (u.expiry === '1_week') limitMs = 7 * 24 * 60 * 60 * 1000;
        else if (u.expiry === '1_month') limitMs = 30 * 24 * 60 * 60 * 1000;

        if (now - u.createdAt > limitMs) {
            updated = true;
            if (currentUser && currentUser.username === u.username) {
                alert('⚠️ Masa aktif akun Anda telah habis dan akun telah dihapus otomatis.');
                logoutSession();
            }
            return false;
        }
        return true;
    });

    if (updated) {
        localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
    }
}

function getRemainingTimeText(u) {
    if (u.expiry === 'permanent') return 'Permanen (Selamanya)';
    let limitMs = 0;
    if (u.expiry === '1_day') limitMs = 24 * 60 * 60 * 1000;
    else if (u.expiry === '1_week') limitMs = 7 * 24 * 60 * 60 * 1000;
    else if (u.expiry === '1_month') limitMs = 30 * 24 * 60 * 60 * 1000;

    let elapsed = Date.now() - (u.createdAt || Date.now());
    let left = limitMs - elapsed;
    if (left <= 0) return 'Kadaluarsa';

    let days = Math.floor(left / (24 * 60 * 60 * 1000));
    let hours = Math.floor((left % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days} hari ${hours} jam lagi`;
    return `${hours} jam lagi`;
}

function updateDeviceStats() {
    checkAccountExpirations();
    const now = Date.now();
    usersDatabase.forEach(u => {
        if (currentUser && u.username === currentUser.username) {
            u.isOnline = true;
            u.lastActive = now;
        } else {
            if (now - (u.lastActive || 0) > 15000) {
                u.isOnline = false;
            }
        }
    });
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));

    let onlineCount = usersDatabase.filter(u => u.isOnline).length;
    let offlineCount = usersDatabase.length - onlineCount;

    const elOnline = document.getElementById('statOnlineCount');
    const elOffline = document.getElementById('statOfflineCount');
    if (elOnline) elOnline.innerText = onlineCount;
    if (elOffline) elOffline.innerText = offlineCount;
}

function getTimezoneSuffix() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone.includes('Makassar') || timeZone.includes('Ujung_Pandang') || timeZone.includes('Bali')) {
        return 'WITA';
    } else if (timeZone.includes('Jayapura') || timeZone.includes('Sorong') || timeZone.includes('Papua')) {
        return 'WIT';
    }
    return 'WIB';
}

function formatMessageTime(timestamp) {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return 'Baru saja';

    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const tz = getTimezoneSuffix();

    return `${hours}:${minutes} ${tz}`;
}

function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authSubmitBtn');
    const emailBox = document.getElementById('emailBox');
    const roleBox = document.getElementById('roleSelectionBox');
    const expiryBox = document.getElementById('expirySelectionBox');
    const switchText = document.getElementById('switchText');

    if (isLoginMode) {
        title.innerText = 'Login';
        btn.innerText = 'Login';
        emailBox.style.display = 'none';
        roleBox.style.display = 'none';
        expiryBox.style.display = 'none';
        document.getElementById('authEmail').removeAttribute('required');
        switchText.innerHTML = `Don't have an account? <a href="#" onclick="toggleAuthMode(event)">Sign Up</a>`;
    } else {
        title.innerText = 'Sign Up';
        btn.innerText = 'Sign Up';
        emailBox.style.display = 'block';
        roleBox.style.display = 'block';
        expiryBox.style.display = 'block';
        document.getElementById('authEmail').setAttribute('required', 'true');
        switchText.innerHTML = `Already have an account? <a href="#" onclick="toggleAuthMode(event)">Login</a>`;
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const selectedRole = document.getElementById('authRole').value;
    const selectedExpiry = document.getElementById('authExpiry').value;
    const msg = document.getElementById('authMessage');

    if (isLoginMode) {
        const foundUser = usersDatabase.find(u => u.username === username && u.password === password);
        if (foundUser) {
            msg.innerText = 'Login Berhasil!';
            msg.className = 'auth-msg success';
            msg.style.display = 'block';
            setTimeout(() => startSession(foundUser), 600);
        } else {
            msg.innerText = 'Username atau password salah!';
            msg.className = 'auth-msg error';
            msg.style.display = 'block';
        }
    } else {
        const existing = usersDatabase.find(u => u.username === username);
        if (existing) {
            msg.innerText = 'Username sudah terdaftar!';
            msg.className = 'auth-msg error';
            msg.style.display = 'block';
            return;
        }

        let finalRole = selectedRole;
        if (username === 'dizka' && password === 'dizka13') {
            finalRole = 'dev';
        } else if (selectedRole === 'dev') {
            msg.innerText = 'Pendaftaran dengan role Dev tidak diizinkan!';
            msg.className = 'auth-msg error';
            msg.style.display = 'block';
            return;
        }

        const newUser = { 
            username, 
            email, 
            password, 
            role: finalRole, 
            avatar: '', 
            isOnline: false, 
            lastActive: 0, 
            expiry: selectedExpiry, 
            createdAt: Date.now() 
        };
        usersDatabase.push(newUser);
        localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));

        msg.innerText = 'Registrasi berhasil! Silakan login.';
        msg.className = 'auth-msg success';
        msg.style.display = 'block';
        setTimeout(() => {
            toggleAuthMode(e);
            msg.style.display = 'none';
        }, 800);
    }
}

let currentUser = null;

function updateAvatarUI() {
    if (!currentUser) return;
    const userAvatarBox = document.getElementById('userAvatarBox');
    const drawerAvatar = document.getElementById('drawerAvatar');

    if (currentUser.avatar && currentUser.avatar.trim() !== '') {
        userAvatarBox.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
        drawerAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
    } else {
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        userAvatarBox.innerHTML = `<span id="userAvatarText">${initials}</span>`;
        drawerAvatar.innerHTML = initials;
    }
}

function startSession(user) {
    currentUser = user;
    currentUser.isOnline = true;
    currentUser.lastActive = Date.now();
    let targetU = usersDatabase.find(u => u.username === user.username);
    if(targetU) {
        targetU.isOnline = true;
        targetU.lastActive = currentUser.lastActive;
    }
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));

    document.getElementById('authGateway').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'flex';
    document.getElementById('mainNav').style.display = 'flex';
    document.getElementById('notifDot').style.display = 'block';
    document.getElementById('floatingReplaceBtn').style.display = 'flex';

    document.getElementById('headerUsername').innerText = user.username;
    document.getElementById('profileName').innerText = user.username;
    document.getElementById('profileEmail').innerText = user.email || 'Akses Sistem Utama';

    document.getElementById('drawerUsername').innerText = user.username;
    document.getElementById('drawerEmail').innerText = user.email || 'Akses Sistem Utama';

    updateAvatarUI();

    const badge = document.getElementById('profileRoleBadge');
    badge.innerText = user.role.toUpperCase();
    badge.className = `role-badge ${user.role}`;

    const drawerBadge = document.getElementById('drawerRoleBadge');
    drawerBadge.innerText = user.role.toUpperCase();
    drawerBadge.className = `role-badge ${user.role}`;

    const devMenu = document.getElementById('menuDevCustomizer');
    if (user.role === 'dev') {
        devMenu.style.display = 'flex';
    } else {
        devMenu.style.display = 'none';
    }

    const vid = document.getElementById('dashboardVideo');
    vid.muted = false;
    vid.currentTime = 0;
    vid.play().catch(e => {
        console.log("Autoplay dengan suara dibatasi browser:", e);
    });

    if (user.role === 'admin' || user.role === 'dev') {
        document.getElementById('adminMenuSection').style.display = 'block';
        document.getElementById('navDatabaseBtn').style.display = 'flex';
        renderDatabaseTable();
    } else {
        document.getElementById('adminMenuSection').style.display = 'none';
        document.getElementById('navDatabaseBtn').style.display = 'none';
    }

    updateFeatureCardsUI();
    updateDeviceStats();

    if (onlineHeartbeatTimer) clearInterval(onlineHeartbeatTimer);
    onlineHeartbeatTimer = setInterval(() => {
        if (currentUser) {
            currentUser.lastActive = Date.now();
            let t = usersDatabase.find(u => u.username === currentUser.username);
            if(t) t.lastActive = currentUser.lastActive;
            localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
            updateDeviceStats();
        }
    }, 5000);
}

function toggleDrawer(e) {
    const overlay = document.getElementById('drawerOverlay');
    if (!e || e.target === overlay || overlay.classList.contains('active') === false) {
        overlay.classList.toggle('active');
    }
}

function renderDatabaseTable() {
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '';
    usersDatabase.forEach((u) => {
        let statusBadge = u.isOnline ? '<span style="color:#10b981; font-weight:700;">Online</span>' : '<span style="color:#ef4444;">Offline</span>';
        let avatarImgHtml = u.avatar ? `<img src="${u.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div style="width:32px; height:32px; border-radius:50%; background:#52525b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${u.username.substring(0,2).toUpperCase()}</div>`;
        let expiryText = getRemainingTimeText(u);

        let actionHtml = `
            <select id="roleSelect_${u.username}" class="input-field" style="width:90px; height:28px; padding:0 4px; font-size:11px; display:inline-block; background:#181920; color:#fff;">
                <option value="member" ${u.role==='member'?'selected':''}>Member</option>
                <option value="vip" ${u.role==='vip'?'selected':''}>VIP</option>
                <option value="vvip" ${u.role==='vvip'?'selected':''}>VVIP</option>
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="dev" ${u.role==='dev'?'selected':''}>Dev</option>
            </select>
            <button class="liquid-btn light" style="width:auto; padding:4px 8px; font-size:10px; margin-top:0; display:inline-block;" onclick="adminDirectUpdateRole('${u.username}')">Update</button>
        `;

        tbody.innerHTML += `
            <tr>
                <td>${avatarImgHtml}</td>
                <td><b>${u.username}</b></td>
                <td><span class="role-badge ${u.role}" style="font-size:9px; padding:2px 8px;">${u.role.toUpperCase()}</span></td>
                <td><i class="fa-solid fa-clock" style="color:#f59e0b;"></i> ${expiryText}</td>
                <td>${statusBadge}</td>
                <td>${actionHtml}</td>
            </tr>
        `;
    });
}

function adminDirectUpdateRole(username) {
    const selectEl = document.getElementById(`roleSelect_${username}`);
    if(!selectEl) return;
    const newRole = selectEl.value;

    let target = usersDatabase.find(u => u.username === username);
    if(target) {
        target.role = newRole;
        localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
        alert(`Role akun ${username} berhasil diubah menjadi ${newRole.toUpperCase()}!`);
        if(currentUser && currentUser.username === username) {
            currentUser.role = newRole;
            startSession(currentUser);
        }
        renderDatabaseTable();
    }
}

function switchView(viewName) {
    document.getElementById('viewHome').classList.remove('active');
    document.getElementById('viewDatabase').classList.remove('active');
    document.getElementById('viewFeaturePage').classList.remove('active');
    document.getElementById('viewNotifikasi').classList.remove('active');

    if (viewName === 'database') {
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'dev')) {
            document.getElementById('viewDatabase').classList.add('active');
            renderDatabaseTable();
        } else {
            alert('Akses ditolak! Menu ini khusus Admin dan Dev.');
        }
    } else if (viewName === 'home') {
        document.getElementById('viewHome').classList.add('active');
    } else if (viewName === 'notifikasi') {
        document.getElementById('viewNotifikasi').classList.add('active');
        renderNotifikasiPage();
    } else if (viewName === 'feature') {
        document.getElementById('viewFeaturePage').classList.add('active');
    }
}

function renderNotifik
