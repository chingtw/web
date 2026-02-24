// CONFIGURATION
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzNorFaLtMtIRlK7T7UlYCRjkEu06MZEyFWgeosQui4omJSjUnYD6AOo_xW2TfG67vo/exec'; 

// MOCK DATA
const MOCK_DATA = [
    { id: '1', date: '2025-01-12', time: '18:30', type: 'ONE_MAN', status: 'CONFIRMED', artist: 'YOASOBI', tour_title: 'ASIA TOUR 2024-2025 “超現實”', venue_name: '台北小巨蛋', lat_lng: '25.051, 121.550', seat_info: '特區 B2排', ticket_price: '4800', currency: 'TWD', is_first_time: true, setlist: '1. 祝福\n2. 夜に駆ける\n3. 勇者\n4. アイドル', images: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500' }
];

const TYPE_MAP_PRO = { 'ONE_MAN': 'LIVE', 'FES': 'FES', 'VIEWING': 'VIEWING', 'ONLINE': 'ONLINE', 'SIGNING': 'EVENT', 'FAN_MEETING': 'EVENT', 'EVENT': 'EVENT', 'SPORTS': 'SPORTS' };
const TYPE_MAP_JP = { 'ONE_MAN': 'ワンマンライブ', 'FES': 'FES / 対バン', 'VIEWING': 'ライブビューイング', 'ONLINE': 'オンライン配信', 'SIGNING': 'サイン会', 'FAN_MEETING': 'ファンミーティング', 'EVENT': '展示会 / イベント', 'SPORTS': 'スポーツ / 試合' };

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

document.addEventListener('DOMContentLoaded', () => { 
    fetchData(); 
    setupTabs(); 
    setupYearScroll();
});

// --- UTILITIES ---
function setupYearScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;

    // 滑鼠滾輪轉水平捲動
    yearFilterContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            yearFilterContainer.scrollLeft += e.deltaY;
        }
    }, { passive: false });

    // 滑鼠拖曳捲動
    yearFilterContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        yearFilterContainer.classList.add('active');
        startX = e.pageX - yearFilterContainer.offsetLeft;
        scrollLeft = yearFilterContainer.scrollLeft;
    });

    yearFilterContainer.addEventListener('mouseleave', () => {
        isDown = false;
    });

    yearFilterContainer.addEventListener('mouseup', () => {
        isDown = false;
    });

    yearFilterContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - yearFilterContainer.offsetLeft;
        const walk = (x - startX) * 2; // 捲動速度倍率
        yearFilterContainer.scrollLeft = scrollLeft - walk;
    });
}

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
function getDisplayName(t) {
    if (t.artist && t.artist.trim() !== '') return { name: t.artist, isType: false };
    return { name: TYPE_MAP_JP[t.type] || 'イベント', isType: true };
}

async function fetchData() {
    const navBar = document.querySelector('.tabs');
    const menuBtn = document.getElementById('menu-btn');
    
    try {
        // 鎖定導覽列
        navBar.classList.add('nav-locked');
        menuBtn.classList.add('nav-locked');

        if (!GAS_API_URL) { renderApp(MOCK_DATA); return; }
        const res = await fetch(GAS_API_URL);
        const data = await res.json();
        renderApp(data && data.length > 0 ? data : MOCK_DATA);
    } catch (e) { 
        renderApp(MOCK_DATA); 
    } finally {
        // 解鎖導覽列
        navBar.classList.remove('nav-locked');
        menuBtn.classList.remove('nav-locked');
    }
}

function renderApp(data) {
    allTickets = data;
    const loadingEl = document.getElementById('loading'); 
    if (loadingEl) loadingEl.style.display = 'none';
    
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

const MILESTONE_MAP = {
    'ARTIST': { label: '初参戦', class: 'badge-artist' },
    'EXPEDITION': { label: '初遠征', class: 'badge-expedition' },
    'VENUE': { label: '初会場', class: 'badge-venue' },
    'EVENT': { label: '初参加', class: 'badge-event' }
};

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
        
        // 處理里程碑標籤
        let badgesHtml = '';
        if (t.is_first_time) {
            // 兼容舊資料 (true) 或新資料 (comma separated string)
            const milestones = t.is_first_time.toString().split(/[、,]+/).map(s => s.trim());
            badgesHtml = `<div class="badge-container">`;
            milestones.forEach(m => {
                if (m === 'true' || m === '1' || m === 'ARTIST') {
                    badgesHtml += `<div class="badge-item badge-artist">初参戦</div>`;
                } else if (MILESTONE_MAP[m]) {
                    badgesHtml += `<div class="badge-item ${MILESTONE_MAP[m].class}">${MILESTONE_MAP[m].label}</div>`;
                }
            });
            badgesHtml += `</div>`;
        }

        const card = document.createElement('div');
        card.className = `ticket ${statusClass} animate-up`;
        card.style.animationDelay = `${index * 0.08}s`;
        card.id = `ticket-${t.id}`;
        card.innerHTML = `
            ${badgesHtml}
            <div class="ticket-info-left" onclick="openDetail('${t.id}')">
                <div class="ticket-logo">${proLabel}</div>
                <div class="ticket-title">${t.tour_title}</div>
                <div class="ticket-subtitle">${t.artist}</div>
                <div class="ticket-meta-top"><div class="info-box"><span>PRICE</span><span>${formatPrice(t.ticket_price, t.currency)}</span></div><div class="info-box"><span>SEAT</span><span>${t.seat_info || '-'}</span></div></div>
                <div class="ticket-pills">
                    <div class="pill"><i data-lucide="map-pin" style="width:10px;"></i> ${t.venue_name}</div>
                    <div class="pill"><i data-lucide="calendar" style="width:10px;"></i> ${cleanDate(t.date)}</div>
                    ${cleanTime(t.time) ? `<div class="pill"><i data-lucide="clock" style="width:10px;"></i> ${cleanTime(t.time)}</div>` : ''}
                </div>
            </div>
            <div class="ticket-visual" onclick="openDetail('${t.id}')" style="background-image: url('${t.images || ''}')"></div>
            <div class="ticket-stub-right" onclick="openDetail('${t.id}')"><div class="barcode-container"><div class="barcode"></div><div class="ticket-num">${t.id}</div></div></div>
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
    // 設定中心點約在沖繩附近，並調整縮放級別為 4，以同時涵蓋台灣與日本
    mapInstance = L.map('map').setView([30.0, 130.0], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', maxZoom: 19 }).addTo(mapInstance);
    
    // 按經緯度群組活動
    const venueGroups = {};
    allTickets.forEach(t => {
        if (t.lat_lng) {
            if (!venueGroups[t.lat_lng]) venueGroups[t.lat_lng] = [];
            venueGroups[t.lat_lng].push(t);
        }
    });

    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div class='custom-marker-pin'></div>",
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });

    Object.keys(venueGroups).forEach(coords => {
        const [la, ln] = coords.split(',').map(Number);
        const ticketsAtVenue = venueGroups[coords];
        const marker = L.marker([la, ln], { icon: customIcon }).addTo(mapInstance);
        
        // 建立包含所有活動的清單
        let listHtml = ticketsAtVenue.map(t => `
            <div style="margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                <strong style="color:var(--text-accent); font-size:1rem;">${getDisplayName(t).name}</strong><br>
                <span style="font-size:0.85rem; color:#eee; word-break:keep-all; line-break:strict; display:block; margin-top:2px;">${t.tour_title}</span><br>
                <span style="color:#aaa; font-size:0.75rem;">${cleanDate(t.date)}</span>
                <button onclick="openDetail('${t.id}')" style="background:var(--text-accent); border:none; color:black; width:100%; margin-top:5px; padding:2px; font-size:0.75rem; font-weight:bold; cursor:pointer; border-radius:2px;">DETAIL</button>
            </div>
        `).join('');

        const popupContent = `
            <div style="color:white; font-family:'Noto Sans TC'; max-height:200px; overflow-y:auto; padding-right:5px;">
                <div style="font-size:0.8rem; color:var(--text-accent); margin-bottom:8px; font-weight:bold; border-left:3px solid var(--text-accent); padding-left:5px;">
                    ${ticketsAtVenue[0].venue_name}
                </div>
                ${listHtml}
            </div>
        `;
        marker.bindPopup(popupContent);
    });
}

function initStats() {
    const artC = {}; const venC = {};
    allTickets.forEach(t => { 
        if (t.status === 'LOST') return; 

        // 收集這一場所有的藝人
        const currentEventArtists = new Set();
        
        // 1. 加入主要藝人
        if (t.artist && t.artist.trim() !== '') {
            currentEventArtists.add(t.artist.trim());
        }
        
        // 2. 加入名單中的藝人 (支援中文頓號、英文逗號)
        if (t.artist_list && t.artist_list.trim() !== '') {
            const list = t.artist_list.split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
            list.forEach(a => currentEventArtists.add(a));
        }

        // 3. 統一計入統計物件
        currentEventArtists.forEach(a => {
            artC[a] = (artC[a] || 0) + 1;
        });

        if (t.venue_name && t.venue_name.trim() !== '') {
            venC[t.venue_name] = (venC[t.venue_name]||0)+1; 
        }
    });
    const sa = Object.entries(artC).sort((a,b)=>b[1]-a[1]); const sv = Object.entries(venC).sort((a,b)=>b[1]-a[1]);
    
    // 清除舊的按鈕避免重複
    document.querySelectorAll('.show-more-btn').forEach(b => b.remove());

    // 圖表只顯示超過含 2 回的資料 (即 2 回以上)，最多顯示前 10 名
    const saForChart = sa.filter(d => d[1] >= 2).slice(0, 10);
    const svForChart = sv.filter(d => d[1] >= 2).slice(0, 10);

    renderDonut('artistChart', saForChart, artistChartInstance, (c)=>artistChartInstance=c);
    renderDonut('venueChart', svForChart, venueChartInstance, (c)=>venueChartInstance=c);
    renderStatsList('artist-stats-list', sa, 'artist'); renderStatsList('venue-stats-list', sv, 'venue');
}

function renderDonut(id, data, inst, save) {
    if (inst) inst.destroy();
    const ctx = document.getElementById(id).getContext('2d');
    const colors = [
        '#C5A489', '#A68B75', '#8C7563', '#736052', '#40352E', 
        '#D9C5B2', '#BFA68E', '#8C6F56', '#594433', '#261C14'
    ];
    save(new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: data.map(d=>d[0]), 
            datasets: [{ 
                data: data.map(d=>d[1]), 
                backgroundColor: colors.slice(0, data.length), 
                borderColor: '#000', 
                borderWidth: 2 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { animateRotate: true, animateScale: true, duration: 1500, easing: 'easeOutQuart' },
            plugins: { legend: { position: 'bottom', labels: { color: '#888', font: { size: 10 } } } }, 
            cutout: '75%' 
        }
    }));
}

function renderStatsList(id, data, type = 'artist') { 
    const container = document.getElementById(id);
    const limit = 40;
    const hasMore = data.length > limit;
    
    const renderItems = (items) => items.map(i => {
        const name = i[0];
        const count = i[1];
        
        // 篩選與該藝人/場地相關的所有場次
        const relatedEvents = allTickets.filter(t => {
            if (t.status === 'LOST') return false;
            if (type === 'artist') {
                const list = (t.artist_list || '').split(/[、,]+/).map(s => s.trim());
                return (t.artist === name) || list.includes(name);
            } else {
                return t.venue_name === name;
            }
        }).sort((a, b) => new Date(cleanDate(b.date)) - new Date(cleanDate(a.date)));

        const detailsHtml = relatedEvents.map(e => `
            <div class="detail-entry">
                <span class="detail-date">${cleanDate(e.date)}</span>
                <div class="title-wrapper">
                    <span class="detail-title">${e.tour_title}</span>
                </div>
            </div>
        `).join('');

        return `
            <div class="stats-item animate-fade" onclick="this.querySelector('.stats-details').classList.toggle('open')">
                <div class="stats-header">
                    <span class="name">${name}</span>
                    <span class="count">${count} 回</span>
                </div>
                <div class="stats-details">
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = renderItems(data.slice(0, limit));

    // 處理電腦版懸停自動滑動
    const setupAutoScroll = () => {
        container.querySelectorAll('.detail-entry').forEach(entry => {
            const wrapper = entry.querySelector('.title-wrapper');
            const title = entry.querySelector('.detail-title');
            
            entry.onmouseenter = () => {
                const overflow = title.offsetWidth - wrapper.clientWidth;
                if (overflow > 0) {
                    title.style.setProperty('--scroll-x', `-${overflow + 10}px`);
                    title.classList.add('auto-scroll');
                }
            };
            entry.onmouseleave = () => {
                title.classList.remove('auto-scroll');
            };
        });
    };
    setupAutoScroll();

    if (hasMore) {
        const btn = document.createElement('button');
        btn.className = 'show-more-btn';
        btn.textContent = 'SHOW ALL';
        btn.onclick = () => {
            container.innerHTML = renderItems(data);
            setupAutoScroll(); // 重新綁定新產生的項目
            btn.remove();
        };
        container.after(btn);
    }
}

window.toggleMenu = () => { document.getElementById('side-menu').classList.toggle('open'); document.getElementById('side-menu-overlay').classList.toggle('hidden'); };
function renderMenu(tickets) {
    const menu = document.getElementById('menu-content'); 
    const nav = document.getElementById('menu-nav');
    menu.innerHTML = '';
    nav.innerHTML = '';

    const years = {}; 
    tickets.forEach(t => { 
        const y = cleanDate(t.date).split('-')[0]; 
        if (!years[y]) years[y] = []; 
        years[y].push(t); 
    });

    const sortedYears = Object.keys(years).sort((a,b)=>b-a);

    sortedYears.forEach(y => {
        // 1. 產生導覽列按鈕
        const navLink = document.createElement('div');
        navLink.className = 'nav-year-link';
        navLink.textContent = y;
        navLink.onclick = () => {
            const target = document.getElementById(`menu-year-${y}`);
            if (target) {
                // 計算 target 相對於 menu (捲動容器) 的位置
                const topPos = target.getBoundingClientRect().top - menu.getBoundingClientRect().top + menu.scrollTop;
                menu.scrollTo({
                    top: topPos - 20,
                    behavior: 'smooth'
                });
            }
        };
        nav.appendChild(navLink);

        // 2. 產生年份群組
        const div = document.createElement('div'); 
        div.className = 'menu-group'; 
        div.innerHTML = `<div class="menu-year" id="menu-year-${y}">${y}</div>`;
        
        years[y].forEach(t => {
            const item = document.createElement('div'); 
            item.className = 'menu-item'; 
            item.onclick = () => { toggleMenu(); showSingleTicket(t.id); };
            const info = getDisplayName(t);
            item.innerHTML = `<div class="menu-artist ${info.isType ? 'is-type' : ''}">${info.name}</div><div class="menu-tour">${t.tour_title}</div>`; 
            div.appendChild(item);
        });
        menu.appendChild(div);
    });
}

function showSingleTicket(id) { switchTab('list'); document.querySelectorAll('.ticket').forEach(el => el.style.display = el.id === `ticket-${id}` ? 'flex' : 'none'); document.getElementById('back-btn-container').style.display = 'block'; }
window.showAllTickets = () => { document.querySelectorAll('.ticket').forEach(el => el.style.display = 'flex'); document.getElementById('back-btn-container').style.display = 'none'; };

window.openDetail = function(id) {
    const rawT = allTickets.find(x => x.id === id); if (!rawT) return;
    
    const t = {};
    Object.keys(rawT).forEach(k => { t[k.trim().toLowerCase()] = rawT[k]; });

    const typeLabelJP = TYPE_MAP_JP[rawT.type] || 'イベント';
    const seatDisplay = t.seat_info || rawT.seat_info || '-';
    const setlistDisplay = t.setlist || rawT.setlist || '';
    const hasLatLng = rawT.lat_lng && rawT.lat_lng.trim() !== '';
    const ticketImg = t.ticket_image || rawT.ticket_image || '';

    // 重置翻轉狀態
    modal.querySelector('.modal-content').classList.remove('flipped');

    modalBody.innerHTML = `
        <div class="modal-flipper">
            <!-- 正面：詳細資訊 -->
            <div class="modal-front">
                <div class="modal-hero-img" style="background-image: url('${rawT.images || ''}')"></div>
                <div class="modal-text-content">
                    <h2 style="color:var(--text-accent); font-family:'Anton'; font-size:2.2rem;">${rawT.tour_title}</h2><h3 style="color:#aaa; font-size:1.2rem; margin-top:0;">${rawT.artist}</h3>
                    ${rawT.artist_list ? `<div style="margin:1rem 0; background:#1a1a1a; padding:15px; border-left:3px solid var(--text-accent);"><strong style="color:var(--text-accent);">出演者</strong><br>${rawT.artist_list}</div>` : ''}
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin: 1.5rem 0;">
                        <div><strong style="color:var(--text-accent);">公演種別:</strong> ${typeLabelJP}</div>
                        <div><strong style="color:var(--text-accent);">公演日:</strong> ${cleanDate(rawT.date)}</div>
                        <div><strong style="color:var(--text-accent);">開演:</strong> ${cleanTime(rawT.time)}</div>
                        <div><strong style="color:var(--text-accent);">料金:</strong> ${formatPrice(rawT.ticket_price, rawT.currency)}</div>
                        <div><strong style="color:var(--text-accent);">座席:</strong> ${seatDisplay}</div>
                        <div style="grid-column:span 2;"><strong style="color:var(--text-accent);">会場:</strong> ${rawT.venue_name}</div>
                    </div>
                    <hr style="border:0; border-top:1px dashed #444; margin: 1.5rem 0;"><h4 style="color:var(--text-accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">SETLIST / セットリスト</h4>
                    <div class="setlist-container" style="background:#0a0a0a; padding:20px; border:1px solid #222; font-family:monospace; max-height:250px; overflow-y:auto; color:#bbb; line-height:1.6; white-space: pre-wrap;">${setlistDisplay ? setlistDisplay : 'No setlist available.'}</div>
                    ${hasLatLng ? '<div id="detail-map" style="height:250px; margin-top:20px; border-radius:8px; border:1px solid #333;"></div>' : ''}
                    
                    ${adminPassword ? `
                        <button onclick="showAdminForm(${JSON.stringify(rawT).replace(/"/g, '&quot;')})" style="width:100%; margin-top:20px; background:#111; border:1px solid #333; color:#666; padding:10px; cursor:pointer; font-family:'Bebas Neue'; letter-spacing:1px; border-radius:4px;">
                            EDIT THIS RECORD
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- 背面：票券圖片 -->
            <div class="modal-back">
                <div class="modal-text-content" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start;">
                    <h2 style="color:var(--text-accent); font-family:'Bebas Neue'; margin-bottom:20px; flex-shrink:0;">TICKET STUB</h2>
                    
                    <div class="ticket-image-container">
                        ${ticketImg ? 
                            `<img src="${ticketImg}" class="ticket-img-preview">` : 
                            `<div class="no-ticket-msg">No ticket image uploaded.</div>`
                        }
                    </div>

                    <div style="margin-top:auto; padding-top:20px; color:#666; font-size:0.8rem; font-family:monospace; text-align:center; flex-shrink:0;">
                        ${rawT.tour_title}<br>
                        ${rawT.id}
                    </div>
                </div>
            </div>
        </div>

        <!-- 翻轉按鈕 -->
        <button class="flip-toggle-btn" onclick="document.querySelector('.modal-content').classList.toggle('flipped')">
            <i data-lucide="ticket"></i>
        </button>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
    setTimeout(() => {
        if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
        if (hasLatLng) { 
            const [la, ln] = rawT.lat_lng.split(',').map(Number); 
            detailMapInstance = L.map('detail-map', { zoomControl: false }).setView([la, ln], 16); 
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(detailMapInstance); 
            
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div class='custom-marker-pin'></div>",
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -40]
            });

            const marker = L.marker([la, ln], { icon: customIcon }).addTo(detailMapInstance);
            marker.bindPopup(`<strong style="color:white;">${rawT.venue_name}</strong>`).openPopup();
        }
    }, 300);
}

window.closeModal = () => modal.classList.add('hidden');
window.openLogin = () => { 
    // 如果選單是開啟狀態，則關閉它
    if (document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }
    document.getElementById('login-modal').classList.remove('hidden'); 
    document.getElementById('admin-pass').focus(); 
};
window.checkLogin = () => { const pass = document.getElementById('admin-pass').value; if (pass.length > 0) { adminPassword = pass; document.getElementById('login-modal').classList.add('hidden'); showAdminForm(); } }

function showAdminForm(editData = null) {
    // 重置翻轉狀態，避免開啟表單時是翻轉的
    modal.querySelector('.modal-content').classList.remove('flipped');
    
    // 如果是編輯模式，預設里程碑處理
    const ms = editData ? (editData.is_first_time || '').toString().split(/[、,]+/).map(s => s.trim()) : [];

    modalBody.innerHTML = `
        <div class="modal-front" style="padding: 2rem; box-sizing: border-box;">
            <h2 style="color:var(--text-accent); font-family:'Bebas Neue'; margin-bottom:1.5rem; font-size:2rem; letter-spacing:1px;">
                ${editData ? 'EDIT TICKET' : 'ADD NEW TICKET'}
            </h2>
            <form id="admin-form" onsubmit="event.preventDefault(); handleSave();" style="display:flex; flex-direction:column; gap:15px;">
                <input type="hidden" name="id" value="${editData ? editData.id : ''}">
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;"><label>日期</label><input type="date" name="date" required style="width:100%;" value="${editData ? cleanDate(editData.date) : ''}"></div>
                    <div style="flex:1;"><label>時間</label><input type="time" name="time" style="width:100%;" value="${editData ? cleanTime(editData.time) : '19:00'}"></div>
                </div>
                <div style="display:flex; gap:12px;">
                    <div style="flex:1;"><label>活動類型</label><select name="type" style="width:100%;">
                        <option value="ONE_MAN" ${editData?.type==='ONE_MAN'?'selected':''}>專場演唱會</option>
                        <option value="FES" ${editData?.type==='FES'?'selected':''}>音樂祭 / 拼盤</option>
                        <option value="VIEWING" ${editData?.type==='VIEWING'?'selected':''}>院線直播 (LV)</option>
                        <option value="ONLINE" ${editData?.type==='ONLINE'?'selected':''}>線上直播</option>
                        <option value="SIGNING" ${editData?.type==='SIGNING'?'selected':''}>簽名會</option>
                        <option value="FAN_MEETING" ${editData?.type==='FAN_MEETING'?'selected':''}>見面會</option>
                        <option value="EVENT" ${editData?.type==='EVENT'?'selected':''}>展覽 / 活動</option>
                        <option value="SPORTS" ${editData?.type==='SPORTS'?'selected':''}>運動賽事</option>
                    </select></div>
                    <div style="flex:1;"><label>狀態</label><select name="status" style="width:100%;">
                        <option value="CONFIRMED" ${editData?.status==='CONFIRMED'?'selected':''}>參戰確定</option>
                        <option value="COMPLETED" ${editData?.status==='COMPLETED'?'selected':''}>已結束</option>
                        <option value="APPLIED" ${editData?.status==='APPLIED'?'selected':''}>抽選中</option>
                        <option value="WON" ${editData?.status==='WON'?'selected':''}>當選</option>
                        <option value="LOST" ${editData?.status==='LOST'?'selected':''}>落選</option>
                    </select></div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>主要藝人 (Artist)</label><input type="text" name="artist" placeholder="例如: YOASOBI" required value="${editData ? editData.artist : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>出演者名單 (用、隔開)</label><input type="text" name="artist_list" placeholder="例如: 藝人A、藝人B" value="${editData ? (editData.artist_list || '') : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>巡迴/活動標題</label><input type="text" name="tour_title" placeholder="例如: ASIA TOUR 2024" required value="${editData ? editData.tour_title : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>會場名稱</label><input type="text" name="venue_name" placeholder="例如: 台北小巨蛋" required value="${editData ? editData.venue_name : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>經緯度 (Map Coords)</label><input type="text" name="lat_lng" placeholder="例如: 25.051, 121.550" value="${editData ? (editData.lat_lng || '') : ''}"></div>
                
                <div style="display:flex; gap:10px;">
                    <div style="width:100px;"><label>幣別</label><select name="currency" style="width:100%;">
                        <option value="TWD" ${editData?.currency==='TWD'?'selected':''}>TWD</option>
                        <option value="JPY" ${editData?.currency==='JPY'?'selected':''}>JPY</option>
                    </select></div>
                    <div style="flex:1;"><label>票價</label><input type="number" name="ticket_price" placeholder="票價" style="width:100%;" value="${editData ? editData.ticket_price : ''}"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;"><label>座席資訊</label><input type="text" name="seat_info" placeholder="例如: 特區 B2排 12號" value="${editData ? (editData.seat_info || '') : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>歌單 (Setlist)</label><textarea name="setlist" placeholder="請輸入歌單..." rows="5">${editData ? (editData.setlist || '') : ''}</textarea></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>封面圖片網址</label><input type="text" name="images" placeholder="https://..." value="${editData ? (editData.images || '') : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>票券圖片網址</label><input type="text" name="ticket_image" placeholder="https://..." value="${editData ? (editData.ticket_image || '') : ''}"></div>
                
                <div style="background:#1a1a1a; padding:15px; border-radius:8px; margin-top:5px; border:1px solid #333;">
                    <label style="display:block; margin-bottom:12px; font-weight:bold; color:var(--text-accent); font-size:0.9rem; letter-spacing:1px;">MILESTONES / 紀念紀錄</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="ARTIST" ${ms.includes('ARTIST')?'checked':''}> 初参戦</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="EXPEDITION" ${ms.includes('EXPEDITION')?'checked':''}> 初遠征</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="VENUE" ${ms.includes('VENUE')?'checked':''}> 初会場</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="EVENT" ${ms.includes('EVENT')?'checked':''}> 初參加</label>
                    </div>
                </div>

                <button type="submit" id="save-btn" style="background:var(--text-accent); color:black; padding:15px; font-weight:bold; font-family:'Bebas Neue'; border:none; margin-top:10px; font-size:1.2rem; cursor:pointer; border-radius:4px; transition:all 0.3s;">
                    ${editData ? 'UPDATE TICKET' : 'SAVE TICKET'}
                </button>
            </form>
        </div>
    `;
    modal.classList.remove('hidden');
}

window.handleSave = async function() {
    if (!GAS_API_URL) { alert('請先設定 GAS_API_URL'); return; }
    const saveBtn = document.getElementById('save-btn'); saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
    const form = document.getElementById('admin-form'); const formData = new FormData(form); const data = {};
    formData.forEach((val, key) => {
        if (key !== 'milestone') data[key] = val;
    });
    
    // 收集所有勾選的里程碑
    const milestones = [];
    form.querySelectorAll('input[name="milestone"]:checked').forEach(cb => milestones.push(cb.value));
    data.is_first_time = milestones.join(',');

    try { await fetch(GAS_API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ password: adminPassword, data: data }) }); alert('紀錄已送出！'); closeModal(); location.reload(); } catch (e) { alert('儲存失敗：' + e.toString()); saveBtn.disabled = false; saveBtn.textContent = 'SAVE TICKET'; }
}

window.onclick = (e) => { if (e.target == modal || e.target == document.getElementById('login-modal')) closeModal(); };
