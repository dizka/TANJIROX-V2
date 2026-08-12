let defaultUsers = [
    { username: 'luxz', email: 'luxz@ryuichi.com', password: 'sachi', role: 'dev', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() },
    { username: 'dizka', email: 'dev2@ryuichi.com', password: 'dizka13', role: 'admin', avatar: '', isOnline: false, lastActive: 0, expiry: 'permanent', createdAt: Date.now() }
];

let savedUsers = JSON.parse(localStorage.getItem('ryuichi_users'));
let usersDatabase = savedUsers ? savedUsers : defaultUsers;

let defaultGlobalChats = [
    { id: 1, sender: 'luxz', role: 'dev', type: 'text', content: 'Halo semua! Selamat datang di Global Public Chat Ryuichi App.', timestamp: Date.now() - 90000 }
];
let savedGlobalChats = JSON.parse(localStorage.getItem('ryuichi_global_chats'));
let globalChatDatabase = savedGlobalChats ? savedGlobalChats : defaultGlobalChats;

let roleRequestsDatabase = JSON.parse(localStorage.getItem('ryuichi_role_requests')) || [];

let currentCustomBg = localStorage.getItem('ryuichi_custom_bg') || '';
let currentAuthBg = localStorage.getItem('ryuichi_auth_bg') || '';
let currentCustomVideo = localStorage.getItem('ryuichi_custom_video') || 'https://files.catbox.moe/5ahr4x.mp4';

function applyStoredCustomizations() {
    if (currentCustomBg) document.body.style.backgroundImage = `url('${currentCustomBg}')`;
    const authContainer = document.getElementById('authGateway');
    if (authContainer && currentAuthBg) authContainer.style.backgroundImage = `url('${currentAuthBg}')`;
    const vid = document.getElementById('dashboardVideo');
    if (vid) vid.src = currentCustomVideo;
}
applyStoredCustomizations();

let isLoginMode = false;
let currentUser = null;

const featureMinRole = {
    'jkt48_music': 'member', 'random_anime': 'member', 'claude': 'member', 'gemini': 'member', 'kodepos': 'member', 'tiktok': 'member', 'pinterest': 'member',
    'jkt48_video': 'vip', 'waifu': 'vip', 'grok': 'vip', 'txt2img': 'vip', 'gpt': 'vip', 'kimi': 'vip', 'nikparse': 'vip', 'instagram': 'vip', 'youtube': 'vip', 'fakewa': 'vip', 'quotenokia': 'vip',
    'fakecall': 'vvip', 'fakedev': 'vvip', 'fakewafat': 'vvip', 'fakektp': 'vvip',
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
    if (getRoleLevel(currentUser.role) >= getRoleLevel(requiredRole)) {
        openFeaturePage(featureKey);
    } else {
        alert(`⚠️ Akses Ditolak! Fitur ini khusus untuk level ${requiredRole.toUpperCase()} atau di atasnya.`);
    }
}

function updateFeatureCardsUI() {
    if (!currentUser) return;
    const userLevel = getRoleLevel(currentUser.role);
    for (let key in featureMinRole) {
        const reqLevel = getRoleLevel(featureMinRole[key]);
        const cardEl = document.getElementById(`card_${key}`);
        if (cardEl) {
            const existingBadge = cardEl.querySelector('.lock-badge');
            if (existingBadge) existingBadge.remove();
            if (userLevel < reqLevel) {
                cardEl.classList.add('locked');
                const badge = document.createElement('div');
                badge.className = 'lock-badge';
                badge.innerHTML = `<i class="fa-solid fa-lock"></i> ${featureMinRole[key].toUpperCase()}`;
                cardEl.appendChild(badge);
            } else {
                cardEl.classList.remove('locked');
            }
        }
    }
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
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
    const msg = document.getElementById('authMessage');

    // Perbarui referensi database terbaru dari localStorage setiap kali proses submit
    let currentDB = JSON.parse(localStorage.getItem('ryuichi_users')) || usersDatabase;

    if (isLoginMode) {
        const foundUser = currentDB.find(u => u.username === username && u.password === password);
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
        if (currentDB.some(u => u.username === username)) {
            msg.innerText = 'Username sudah terdaftar!';
            msg.className = 'auth-msg error';
            msg.style.display = 'block';
            return;
        }
        const newUser = { 
            username, email, password, 
            role: document.getElementById('authRole').value, 
            avatar: '', isOnline: false, lastActive: 0, 
            expiry: document.getElementById('authExpiry').value, 
            createdAt: Date.now() 
        };
        
        currentDB.push(newUser);
        usersDatabase = currentDB;
        localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
        
        msg.innerText = 'Registrasi berhasil! Silakan login.';
        msg.className = 'auth-msg success';
        msg.style.display = 'block';
        setTimeout(() => { toggleAuthMode(null); msg.style.display = 'none'; }, 800);
    }
}

function updateAvatarUI() {
    if (!currentUser) return;
    const userAvatarBox = document.getElementById('userAvatarBox');
    const drawerAvatar = document.getElementById('drawerAvatar');
    if (currentUser.avatar) {
        userAvatarBox.innerHTML = `<img src="${currentUser.avatar}">`;
        drawerAvatar.innerHTML = `<img src="${currentUser.avatar}">`;
    } else {
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        userAvatarBox.innerHTML = `<span>${initials}</span>`;
        drawerAvatar.innerHTML = initials;
    }
}

function startSession(user) {
    currentUser = user;
    currentUser.isOnline = true;
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));

    document.getElementById('authGateway').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'flex';
    document.getElementById('mainNav').style.display = 'flex';
    document.getElementById('notifDot').style.display = 'block';
    document.getElementById('floatingReplaceBtn').style.display = 'flex';

    document.getElementById('headerUsername').innerText = user.username;
    document.getElementById('profileName').innerText = user.username;
    document.getElementById('profileEmail').innerText = user.email || 'Akses Sistem';
    document.getElementById('drawerUsername').innerText = user.username;
    document.getElementById('drawerEmail').innerText = user.email || 'Akses Sistem';

    updateAvatarUI();
    const badge = document.getElementById('profileRoleBadge');
    badge.innerText = user.role.toUpperCase();
    badge.className = `role-badge ${user.role}`;
    document.getElementById('drawerRoleBadge').innerText = user.role.toUpperCase();
    document.getElementById('drawerRoleBadge').className = `role-badge ${user.role}`;

    document.getElementById('menuDevCustomizer').style.display = (user.role === 'dev') ? 'flex' : 'none';
    
    if (user.role === 'admin' || user.role === 'dev') {
        document.getElementById('adminMenuSection').style.display = 'block';
        document.getElementById('navDatabaseBtn').style.display = 'flex';
        renderDatabaseTable();
    } else {
        document.getElementById('adminMenuSection').style.display = 'none';
        document.getElementById('navDatabaseBtn').style.display = 'none';
    }

    updateFeatureCardsUI();
    document.getElementById('dashboardVideo').play().catch(() => {});
}

function renderDatabaseTable() {
    const tbody = document.getElementById('databaseTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let currentDB = JSON.parse(localStorage.getItem('ryuichi_users')) || usersDatabase;

    currentDB.forEach((u, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.avatar ? `<img src="${u.avatar}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">` : '👤'}</td>
            <td><b>${u.username}</b><br><small style="color:#a1a1aa">${u.email || '-'}</small></td>
            <td><span class="role-badge ${u.role}" style="font-size:9px;padding:2px 6px;">${u.role.toUpperCase()}</span></td>
            <td>${u.expiry}</td>
            <td>${u.isOnline ? '<span style="color:#10b981">Online</span>' : '<span style="color:#ef4444">Offline</span>'}</td>
            <td>
                <select onchange="changeUserRole(${index}, this.value)" style="background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:6px;padding:4px;font-size:11px;">
                    <option value="member" ${u.role==='member'?'selected':''}>Member</option>
                    <option value="vip" ${u.role==='vip'?'selected':''}>VIP</option>
                    <option value="vvip" ${u.role==='vvip'?'selected':''}>VVIP</option>
                    <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                    <option value="dev" ${u.role==='dev'?'selected':''}>Dev</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function changeUserRole(index, newRole) {
    let currentDB = JSON.parse(localStorage.getItem('ryuichi_users')) || usersDatabase;
    currentDB[index].role = newRole;
    usersDatabase = currentDB;
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
    renderDatabaseTable();
    alert('Role pengguna berhasil diubah!');
}

function toggleDrawer(e) {
    const overlay = document.getElementById('drawerOverlay');
    if (!e || e.target === overlay || !overlay.classList.contains('active')) {
        overlay.classList.toggle('active');
    }
}

function switchView(viewName) {
    ['viewHome', 'viewDatabase', 'viewFeaturePage', 'viewNotifikasi'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    if (viewName === 'home') document.getElementById('viewHome').classList.add('active');
    else if (viewName === 'database') {
        document.getElementById('viewDatabase').classList.add('active');
        renderDatabaseTable();
    }
    else if (viewName === 'notifikasi') { document.getElementById('viewNotifikasi').classList.add('active'); }
    else if (viewName === 'feature') document.getElementById('viewFeaturePage').classList.add('active');
}

function logoutSession() {
    currentUser = null;
    document.getElementById('authGateway').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
    document.getElementById('mainNav').style.display = 'none';
    document.getElementById('floatingReplaceBtn').style.display = 'none';
    document.getElementById('drawerOverlay').classList.remove('active');
}

function executePageReplace() { location.reload(); }

const featuresDatabase = {
    'global_chat': { title: 'GLOBAL PUBLIC CHAT', type: 'global_chat_page' },
    'setelan': { title: 'SETELAN & FOTO PROFIL', type: 'setelan_page' },
    'info_akun': { title: 'INFORMASI AKUN', type: 'custom_page', render: () => `<p>Username: ${currentUser.username}</p>` }
};

function openFeaturePage(featureKey) {
    const feat = featuresDatabase[featureKey];
    if (!feat) return;
    switchView('feature');
    document.getElementById('featureHeaderTitle').innerText = feat.title;
    const body = document.getElementById('featurePageBody');
    body.innerHTML = '';
    if (feat.type === 'setelan_page') {
        body.innerHTML = `<input type="text" id="inputAvatarUrl" class="input-field" placeholder="URL Foto Profil" value="${currentUser.avatar || ''}">
                          <button class="liquid-btn light" onclick="saveAvatarFromUrl()">Simpan Foto</button>`;
    } else if (feat.type === 'global_chat_page') {
        body.innerHTML = `<div class="global-chat-container"></div>
                          <input type="text" id="globalChatInput" class="input-field" placeholder="Ketik pesan..." onkeypress="if(event.key==='Enter') sendTextChat()">`;
    } else if (feat.type === 'custom_page') {
        body.innerHTML = feat.render();
    }
}

function saveAvatarFromUrl() {
    const url = document.getElementById('inputAvatarUrl').value.trim();
    if (!url) return;
    currentUser.avatar = url;
    localStorage.setItem('ryuichi_users', JSON.stringify(usersDatabase));
    updateAvatarUI();
    alert('Foto profil diperbarui!');
    switchView('home');
}

function sendTextChat() {
    const input = document.getElementById('globalChatInput');
    if (!input.value.trim()) return;
    globalChatDatabase.push({ sender: currentUser.username, role: currentUser.role, content: input.value.trim(), timestamp: Date.now() });
    localStorage.setItem('ryuichi_global_chats', JSON.stringify(globalChatDatabase));
    input.value = '';
    openFeaturePage('global_chat');
}
