// ===== 初始化数据與存儲 =====
const STORAGE_KEYS = {
    members: 'tripApp_members',
    luggage: 'tripApp_luggage',
    reviews: 'tripApp_reviews',
    checkins: 'tripApp_checkins',
    reminders: 'tripApp_reminders',
    exchangeRate: 'tripApp_exchangeRate',
    darkMode: 'tripApp_darkMode'
};

// 默認行李清單
const DEFAULT_LUGGAGE = [
    '護照', '臺灣身份證', '機票/電子機票',
    '行李箱/背包', '輕便衣物', '舒適運動鞋',
    '充電器/行動電源', '轉接頭', '防曬霜/曬後修復',
    '常用藥品', '現金/信用卡', '手機SIM卡/eSIM'
];

// 默認成員清單
const DEFAULT_MEMBERS = [
    { name: 'WU CHIEH JUI', passport: '護照號待補', bookingRef: 'FZG27B', ticketNumber: '695-5529306522' },
    { name: 'MA JUI MIN', passport: '護照號待補', bookingRef: 'FZG27B', ticketNumber: '695-5529306523' },
    { name: 'FANG RUO YAN', passport: '護照號待補', bookingRef: 'FZG27B', ticketNumber: '695-5529306524' },
    { name: 'CHEN LI WEN', passport: '護照號待補', bookingRef: 'FZG27B', ticketNumber: '695-5529306525' }
];

// ===== 存儲管理函數 =====
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('存儲失敗:', e);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('讀取存儲失敗:', e);
        return defaultValue;
    }
}

// ===== 頁面初始化 =====
window.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // 初始化成員列表 - 強制使用默認成員（確保包含所有欄位）
    saveToStorage(STORAGE_KEYS.members, DEFAULT_MEMBERS);
    renderMemberList(DEFAULT_MEMBERS);
    
    // 初始化打卡記錄
    const checkins = loadFromStorage(STORAGE_KEYS.checkins) || [];
    renderCheckInList(checkins);
    
    // 初始化深色模式
    const isDarkMode = loadFromStorage(STORAGE_KEYS.darkMode, false);
    if (isDarkMode) {
        enableDarkMode();
    }
    
    // 初始化貨幣匯率
    const rate = loadFromStorage(STORAGE_KEYS.exchangeRate, 3300);
    document.getElementById('exchangeRate').textContent = rate;
    
    // 綁定深色模式按鈕
    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);
    // 初始化評價UI
    if (typeof renderReviewUI === 'function') renderReviewUI();
}

// ===== 面板切換功能 =====
function toggleDay(dayTitle) {
    const detail = dayTitle.nextElementSibling;
    const icon = dayTitle.querySelector('.toggle-icon');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        icon.textContent = '▼';
    } else {
        detail.style.display = 'none';
        icon.textContent = '▶';
    }
}

function toggleMemberPanel() {
    const panel = document.getElementById('memberPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleLuggagePanel() {
    const panel = document.getElementById('luggagePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleCurrencyPanel() {
    const panel = document.getElementById('currencyPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleCheckInPanel() {
    const panel = document.getElementById('checkInPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// 2. 行程時間提醒 + 本地存儲
function setReminder(title, targetTime) {
    const now = new Date().getTime();
    const target = new Date(targetTime).getTime();
    const diff = target - now;

    if (diff < 0) {
        alert('提醒時間已過期！');
        return;
    }

    // 存儲提醒到本地
    const reminders = loadFromStorage(STORAGE_KEYS.reminders) || [];
    reminders.push({ title, targetTime });
    saveToStorage(STORAGE_KEYS.reminders, reminders);

    // 倒計時提醒
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('行程提醒', { body: `即將開始：${title}` });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') new Notification('行程提醒', { body: `即將開始：${title}` });
            });
        }
        alert(`提醒：即將開始 → ${title}`);
    }, diff);

    alert(`已設置提醒：${title}（${targetTime}）`);
}

// 页面加载时显示已设置的提醒
window.onload = function() {
    // 加载提醒
    const reminders = loadFromStorage(STORAGE_KEYS.reminders) || [];
    if (reminders.length > 0) {
        const reminderList = reminders.map(r => `${r.title}（${r.targetTime}）`).join('\n');
        console.log(`已设置的提醒：\n${reminderList}`);
    }

    // 初始化其他功能
    initDarkMode();
    updateProgress();
};

// ========================= 景點導航功能 =========================
function navigateTo(lat, lng, name) {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    
    let url;
    if (isIOS) {
        url = `maps://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`;
    } else if (isAndroid) {
        url = `geo:${lat},${lng}?q=${encodeURIComponent(name)}`;
    } else {
        url = `https://maps.google.com/?q=${lat},${lng}`;
    }
    
    window.open(url, '_blank');
}

// ========================= 多人同行管理 =========================
function addMemberQuick() {
    const nameInput = document.getElementById('memberName');
    const passportInput = document.getElementById('memberPassport');
    const name = nameInput.value.trim();
    const passport = passportInput.value.trim();
    
    if (!name || !passport) {
        alert('⚠️ 請輸入成員姓名和護照號碼');
        return;
    }
    
    let members = loadFromStorage(STORAGE_KEYS.members) || [];
    if (members.some(m => m.passport === passport)) {
        alert('⚠️ 此護照號碼已存在');
        return;
    }
    
    members.push({ name, passport });
    saveToStorage(STORAGE_KEYS.members, members);
    renderMemberList(members);
    clearMemberInputs();
    
    // 顯示成功提示
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #4CAF50; color: white; padding: 15px 30px; border-radius: 8px; z-index: 1000; font-weight: bold;';
    successMsg.textContent = `✓ 成員 ${name} 已新增！`;
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2000);
}

function clearMemberInputs() {
    document.getElementById('memberName').value = '';
    document.getElementById('memberPassport').value = '';
}

function editMember() {
    const name = prompt('輸入成員姓名:');
    if (!name) return;
    
    const passport = prompt('輸入護照號碼:');
    if (!passport) return;
    
    let members = loadFromStorage(STORAGE_KEYS.members) || [];
    members.push({ name, passport });
    saveToStorage(STORAGE_KEYS.members, members);
    renderMemberList(members);
    alert('成員已新增！');
}

function renderMemberList(members) {
    const list = document.getElementById('memberList');
    list.innerHTML = '';
    
    console.log('renderMemberList called with:', members);
    
    if (members.length === 0) {
        list.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 10px; text-align: center;">暫無成員信息</div>';
        return;
    }
    
    members.forEach((member, index) => {
        console.log('Rendering member:', member);
        const item = document.createElement('div');
        item.className = 'member-item';
        item.innerHTML = `
            <div style="flex: 1; width: 100%;">
                <div style="font-weight: bold; font-size: 14px; color: #1f2937;">${member.name}</div>
                <div style="font-size: 12px; color: #374151; margin-top: 6px;">
                    🎫 機票號: <span style="color: #059669; font-weight: 600;">${member.ticketNumber}</span>
                </div>
                <div style="font-size: 12px; color: #374151; margin-top: 4px;">
                    📍 訂位代號: <span style="color: #059669; font-weight: 600;">${member.bookingRef}</span>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

function removeMember(index) {
    if (!confirm('確定要刪除此成員嗎？')) return;
    
    let members = loadFromStorage(STORAGE_KEYS.members) || [];
    members.splice(index, 1);
    saveToStorage(STORAGE_KEYS.members, members);
    renderMemberList(members);
}

// ========================= 離線行李清單 =========================
function renderLuggageList(luggage) {
    const list = document.getElementById('luggageList');
    list.innerHTML = '';
    
    luggage.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'luggage-item';
        div.innerHTML = `
            <input type="checkbox" id="luggage_${index}" onchange="updateLuggageStatus(${index})">
            <label for="luggage_${index}" style="margin-left: 6px;">${item}</label>
            <button class="btn-red" onclick="removeLuggageItem(${index})">刪除</button>
        `;
        list.appendChild(div);
    });
}

function addLuggageItem() {
    const input = document.getElementById('newItem');
    const item = input.value.trim();
    
    if (!item) {
        alert('請輸入物品名稱');
        return;
    }
    
    let luggage = loadFromStorage(STORAGE_KEYS.luggage) || DEFAULT_LUGGAGE;
    luggage.push(item);
    saveToStorage(STORAGE_KEYS.luggage, luggage);
    renderLuggageList(luggage);
    input.value = '';
}

function removeLuggageItem(index) {
    let luggage = loadFromStorage(STORAGE_KEYS.luggage) || DEFAULT_LUGGAGE;
    luggage.splice(index, 1);
    saveToStorage(STORAGE_KEYS.luggage, luggage);
    renderLuggageList(luggage);
}

function updateLuggageStatus(index) {
    console.log('物品 ' + index + ' 已勾選');
}

// ========================= 行程進度條 =========================
function updateProgress() {
    const startDate = new Date('2026-01-23');
    const endDate = new Date('2026-01-29');
    const today = new Date();
    
    if (today < startDate) {
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '未開始（Day 0 / 7）';
    } else if (today > endDate) {
        document.getElementById('progressBar').style.width = '100%';
        document.getElementById('progressText').textContent = '已結束（Day 7 / 7）';
    } else {
        const totalDays = 7;
        const pastDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const progress = (pastDays / totalDays) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `Day ${pastDays} / 7`;
    }
}

// ========================= 夜間模式 =========================
const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const userDarkMode = loadFromStorage(STORAGE_KEYS.darkMode, false);
let darkMode = userDarkMode || isSystemDark;

function enableDarkMode() {
    document.body.classList.add('dark');
    document.querySelector('.trip-app').classList.add('dark');
    document.querySelector('.trip-header').classList.add('dark');
    document.querySelector('#darkModeBtn').classList.add('dark');
    document.querySelector('.tab-nav').classList.add('dark');
    document.querySelector('.progress-bar-container').classList.add('dark');
    
    // 更新所有tab按钮
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.add('dark');
    });
    
    // 更新所有tab内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('dark');
    });
    
    // 更新进度条标题
    document.querySelector('.progress-header').classList.add('dark');
    
    // 更新所有进度条wrap
    document.querySelectorAll('.progress-bar-wrap').forEach(wrap => {
        wrap.classList.add('dark');
    });
    
    // 更新所有卡片、行李项、成员项
    document.querySelectorAll('.flight-item, .member-item, .luggage-item, .card').forEach(item => {
        item.classList.add('dark');
    });
    
    // 更新所有输入框
    document.querySelectorAll('.input-group input').forEach(input => {
        input.classList.add('dark');
    });
    
    // 更新所有日期卡片
    document.querySelectorAll('.day-card').forEach(card => {
        card.classList.add('dark');
        card.querySelector('.day-title').classList.add('dark');
    });
    
    // 更新所有详情部分
    document.querySelectorAll('.day-detail').forEach(detail => {
        detail.classList.add('dark');
    });
    
    // 更新所有日程项
    document.querySelectorAll('.schedule-item').forEach(item => {
        item.classList.add('dark');
    });
    
    // 更新餐食和住宿信息
    document.querySelectorAll('.meal-info').forEach(info => {
        info.classList.add('dark');
    });
    
    document.querySelectorAll('.remark').forEach(remark => {
        remark.classList.add('dark');
    });
    
    // 更新打卡项
    document.querySelectorAll('.checkin-item').forEach(item => {
        item.classList.add('dark');
    });
    
    // 更新货币率信息
    document.querySelectorAll('.currency-rate').forEach(rate => {
        rate.classList.add('dark');
    });
    
    // 更新页脚
    document.querySelector('.trip-footer').classList.add('dark');
}

function disableDarkMode() {
    document.body.classList.remove('dark');
    document.querySelector('.trip-app').classList.remove('dark');
    document.querySelector('.trip-header').classList.remove('dark');
    document.querySelector('#darkModeBtn').classList.remove('dark');
    document.querySelector('.tab-nav').classList.remove('dark');
    document.querySelector('.progress-bar-container').classList.remove('dark');
    
    // 移除所有tab按钮的dark类
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('dark');
    });
    
    // 移除所有tab内容的dark类
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('dark');
    });
    
    // 移除进度条标题
    document.querySelector('.progress-header').classList.remove('dark');
    
    // 移除所有进度条wrap
    document.querySelectorAll('.progress-bar-wrap').forEach(wrap => {
        wrap.classList.remove('dark');
    });
    
    // 移除所有卡片、行李项、成员项
    document.querySelectorAll('.flight-item, .member-item, .luggage-item, .card').forEach(item => {
        item.classList.remove('dark');
    });
    
    // 移除所有输入框的dark类
    document.querySelectorAll('.input-group input').forEach(input => {
        input.classList.remove('dark');
    });
    
    // 移除所有日期卡片
    document.querySelectorAll('.day-card').forEach(card => {
        card.classList.remove('dark');
        card.querySelector('.day-title').classList.remove('dark');
    });
    
    // 移除所有详情部分的dark类
    document.querySelectorAll('.day-detail').forEach(detail => {
        detail.classList.remove('dark');
    });
    
    // 移除所有日程项的dark类
    document.querySelectorAll('.schedule-item').forEach(item => {
        item.classList.remove('dark');
    });
    
    // 移除餐食和住宿信息的dark类
    document.querySelectorAll('.meal-info').forEach(info => {
        info.classList.remove('dark');
    });
    
    document.querySelectorAll('.remark').forEach(remark => {
        remark.classList.remove('dark');
    });
    
    // 移除打卡项的dark类
    document.querySelectorAll('.checkin-item').forEach(item => {
        item.classList.remove('dark');
    });
    
    // 移除货币率信息的dark类
    document.querySelectorAll('.currency-rate').forEach(rate => {
        rate.classList.remove('dark');
    });
    
    // 移除页脚的dark类
    document.querySelector('.trip-footer').classList.remove('dark');
}

function toggleDarkMode() {
    darkMode = !darkMode;
    saveToStorage(STORAGE_KEYS.darkMode, darkMode);
    
    if (darkMode) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

// ========================= 貨幣換算 =========================
function convertTWDToVND() {
    const twd = parseFloat(document.getElementById('twdInput').value) || 0;
    const rate = parseFloat(document.getElementById('exchangeRate').textContent);
    const vnd = twd * rate;
    document.getElementById('vndInput').value = Math.round(vnd);
}

function convertVNDToTWD() {
    const vnd = parseFloat(document.getElementById('vndInput').value) || 0;
    const rate = parseFloat(document.getElementById('exchangeRate').textContent);
    const twd = vnd / rate;
    document.getElementById('twdInput').value = Math.round(twd * 100) / 100;
}

function updateExchangeRate() {
    const newRate = prompt('輸入新的匯率 (1 TWD = ? VND):', document.getElementById('exchangeRate').textContent);
    if (newRate && !isNaN(newRate)) {
        const rate = parseFloat(newRate);
        saveToStorage(STORAGE_KEYS.exchangeRate, rate);
        document.getElementById('exchangeRate').textContent = rate;
        alert('匯率已更新！');
    }
}

// ========================= 景點打卡功能 =========================
function checkInSpot(spotName, day) {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let checkins = loadFromStorage(STORAGE_KEYS.checkins) || [];
    
    // 檢查是否已打卡
    const exists = checkins.some(c => c.spotName === spotName && c.day === day);
    if (exists) {
        alert('此景點已打卡過！');
        return;
    }
    
    checkins.push({
        spotName,
        day,
        time: timeStr,
        photoUrl: null
    });
    
    saveToStorage(STORAGE_KEYS.checkins, checkins);
    renderCheckInList(checkins);
    alert(`✓ ${spotName} 打卡成功！時間: ${timeStr}`);
}

function renderCheckInList(checkins) {
    const panel = document.getElementById('checkInPanel');
    panel.innerHTML = '';
    
    if (checkins.length === 0) {
        panel.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 10px;">尚未有打卡記錄</div>';
        return;
    }
    
    checkins.forEach((checkin, index) => {
        const item = document.createElement('div');
        item.className = 'checkin-item';
        item.innerHTML = `
            <h4>${checkin.spotName}</h4>
            <div class="checkin-time">${checkin.day} • ${checkin.time}</div>
            <button class="btn-red" onclick="removeCheckIn(${index})">刪除</button>
        `;
        panel.appendChild(item);
    });
}

function removeCheckIn(index) {
    if (!confirm('確定要刪除此打卡記錄嗎？')) return;
    
    let checkins = loadFromStorage(STORAGE_KEYS.checkins) || [];
    checkins.splice(index, 1);
    saveToStorage(STORAGE_KEYS.checkins, checkins);
    renderCheckInList(checkins);
}

// ========================= 頁面加載初始化 =========================
// (已在initializePage()函數中實現)

// ========================= 評價系統（Local） =========================
function loadAllReviews() {
    return loadFromStorage(STORAGE_KEYS.reviews, []);
}

function submitReview() {
    const day = Number(document.getElementById('reviewDay').value || 0);
    const member = document.getElementById('reviewMember').value;
    const ratingInput = document.querySelector('input[name="reviewStars"]:checked');
    const rating = ratingInput ? Number(ratingInput.value) : 0;
    const comment = document.getElementById('reviewComment').value.trim();

    if (!day || !member || rating <= 0) {
        alert('請選擇日期、成員並給分');
        return;
    }

    const reviews = loadAllReviews();
    reviews.push({ day, member, rating, comment, timestamp: new Date().toISOString() });
    saveToStorage(STORAGE_KEYS.reviews, reviews);
    renderReviewsForDay(day);
    document.getElementById('reviewComment').value = '';
    document.querySelectorAll('input[name="reviewStars"]').forEach(i => i.checked = false);
    alert('已儲存評價');
}

function renderReviewUI() {
    // populate days and members
    const daySelect = document.getElementById('reviewDay');
    if (!daySelect) return; // itinerary tab not present yet
    daySelect.innerHTML = '';
    for (let i = 1; i <= 7; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Day ${String(i).padStart(2, '0')}`;
        daySelect.appendChild(opt);
    }

    const memberSelect = document.getElementById('reviewMember');
    memberSelect.innerHTML = '';
    const members = loadFromStorage(STORAGE_KEYS.members, DEFAULT_MEMBERS) || DEFAULT_MEMBERS;
    members.forEach(m => {
        const o = document.createElement('option');
        o.value = m.name;
        o.textContent = m.name;
        memberSelect.appendChild(o);
    });

    // default render for day 1
    renderReviewsForDay(1);
}

function renderReviewsForDay(day) {
    const list = document.getElementById('reviewsList');
    if (!list) return;
    const reviews = loadAllReviews().filter(r => Number(r.day) === Number(day));
    list.innerHTML = '';
    if (reviews.length === 0) {
        list.innerHTML = '<div style="color:#94a3b8; padding:8px;">尚無評價</div>';
        return;
    }

    // average
    const avg = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);
    const header = document.createElement('div');
    header.style.fontWeight = '700';
    header.style.marginBottom = '8px';
    header.textContent = `平均評分：${avg} / 5 （${reviews.length} 則）`;
    list.appendChild(header);

    reviews.forEach(r => {
        const it = document.createElement('div');
        it.className = 'card';
        it.style.marginBottom = '8px';
        it.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div style="font-weight:700;">${r.member}</div>
                <div style="color:#ffb020; font-weight:700;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            </div>
            <div style="font-size:13px; color:#6b7280; margin-bottom:6px;">${r.comment || ''}</div>
            <div style="font-size:11px; color:#9ca3af;">${new Date(r.timestamp).toLocaleString()}</div>
        `;
        list.appendChild(it);
    });
}

function exportReviews() {
    const data = loadAllReviews();
    if (!data || data.length === 0) return alert('目前沒有評價可匯出');
    // 產生 CSV（不含特殊格式），欄位：day,member,rating,comment,timestamp
    const rows = [['day','member','rating','comment','timestamp']];
    data.forEach(r => rows.push([r.day, r.member, r.rating, (r.comment||'').replace(/\n/g,' '), r.timestamp]));
    const csv = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g,'""') + '"').join(',')).join('\n');
    downloadData(csv, 'text/csv;charset=utf-8', 'trip-reviews.csv');
}

function importReviewsFromText() {
    const text = prompt('請貼上 CSV 或簡易文字（每行：day,member,rating,comment），多行會自動匯入：');
    if (!text) return;
    try {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const parsed = [];
        // 支援 header 行（包含day/member）或純資料行
        lines.forEach(line => {
            // 如果是 JSON 陣列的字串，嘗試解析整段
            if (line.startsWith('[') || line.startsWith('{')) return; // skip
            // CSV parse（簡易）
            const parts = line.split(',');
            if (parts.length < 3) return;
            const day = Number(parts[0].replace(/[^0-9]/g,'')) || 0;
            const member = parts[1].trim();
            const rating = Number(parts[2].replace(/[^0-9]/g,'')) || 0;
            const comment = parts.slice(3).join(',').trim().replace(/^\"|\"$/g,'');
            if (day && member && rating) parsed.push({ day, member, rating, comment, timestamp: new Date().toISOString() });
        });
        if (parsed.length === 0) return alert('未找到可匯入的評價資料（請確保每行包含 day,member,rating）');
        const existing = loadAllReviews();
        const merged = existing.concat(parsed);
        saveToStorage(STORAGE_KEYS.reviews, merged);
        alert('匯入完成：' + parsed.length + ' 筆');
        const day = Number(document.getElementById('reviewDay').value || 1);
        renderReviewsForDay(day);
    } catch (e) {
        alert('匯入失敗：' + e.message);
    }
}

function downloadJSON(obj, filename) {
    const data = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(obj, null, 2));
    const a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function downloadData(content, mime, filename) {
    const data = 'data:' + mime + ',' + encodeURIComponent(content);
    const a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function copyReviewsSummary() {
    const reviews = loadAllReviews();
    if (!reviews || reviews.length === 0) return alert('目前沒有評價可複製');
    // 簡潔文字摘要（每行）
    const lines = reviews.map(r => `Day${r.day} | ${r.member} | ${r.rating}/5 | ${r.comment || ''}`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => alert('摘要已複製到剪貼簿')).catch(() => alert('複製失敗'));
}