// CONFIGURATION
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwTe9QdaH-cEDJY47hNcXFL4J7WwXaBdESAIUG1xI39AvrDLY37OQlfYK_OGlNtRrVs/exec'; 

// MOCK DATA
const MOCK_DATA = [
    { id: '1', date: '2025-01-12', time: '18:30', type: 'ONE_MAN', status: 'CONFIRMED', artist: 'YOASOBI', tour_title: 'ASIA TOUR 2024-2025 “超現實”', venue_name: '台北小巨蛋', lat_lng: '25.051, 121.550', seat_info: '特區 B2排', ticket_price: '4800', currency: 'TWD', is_first_time: true, setlist: '1. 祝福\n2. 夜に駆ける\n3. 勇者\n4. アイドル', images: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500' }
];

const TYPE_MAP_PRO = { 'ONE_MAN': 'LIVE', 'FES': 'FES', 'VIEWING': 'LV', 'ONLINE': 'ONLINE', 'SIGNING': 'EVENT', 'FAN_MEETING': 'EVENT', 'EVENT': 'EVENT' };
const TYPE_MAP_JP = { 'ONE_MAN': 'ワンマンライブ', 'FES': 'フェス / 対バン', 'VIEWING': 'ライブビューイング', 'ONLINE': 'オンライン配信', 'SIGNING': 'サイン会', 'FAN_MEETING': 'ファンミーティング', 'EVENT': '展示会 / イベント' };

let allTickets = [];
let currentFilterYear = 'ALL';
let adminPassword = '';
let mapInstance = null;
let detailMapInstance = null;
let artistChartInstance = null;
let venueChartInstance = null;

const listTab = document.querySelector('[data-tab="list"]');
const mapTab = document.querySelector('[data-tab="map"]');
const statsTab = document.querySelector('[data-tab="stats"]');
const listView = document.getElementById('list-view');
const mapView = document.getElementById('map-view');
const statsView = document.getElementById('stats-view');
const ticketContainer = document.getElementById('ticket-container');
const yearFilterContainer = document.getElementById('year-filter');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');

document.addEventListener('DOMContentLoaded', () => { fetchData(); setupTabs(); });

// --- UTILITIES ---
function cleanDate(dateStr) { if (!dateStr) return ''; return dateStr.toString().split(' ')[0].split('T')[0]; }
function cleanTime(timeStr) { 
    if (!timeStr) return ''; 
    const s = timeStr.toString();
    if (s.includes(':')) {
        const parts = s.split(':');
        return `${parts[0].slice(-2)}:${parts[1].slice(0, 2)}`;
    }
    return s.substring(0, 5);
}
function formatPrice(price, currency) { if (!price) return '-'; const symbol = currency === 'JPY' ? '¥' : 'NT$'; return `${symbol}${Number(price).toLocaleString()}`; }

async function fetchData() {
    try {
        if (!GAS_API_URL) { renderApp(MOCK_DATA); return; }
        const res = await fetch(GAS_API_URL);
        const data = await res.json();
        renderApp(data && data.length > 0 ? data : MOCK_DATA);
    } catch (e) { renderApp(MOCK_DATA); }
}

function renderApp(data) {
    allTickets = data;
    const loadingEl = document.getElementById('loading'); if (loadingEl) loadingEl.style.display = 'none';
    renderYearFilter(); renderTickets(data); renderMenu(data);
}

function renderYearFilter() {
    yearFilterContainer.innerHTML = '';
    const years = ['ALL', ...new Set(allTickets.map(t => cleanDate(t.date).split('-')[0]))].sort((a,b) => b==='ALL'?-1:b-a);
    years.forEach(year => {
        const chip = document.createElement('div');
        chip.className = `year-chip ${year === currentFilterYear ? 'active' : ''}`;
        chip.textContent = year;
        chip.onclick = () => { currentFilterYear = year; document.querySelectorAll('.year-chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); filterTickets(); };
        yearFilterContainer.appendChild(chip);
    });
}

function filterTickets() {
    // 增加過場感：先清空再重新顯示
    ticketContainer.style.opacity = '0';
    setTimeout(() => {
        const filtered = currentFilterYear === 'ALL' ? allTickets : allTickets.filter(t => cleanDate(t.date).startsWith(currentFilterYear));
        renderTickets(filtered);
        ticketContainer.style.opacity = '1';
        ticketContainer.classList.add('animate-fade');
    }, 200);
}

function renderTickets(tickets) {
    ticketContainer.innerHTML = '';
    const sorted = [...tickets].sort((a,b) => new Date(cleanDate(b.date)) - new Date(cleanDate(a.date)));
    
    sorted.forEach((t, index) => {
        let statusClass = '';
        switch(t.status) {
            case 'APPLIED': statusClass = 'status-applied'; break;
            case 'WON': statusClass = 'status-won'; break;
            case 'CONFIRMED': statusClass = 'status-confirmed'; break;
            case 'LOST': statusClass = 'status-lost'; break;
        }
        const proLabel = TYPE_MAP_PRO[t.type] || 'LIVE';
        const card = document.createElement('div');
        card.className = `ticket ${statusClass} animate-up`;
        // 設定 staggered delay
        card.style.animationDelay = `${index * 0.08}s`;
        card.id = `ticket-${t.id}`;
        card.innerHTML = `
            ${t.is_first_time ? '<div class="badge-first">初參戰</div>' : ''}
            <div class="ticket-info-left" onclick="openDetail('${t.id}')">
                <div class="ticket-logo">${proLabel}</div>
                <div class="ticket-title">${t.tour_title}</div>
                <div class="ticket-subtitle">${t.artist}</div>
                <div class="ticket-meta-top"><div class="info-box"><span>PRICE</span><span>${formatPrice(t.ticket_price, t.currency)}</span></div><div class="info-box"><span>SEAT</span><span>${t.seat_info || '-'}</span></div></div>
                <div class="ticket-pills">
                    <div class="pill"><i data-lucide="map-pin" style="width:10px;"></i> ${t.venue_name}</div>
                    <div class="pill"><i data-lucide="calendar" style="width:10px;"></i> ${cleanDate(t.date)}</div>
                    <div class="pill"><i data-lucide="clock" style="width:10px;"></i> ${cleanTime(t.time)}</div>
                </div>
            </div>
            <div class="ticket-visual" onclick="openDetail('${t.id}')" style="background-image: url('${t.images || ''}')"></div>
            <div class="ticket-stub-right" onclick="openDetail('${t.id}')"><div class="barcode-container"><div class="barcode"></div><div class="ticket-num">LN-${String(t.id).padStart(6,'0')}</div></div></div>
        `;
        ticketContainer.appendChild(card);
    });
    lucide.createIcons();
}

function setupTabs() {
    listTab.addEventListener('click', () => switchTab('list'));
    mapTab.addEventListener('click', () => switchTab('map'));
    statsTab.addEventListener('click', () => switchTab('stats'));
}

function switchTab(tab) {
    [listTab, mapTab, statsTab].forEach(t => t.classList.remove('active'));
    [listView, mapView, statsView].forEach(v => v.classList.remove('active'));
    document.getElementById('back-btn-container').style.display = 'none';
    if (tab === 'list') { listTab.classList.add('active'); listView.classList.add('active'); }
    else if (tab === 'map') { mapTab.classList.add('active'); mapView.classList.add('active'); setTimeout(initMap, 200); }
    else if (tab === 'stats') { statsTab.classList.add('active'); statsView.classList.add('active'); setTimeout(initStats, 200); }
}

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('map').setView([25.033, 121.565], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', maxZoom: 19 }).addTo(mapInstance);
    allTickets.forEach(t => { if (t.lat_lng) { const [la, ln] = t.lat_lng.split(',').map(Number); L.marker([la, ln]).addTo(mapInstance); } });
}

function initStats() {
    const artC = {}; const venC = {};
    allTickets.forEach(t => { if (t.status === 'LOST') return; artC[t.artist] = (artC[t.artist]||0)+1; venC[t.venue_name] = (venC[t.venue_name]||0)+1; });
    const sa = Object.entries(artC).sort((a,b)=>b[1]-a[1]); const sv = Object.entries(venC).sort((a,b)=>b[1]-a[1]);
    renderDonut('artistChart', sa.slice(0,5), artistChartInstance, (c)=>artistChartInstance=c);
    renderDonut('venueChart', sv.slice(0,5), venueChartInstance, (c)=>venueChartInstance=c);
    renderStatsList('artist-stats-list', sa); renderStatsList('venue-stats-list', sv);
}

function renderDonut(id, data, inst, save) {
    if (inst) inst.destroy();
    const ctx = document.getElementById(id).getContext('2d');
    save(new Chart(ctx, {
        type: 'doughnut',
        data: { labels: data.map(d=>d[0]), datasets: [{ data: data.map(d=>d[1]), backgroundColor: ['#C5A489','#A68B75','#8C7563','#736052','#40352E'], borderColor: '#000', borderWidth: 2 }] },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { animateRotate: true, animateScale: true, duration: 1500, easing: 'easeOutQuart' },
            plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } } }, 
            cutout: '75%' 
        }
    }));
}

function renderStatsList(id, data) { document.getElementById(id).innerHTML = data.map(i => `<div class="stats-item animate-fade"><span class="name">${i[0]}</span><span class="count">${i[1]} 回</span></div>`).join(''); }

window.toggleMenu = () => { document.getElementById('side-menu').classList.toggle('open'); document.getElementById('side-menu-overlay').classList.toggle('hidden'); };
function renderMenu(tickets) {
    const menu = document.getElementById('menu-content'); menu.innerHTML = '';
    const years = {}; tickets.forEach(t => { const y = cleanDate(t.date).split('-')[0]; if (!years[y]) years[y] = []; years[y].push(t); });
    Object.keys(years).sort((a,b)=>b-a).forEach(y => {
        const div = document.createElement('div'); div.className = 'menu-group'; div.innerHTML = `<div class="menu-year">${y}</div>`;
        years[y].forEach(t => {
            const item = document.createElement('div'); item.className = 'menu-item'; item.onclick = () => { toggleMenu(); showSingleTicket(t.id); };
            item.innerHTML = `<div class="menu-artist">${t.artist}</div><div class="menu-tour">${t.tour_title}</div>`; div.appendChild(item);
        });
        menu.appendChild(div);
    });
}

function showSingleTicket(id) { switchTab('list'); document.querySelectorAll('.ticket').forEach(el => el.style.display = el.id === `ticket-${id}` ? 'flex' : 'none'); document.getElementById('back-btn-container').style.display = 'block'; }
window.showAllTickets = () => { document.querySelectorAll('.ticket').forEach(el => el.style.display = 'flex'); document.getElementById('back-btn-container').style.display = 'none'; };

window.openDetail = function(id) {
    const t = allTickets.find(x => x.id === id); if (!t) return;
    const typeLabelJP = TYPE_MAP_JP[t.type] || 'イベント';
    modalBody.innerHTML = `
        <div class="modal-hero-img" style="background-image: url('${t.images || ''}')"></div>
        <div class="modal-text-content">
            <h2 style="color:var(--text-accent); font-family:'Anton'; font-size:2.2rem;">${t.tour_title}</h2><h3 style="color:#aaa; font-size:1.2rem; margin-top:0;">${t.artist}</h3>
            ${t.artist_list ? `<div style="margin:1rem 0; background:#1a1a1a; padding:15px; border-left:3px solid var(--text-accent);"><strong style="color:var(--text-accent);">出演者</strong><br>${t.artist_list}</div>` : ''}
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin: 1.5rem 0;">
                <div><strong style="color:var(--text-accent);">公演種別:</strong> ${typeLabelJP}</div>
                <div><strong style="color:var(--text-accent);">公演日:</strong> ${cleanDate(t.date)}</div>
                <div><strong style="color:var(--text-accent);">開演:</strong> ${cleanTime(t.time)}</div>
                <div><strong style="color:var(--text-accent);">料金:</strong> ${formatPrice(t.ticket_price, t.currency)}</div>
                <div><strong style="color:var(--text-accent);">座席:</strong> ${t.seat_info || '-'}</div>
                <div style="grid-column:span 2;"><strong style="color:var(--text-accent);">会場:</strong> ${t.venue_name}</div>
            </div>
            <hr style="border:0; border-top:1px dashed #444; margin: 1.5rem 0;"><h4 style="color:var(--text-accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">SETLIST / セットリスト</h4>
            <div style="background:#0a0a0a; padding:20px; border:1px solid #222; font-family:monospace; max-height:250px; overflow-y:auto; color:#bbb; line-height:1.6;">${t.setlist ? t.setlist.replace(/\n/g, '<br>') : '-'}</div>
            <div id="detail-map" style="height:250px; margin-top:20px; border-radius:8px; border:1px solid #333;"></div>
        </div>
    `;
    modal.classList.remove('hidden');
    setTimeout(() => {
        if (detailMapInstance) detailMapInstance.remove();
        if (t.lat_lng) { const [la, ln] = t.lat_lng.split(',').map(Number); detailMapInstance = L.map('detail-map', { zoomControl: false }).setView([la, ln], 14); L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(detailMapInstance); L.marker([la, ln]).addTo(detailMapInstance); }
    }, 300);
}

window.closeModal = () => modal.classList.add('hidden');
window.openLogin = () => { document.getElementById('login-modal').classList.remove('hidden'); document.getElementById('admin-pass').focus(); };
window.checkLogin = () => { const pass = document.getElementById('admin-pass').value; if (pass.length > 0) { adminPassword = pass; document.getElementById('login-modal').classList.add('hidden'); showAdminForm(); } }

function showAdminForm() {
    modalBody.innerHTML = `
        <h2 style="color:var(--text-accent); font-family:'Bebas Neue'; margin-bottom:1rem;">ADD NEW TICKET</h2>
        <form id="admin-form" onsubmit="event.preventDefault(); handleSave();" style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; gap:12px;">
                <div style="flex:1;"><label>日期</label><input type="date" name="date" required style="width:100%;"></div>
                <div style="flex:1;"><label>時間</label><input type="time" name="time" value="19:00" required style="width:100%;"></div>
            </div>
            <div style="display:flex; gap:12px;">
                <div style="flex:1;"><label>活動類型</label><select name="type" style="width:100%;"><option value="ONE_MAN">專場演唱會</option><option value="FES">音樂祭 / 拼盤</option><option value="VIEWING">院線直播 (LV)</option><option value="ONLINE">線上直播</option><option value="SIGNING">簽名會</option><option value="FAN_MEETING">見面會</option><option value="EVENT">展覽 / 活動</option></select></div>
                <div style="flex:1;"><label>狀態</label><select name="status" style="width:100%;"><option value="CONFIRMED">參戰確定</option><option value="COMPLETED">已結束</option><option value="APPLIED">抽選中</option><option value="WON">當選</option><option value="LOST">落選</option></select></div>
            </div>
            <input type="text" name="artist" placeholder="主要藝人 (Artist)" required>
            <input type="text" name="artist_list" placeholder="出演者名單">
            <input type="text" name="tour_title" placeholder="巡迴標題" required>
            <input type="text" name="venue_name" placeholder="會場名稱" required>
            <input type="text" name="lat_lng" placeholder="經緯度 (例如: 25.051, 121.550)">
            <div style="display:flex; gap:10px;"><select name="currency" style="width:80px;"><option value="TWD">TWD</option><option value="JPY">JPY</option></select><input type="number" name="ticket_price" placeholder="票價" style="flex:1;"></div>
            <input type="text" name="seat_info" placeholder="座席資訊">
            <textarea name="setlist" placeholder="歌單" rows="5"></textarea>
            <input type="text" name="images" placeholder="圖片網址">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" name="is_first_time"> 這是我的初參戰！</label>
            <button type="submit" id="save-btn" style="background:var(--text-accent); color:black; padding:12px; font-weight:bold; font-family:'Bebas Neue'; border:none;">SAVE TICKET</button>
        </form>
    `;
    modal.classList.remove('hidden');
}

window.handleSave = async function() {
    if (!GAS_API_URL) { alert('請先設定 GAS_API_URL'); return; }
    const saveBtn = document.getElementById('save-btn'); saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
    const form = document.getElementById('admin-form'); const formData = new FormData(form); const data = {};
    formData.forEach((val, key) => data[key] = val);
    data.is_first_time = form.querySelector('[name="is_first_time"]').checked;
    try { await fetch(GAS_API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ password: adminPassword, data: data }) }); alert('紀錄已送出！'); closeModal(); location.reload(); } catch (e) { alert('儲存失敗：' + e.toString()); saveBtn.disabled = false; saveBtn.textContent = 'SAVE TICKET'; }
}

window.onclick = (e) => { if (e.target == modal || e.target == document.getElementById('login-modal')) closeModal(); };
