// CONFIGURATION
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzNorFaLtMtIRlK7T7UlYCRjkEu06MZEyFWgeosQui4omJSjUnYD6AOo_xW2TfG67vo/exec'; 

// MOCK DATA
const MOCK_DATA = [
    { id: '1', date: '2025-01-12', time: '18:30', type: 'ONE_MAN', status: 'CONFIRMED', artist: 'YOASOBI', tour_title: 'ASIA TOUR 2024-2025 “超現實”', venue_name: '台北小巨蛋', lat_lng: '25.051, 121.550', seat_info: '特區 B2排', ticket_price: '4800', currency: 'TWD', is_first_time: true, setlist: '1. 祝福\n2. 夜に駆ける\n3. 勇者\n4. アイドル', images: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500' }
];

const TYPE_MAP_PRO = { 'ONE_MAN': 'LIVE', 'FES': 'FES', 'VIEWING': 'VIEWING', 'ONLINE': 'ONLINE', 'SIGNING': 'EVENT', 'FAN_MEETING': 'EVENT', 'EVENT': 'EVENT', 'SPORTS': 'SPORTS' };
const TYPE_MAP_JP = { 'ONE_MAN': 'ワンマンライブ', 'FES': 'FES / 対バン', 'VIEWING': 'ライブビューイング', 'ONLINE': 'オンライン配信', 'SIGNING': 'サイン会', 'FAN_MEETING': 'ファンミーティング', 'EVENT': '展示会 / イベント', 'SPORTS': 'スポーツ / 試合' };

let allTickets = [];
let currentFilterCategory = 'date'; // date, artist, status, milestone
let currentFilterValue = 'ALL';
let showAllArtists = false;
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
    setupStatsSwitcher();
    setupCategorySwitcher();
    setupScrollTop();
    setupScrollTimeline(); // 初始化時間軸指示器
});

// --- UTILITIES ---
function setupScrollTimeline() {
    const timeline = document.getElementById('scroll-timeline');
    const yearText = document.getElementById('scroll-year-text');
    const prevText = document.getElementById('scroll-year-prev');
    const nextText = document.getElementById('scroll-year-next');
    let scrollTimeout;

    window.addEventListener('scroll', () => {
        if (!listView.classList.contains('active')) {
            timeline.classList.remove('visible');
            return;
        }
        
        const tickets = document.querySelectorAll('.ticket');
        let currentYear = "";
        const detectBuffer = window.innerHeight * 0.3;

        for (let t of tickets) {
            const rect = t.getBoundingClientRect();
            if (rect.top >= -200 && rect.top <= window.innerHeight) {
                currentYear = t.getAttribute('data-year');
                if (rect.top < detectBuffer) continue; 
                break;
            }
        }

        if (currentYear) {
            const yearNum = parseInt(currentYear);
            yearText.textContent = currentYear;
            prevText.textContent = yearNum + 1; // 上方顯示較新的年份 (因為最新在頂部)
            nextText.textContent = yearNum - 1; // 下方顯示較舊的年份 (因為舊的在底部)
            
            timeline.classList.add('visible');
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                timeline.classList.remove('visible');
            }, 1000); 
        } else {
            timeline.classList.remove('visible');
        }
    }, { passive: true });
}
function setupScrollTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}
function setupCategorySwitcher() {
    const btns = document.querySelectorAll('.cat-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilterCategory = btn.dataset.cat;
            currentFilterValue = 'ALL';
            renderFilterBar();
            filterTickets();
        };
    });
}
function setupStatsSwitcher() {
    const btns = document.querySelectorAll('.switcher-btn');
    const container = document.querySelector('.stats-container');
    
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.stats;
            container.classList.remove('active-artist', 'active-venue');
            container.classList.add(`active-${type}`);
            
            // 如果切換時圖表跑掉，可以觸發 resize (Chart.js 自動處理)
        };
    });
}
function setupYearScroll() {
    let isDown = false;
    let startX;
    let scrollLeft;

    window.updateYearFilterMask = () => {
        const scrollLeftVal = yearFilterContainer.scrollLeft;
        const maxScroll = yearFilterContainer.scrollWidth - yearFilterContainer.clientWidth;
        
        // 如果沒有東西可以捲動，則不套用任何遮罩
        if (maxScroll <= 10) {
            yearFilterContainer.style.webkitMaskImage = 'none';
            yearFilterContainer.style.maskImage = 'none';
            return;
        }

        const showLeftFade = scrollLeftVal > 15;
        const showRightFade = scrollLeftVal < maxScroll - 15;

        let mask = '';
        if (showLeftFade && showRightFade) {
            mask = 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)';
        } else if (showLeftFade) {
            mask = 'linear-gradient(to right, transparent 0%, black 12%, black 100%)';
        } else if (showRightFade) {
            mask = 'linear-gradient(to right, black 88%, transparent 100%)';
        } else {
            mask = 'none';
        }

        yearFilterContainer.style.webkitMaskImage = mask;
        yearFilterContainer.style.maskImage = mask;
    };

    // 監聽捲動事件
    yearFilterContainer.addEventListener('scroll', window.updateYearFilterMask);
    
    // 初始執行一次 (稍微延遲確保寬度計算準確)
    setTimeout(window.updateYearFilterMask, 500);

    // 滑鼠滾輪轉水平捲動
    yearFilterContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            yearFilterContainer.scrollLeft += e.deltaY;
            updateMask();
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
        updateMask();
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
    const filterBar = document.querySelector('.filter-categories');
    
    try {
        // 鎖定導覽列與篩選列
        navBar.classList.add('nav-locked');
        menuBtn.classList.add('nav-locked');
        if (filterBar) filterBar.classList.add('nav-locked');

        if (!GAS_API_URL) { renderApp(MOCK_DATA); return; }
        const res = await fetch(GAS_API_URL);
        const rawData = await res.json();
        
        // 過濾無效的空白紀錄 (必須要有 ID 且 ID 不為空)
        const validData = (rawData && rawData.length > 0) 
            ? rawData.filter(t => t.id && String(t.id).trim() !== '') 
            : MOCK_DATA;

        renderApp(validData);
    } catch (e) { 
        renderApp(MOCK_DATA); 
    } finally {
        // 解鎖導覽列與篩選列
        navBar.classList.remove('nav-locked');
        menuBtn.classList.remove('nav-locked');
        if (filterBar) filterBar.classList.remove('nav-locked');
    }
}

function renderApp(data) {
    allTickets = data;
    const loadingEl = document.getElementById('loading'); 
    if (loadingEl) loadingEl.style.display = 'none';
    
    renderFilterBar(); 
    // 改為呼叫 filterTickets 確保套用預設過濾邏輯 (隱藏失敗紀錄)
    filterTickets(); 
    renderMenu(data);
}

function renderFilterBar() {
    yearFilterContainer.innerHTML = '';
    const addonContainer = document.getElementById('filter-addon');
    addonContainer.innerHTML = '';
    let values = ['ALL'];

    if (currentFilterCategory === 'date') {
        values = ['ALL', ...new Set(allTickets.map(t => cleanDate(t.date).split('-')[0]))].sort((a,b) => b==='ALL'?-1:b-a);
    } else if (currentFilterCategory === 'artist') {
        // 1. 整合主要藝人與出演名單
        const counts = {};
        allTickets.forEach(t => {
            const eventArtists = new Set();
            if (t.artist) eventArtists.add(t.artist.trim());
            if (t.artist_list) {
                t.artist_list.split(/[、,]+/).forEach(a => {
                    const name = a.trim();
                    if (name) eventArtists.add(name);
                });
            }
            eventArtists.forEach(name => {
                counts[name] = (counts[name] || 0) + 1;
            });
        });

        // 2. 排序與過濾
        const sortedArtists = Object.entries(counts).sort((a,b) => b[1] - a[1]);
        
        // 3. 判斷是否需要「顯示全部」切換鈕
        const hasManyOneTimers = sortedArtists.some(a => a[1] === 1);
        if (hasManyOneTimers) {
            const toggle = document.createElement('button');
            toggle.className = `show-all-toggle ${showAllArtists ? 'active' : ''}`;
            toggle.textContent = showAllArtists ? 'HIDE 1-TIME ARTISTS' : 'SHOW ALL ARTISTS';
            toggle.onclick = () => { showAllArtists = !showAllArtists; renderFilterBar(); };
            addonContainer.appendChild(toggle);
        }

        // 4. 根據狀態決定顯示的名單 (頻率排序)
        const finalArtists = showAllArtists ? sortedArtists : sortedArtists.filter(a => a[1] > 1 || a[0] === currentFilterValue);
        
        // 如果開啟了 showAllArtists，則顯示次數標註，否則只顯示名稱
        values = ['ALL', ...finalArtists.map(a => showAllArtists ? `${a[0]} (${a[1]})` : a[0])];
    } else if (currentFilterCategory === 'status') {
        values = ['ALL', 'CONFIRMED', 'COMPLETED', 'APPLIED', 'FAILED'];
    } else if (currentFilterCategory === 'milestone') {
        values = ['ALL', 'ARTIST', 'EXPEDITION', 'VENUE', 'EVENT'];
    }

    values.forEach(val => {
        const chip = document.createElement('div');
        let realVal = val;
        let displayVal = val;

        // 如果 val 包含次數標註 (例如 "Artist (3)")，則提取真實名稱
        if (currentFilterCategory === 'artist' && val !== 'ALL' && val.includes(' (')) {
            realVal = val.substring(0, val.lastIndexOf(' ('));
        }

        chip.className = `year-chip ${realVal === currentFilterValue ? 'active' : ''}`;
        
        if (currentFilterCategory === 'status') {
            const map = { 
                'CONFIRMED': '參戰確定', 
                'COMPLETED': '參戰完畢', 
                'APPLIED': '抽選中',
                'FAILED': '未成行'
            };
            displayVal = map[val] || val;
        } else if (currentFilterCategory === 'milestone') {
            const map = { 'ARTIST': '初参戦', 'EXPEDITION': '初遠征', 'VENUE': '初会場', 'EVENT': '初參加' };
            displayVal = map[val] || val;
        }

        chip.textContent = displayVal;
        chip.onclick = () => { 
            currentFilterValue = realVal; 
            document.querySelectorAll('.year-chip').forEach(c=>c.classList.remove('active')); 
            chip.classList.add('active'); 
            filterTickets(); 
        };
        yearFilterContainer.appendChild(chip);
    });

    // 渲染完畢後主動觸發遮罩更新
    if (window.updateYearFilterMask) {
        setTimeout(window.updateYearFilterMask, 50);
    }
}

function filterTickets() {
    // 增加過場感：先清空再重新顯示
    ticketContainer.style.opacity = '0';
    setTimeout(() => {
        let filtered = allTickets;

        // 核心優化：在 YEAR, ARTIST 和 MILESTONE 類別下，預設排除「落選」與「搶票失敗」
        if (currentFilterCategory === 'date' || currentFilterCategory === 'artist' || currentFilterCategory === 'milestone') {
            filtered = allTickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET');
        }

        if (currentFilterValue !== 'ALL') {
            if (currentFilterCategory === 'date') {
                filtered = filtered.filter(t => cleanDate(t.date).startsWith(currentFilterValue));
            } else if (currentFilterCategory === 'artist') {
                filtered = filtered.filter(t => {
                    const list = (t.artist_list || '').split(/[、,]+/).map(s => s.trim());
                    return (t.artist === currentFilterValue) || list.includes(currentFilterValue);
                });
            } else if (currentFilterCategory === 'status') {
                if (currentFilterValue === 'FAILED') {
                    filtered = allTickets.filter(t => t.status === 'FAILED_DRAW' || t.status === 'FAILED_TICKET');
                } else {
                    filtered = allTickets.filter(t => t.status === currentFilterValue);
                }
            } else if (currentFilterCategory === 'milestone') {
                filtered = allTickets.filter(t => (t.is_first_time || '').includes(currentFilterValue));
            }
        }
        renderTickets(filtered);
        ticketContainer.style.opacity = '1';
        ticketContainer.classList.add('animate-fade');
    }, 200);
}

const MILESTONE_MAP = {
    'ARTIST': { label: '初参戦', class: 'badge-artist', icon: 'mic-2' },
    'EXPEDITION': { label: '初遠征', class: 'badge-expedition', icon: 'plane' },
    'VENUE': { label: '初会場', class: 'badge-venue', icon: 'map-pin' },
    'EVENT': { label: '初參加', class: 'badge-event', icon: 'star' }
};

function renderTickets(tickets) {
    ticketContainer.innerHTML = '';
    const sorted = [...tickets].sort((a,b) => new Date(cleanDate(b.date)) - new Date(cleanDate(a.date)));
    
    sorted.forEach((t, index) => {
        let statusClass = '';
        let statusText = '';
        switch(t.status) {
            case 'APPLIED': statusClass = 'status-applied'; statusText = '抽選中 / 待搶票'; break;
            case 'CONFIRMED': statusClass = 'status-confirmed'; statusText = '參戰確定'; break;
            case 'COMPLETED': statusClass = 'status-completed'; statusText = '<i data-lucide="check-circle-2" style="width:12px; vertical-align:middle;"></i> 參戰完畢'; break;
            case 'FAILED_DRAW': statusClass = 'status-failed'; statusText = '落選'; break;
            case 'FAILED_TICKET': statusClass = 'status-failed'; statusText = '搶票失敗'; break;
            default: statusClass = 'status-confirmed'; statusText = '參戰確定'; break;
        }
        const proLabel = TYPE_MAP_PRO[t.type] || 'LIVE';
        
        // 處理里程碑標籤
        let badgesHtml = '';
        if (t.is_first_time) {
            const rawMilestones = t.is_first_time.toString().split(/[、,]+/).map(s => s.trim());
            const uniqueMilestones = new Set();
            
            rawMilestones.forEach(m => {
                if (m === 'true' || m === '1' || m === 'ARTIST') uniqueMilestones.add('ARTIST');
                else if (MILESTONE_MAP[m]) uniqueMilestones.add(m);
            });

            if (uniqueMilestones.size > 0) {
                badgesHtml = `<div class="badge-container">`;
                Object.keys(MILESTONE_MAP).forEach(key => {
                    if (uniqueMilestones.has(key)) {
                        const info = MILESTONE_MAP[key];
                        badgesHtml += `<div class="badge-item ${info.class}"><span>${info.label}</span></div>`;
                    }
                });
                badgesHtml += `</div>`;
            }
        }

        const card = document.createElement('div');
        const ticketYear = cleanDate(t.date).split('-')[0];
        card.className = `ticket ${statusClass} animate-up`;
        card.style.animationDelay = `${index * 0.08}s`;
        card.id = `ticket-${t.id}`;
        card.setAttribute('data-year', ticketYear); // 注入年份屬性
        card.innerHTML = `
            ${badgesHtml}
            <div class="ticket-info-left" onclick="openDetail('${t.id}')">
                <div class="ticket-header">
                    <div class="ticket-logo">${proLabel}</div>
                    <div class="status-badge">${statusText}</div>
                </div>
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
    
    if (tab === 'list') { 
        listTab.classList.add('active'); 
        listView.classList.add('active');
        // 回到列表時捲動回頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    else if (tab === 'map') { 
        mapTab.classList.add('active'); 
        mapView.classList.add('active'); 
        setTimeout(initMap, 200); 
    }
    else if (tab === 'stats') { 
        statsTab.classList.add('active'); 
        statsView.classList.add('active'); 
        setTimeout(() => {
            initStats();
            // 手機版自動下捲到統計區塊頂部
            if (window.innerWidth <= 600) {
                const statsOffset = statsView.offsetTop - 10;
                window.scrollTo({ top: statsOffset, behavior: 'smooth' });
            }
        }, 200); 
    }
}

function initMap() {
    if (mapInstance) return;
    // 設定中心點約在沖繩附近，並調整縮放級別為 4，以同時涵蓋台灣與日本
    mapInstance = L.map('map').setView([30.0, 130.0], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', maxZoom: 19 }).addTo(mapInstance);
    
    // 按經緯度群組活動 (排除失敗狀態)
    const venueGroups = {};
    allTickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET').forEach(t => {
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
        if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET'].includes(t.status)) return; 

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
    const limit = 10;
    const hasMore = data.length > limit;
    
    const renderItems = (items) => items.map(i => {
        const name = i[0];
        const count = i[1];
        
        // 篩選與該藝人/場地相關的所有場次
        const relatedEvents = allTickets.filter(t => {
            if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET'].includes(t.status)) return false;
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

window.toggleMenu = () => { 
    const sideMenu = document.getElementById('side-menu');
    const isOpen = sideMenu.classList.toggle('open');
    document.getElementById('side-menu-overlay').classList.toggle('hidden'); 
    toggleBodyScroll(isOpen);
};
function renderMenu(tickets) {
    const menu = document.getElementById('menu-content'); 
    const nav = document.getElementById('menu-nav');
    menu.innerHTML = '';
    nav.innerHTML = '';

    const years = {}; 
    tickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET').forEach(t => { 
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

function showSingleTicket(id) { 
    // 1. 強制重置類別與值為日期/ALL，確保標籤 UI 正確
    currentFilterCategory = 'date';
    currentFilterValue = 'ALL';
    
    // 更新類別按鈕視覺
    const catBtns = document.querySelectorAll('.cat-btn');
    catBtns.forEach(b => {
        if (b.dataset.cat === 'date') b.classList.add('active');
        else b.classList.remove('active');
    });

    // 更新標籤列視覺
    renderFilterBar();

    // 2. 重新渲染完整列表
    renderTickets(allTickets);

    // 3. 執行分頁切換與單張顯示
    switchTab('list'); 
    
    // 稍微延遲確保 DOM 渲染完成
    setTimeout(() => {
        const targetId = `ticket-${id}`;
        document.querySelectorAll('.ticket').forEach(el => {
            el.style.display = el.id === targetId ? 'flex' : 'none';
        });
        document.getElementById('back-btn-container').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
}

window.showAllTickets = () => { 
    document.querySelectorAll('.ticket').forEach(el => el.style.display = 'flex'); 
    document.getElementById('back-btn-container').style.display = 'none'; 
    // 回到完整列表後捲動回頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- BODY SCROLL LOCK ---
function toggleBodyScroll(lock) {
    if (lock) {
        document.body.classList.add('no-scroll');
    } else {
        document.body.classList.remove('no-scroll');
    }
}

window.openDetail = function(id) {
    window.currentDetailId = id; // 儲存目前正在觀看的票券 ID
    const rawT = allTickets.find(x => x.id === id); if (!rawT) return;
    
    const t = {};
    Object.keys(rawT).forEach(k => { t[k.trim().toLowerCase()] = rawT[k]; });

    const typeLabelJP = TYPE_MAP_JP[rawT.type] || 'イベント';
    const seatDisplay = t.seat_info || rawT.seat_info || '-';
    const setlistDisplay = t.setlist || rawT.setlist || '';
    const hasLatLng = rawT.lat_lng && rawT.lat_lng.trim() !== '';
    const ticketImg = t.ticket_image || rawT.ticket_image || '';
    const statusMap = { 
        'APPLIED': '抽選中 / 待搶票', 
        'CONFIRMED': '參戰確定', 
        'COMPLETED': '參戰完畢',
        'FAILED_DRAW': '落選',
        'FAILED_TICKET': '搶票失敗'
    };
    const statusText = statusMap[rawT.status] || '參戰確定';
    const isFailed = rawT.status === 'FAILED_DRAW' || rawT.status === 'FAILED_TICKET';

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
                    <div class="modal-meta-grid">
                        <div class="modal-meta-item"><strong>狀態</strong><span>${statusText}</span></div>
                        <div class="modal-meta-item"><strong>公演種別</strong><span>${typeLabelJP}</span></div>
                        <div class="modal-meta-item"><strong>公演日</strong><span>${cleanDate(rawT.date)}</span></div>
                        <div class="modal-meta-item"><strong>開演</strong><span>${cleanTime(rawT.time)}</span></div>
                        ${!isFailed ? `
                            <div class="modal-meta-item"><strong>料金</strong><span>${formatPrice(rawT.ticket_price, rawT.currency)}</span></div>
                            <div class="modal-meta-item"><strong>座席</strong><span>${seatDisplay}</span></div>
                        ` : ''}
                        <div class="modal-meta-item" style="grid-column:span 2;"><strong>会場</strong><span>${rawT.venue_name}</span></div>
                    </div>

                    ${!isFailed ? `
                        <hr style="border:0; border-top:1px dashed #444; margin: 1.5rem 0;"><h4 style="color:var(--text-accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">SETLIST & MEMO / セトリ・參戰紀錄</h4>
                        <div class="setlist-container" style="background:#0a0a0a; padding:20px; border:1px solid #222; font-family:monospace; max-height:250px; overflow-y:auto; color:#bbb; line-height:1.6; white-space: pre-wrap;">${setlistDisplay ? setlistDisplay : 'No setlist available.'}</div>
                    ` : ''}

                    ${hasLatLng ? '<div id="detail-map" style="height:250px; margin-top:20px; border-radius:8px; border:1px solid #333;"></div>' : ''}
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

        <!-- 翻轉按鈕 (如果是失敗狀態則隱藏) -->
        ${!isFailed ? `
            <button class="flip-toggle-btn" onclick="document.querySelector('.modal-content').classList.toggle('flipped')">
                <i data-lucide="ticket"></i>
            </button>
        ` : ''}
    `;
    // 更新左上角 Admin 工具 (鎖頭或編輯按鈕)
    const adminTool = document.getElementById('modal-admin-tool');
    if (adminTool) {
        if (adminPassword) {
            adminTool.innerHTML = `
                <div onclick="showAdminForm(${JSON.stringify(rawT).replace(/"/g, '&quot;')})" style="background:var(--text-accent); color:black; padding:4px 12px; border-radius:4px; font-family:'Bebas Neue'; font-size:0.9rem; cursor:pointer; display:flex; align-items:center; gap:5px; box-shadow:0 0 10px rgba(0,0,0,0.5);">
                    <i data-lucide="edit-3" style="width:14px;"></i> EDIT
                </div>`;
        } else {
            adminTool.innerHTML = `
                <div onclick="openLogin()" style="opacity:0.2; cursor:pointer; color:white; padding:5px;">
                    <i data-lucide="lock" style="width:16px;"></i>
                </div>`;
        }
    }

    modal.classList.remove('hidden');
    toggleBodyScroll(true);
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

window.closeModal = () => {
    modal.classList.add('hidden');
    document.getElementById('login-modal').classList.add('hidden');
    const adminTool = document.getElementById('modal-admin-tool');
    if (adminTool) adminTool.innerHTML = ''; // 清除 Admin 工具
    toggleBodyScroll(false);
};

window.openLogin = () => { 
    // 如果選單是開啟狀態，則關閉它
    if (document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }
    document.getElementById('login-modal').classList.remove('hidden'); 
    document.getElementById('admin-pass').focus(); 
    toggleBodyScroll(true);
};

window.checkLogin = () => { 
    const pass = document.getElementById('admin-pass').value; 
    if (pass.length > 0) { 
        adminPassword = pass; 
        document.getElementById('login-modal').classList.add('hidden');
        
        // 切換為已登入狀態的 UI (側邊欄)
        const addBtn = document.getElementById('admin-add-btn');
        const entryText = document.getElementById('admin-entry-text');
        if (addBtn) addBtn.classList.remove('hidden');
        if (entryText) entryText.classList.add('hidden'); // 登入後隱藏原本的暗門字樣

        // 若光箱開啟中，重新渲染光箱以顯示編輯按鈕 (及更新左上角工具)
        const modalContent = document.getElementById('modal');
        if (!modalContent.classList.contains('hidden')) {
            if (window.currentDetailId) {
                openDetail(window.currentDetailId);
            }
        } else {
            // 否則重新開啟側邊選單，讓使用者看到新增按鈕
            if (!document.getElementById('side-menu').classList.contains('open')) {
                toggleMenu();
            }
        }
    } 
}

function showAdminForm(editData = null) {
    // 如果側邊選單是開啟狀態，則關閉它，避免擋住表單
    if (document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }

    // 重置翻轉狀態，避免開啟表單時是翻轉的
    modal.querySelector('.modal-content').classList.remove('flipped');
    
    // 提取現有場地與藝人資料供建議
    const venueMap = {};
    const artistCounts = {};
    allTickets.forEach(t => {
        if (t.venue_name && t.lat_lng) venueMap[t.venue_name] = t.lat_lng;
        
        // 統計所有藝人出現頻率 (包含單獨與名單內)
        const eventArtists = new Set();
        if (t.artist) eventArtists.add(t.artist.trim());
        if (t.artist_list) {
            t.artist_list.split(/[、,]+/).forEach(a => {
                const name = a.trim();
                if (name) eventArtists.add(name);
            });
        }
        eventArtists.forEach(name => {
            artistCounts[name] = (artistCounts[name] || 0) + 1;
        });
    });

    const venueOptions = Object.keys(venueMap).map(v => `<option value="${v}">`).join('');
    const sortedArtists = Object.entries(artistCounts).sort((a,b) => b[1] - a[1]);
    const artistOptions = sortedArtists.map(a => `<option value="${a[0]}">`).join('');
    
    // 產生前 12 名常用藝人標籤供快速新增
    const quickTags = sortedArtists.slice(0, 12).map(a => 
        `<span class="tag-chip" onclick="addArtistToField('artist_list', '${a[0].replace(/'/g, "\\'")}')">+ ${a[0]}</span>`
    ).join('');

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
                        <option value="COMPLETED" ${editData?.status==='COMPLETED'?'selected':''}>參戰完畢</option>
                        <option value="APPLIED" ${editData?.status==='APPLIED'?'selected':''}>抽選中 / 待搶票</option>
                        <option value="FAILED_DRAW" ${editData?.status==='FAILED_DRAW'?'selected':''}>落選</option>
                        <option value="FAILED_TICKET" ${editData?.status==='FAILED_TICKET'?'selected':''}>搶票失敗</option>
                    </select></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>主要藝人 (Artist)</label>
                    <input type="text" name="artist" list="artist-list" placeholder="專場請填此 (FES可留空)" value="${editData ? editData.artist : ''}">
                    <datalist id="artist-list">${artistOptions}</datalist>
                </div>

                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>出演者名單 (用、隔開)</label>
                    <input type="text" name="artist_list" placeholder="FES 或拼盤請填此" value="${editData ? (editData.artist_list || '') : ''}">
                    <div class="quick-add-tags">${quickTags}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>巡迴/活動標題</label><input type="text" name="tour_title" placeholder="例如: ASIA TOUR 2024" required value="${editData ? editData.tour_title : ''}"></div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>會場名稱</label>
                    <input type="text" name="venue_name" list="venue-list" placeholder="例如: 台北小巨蛋 (台北)" required value="${editData ? editData.venue_name : ''}" oninput="const coords = ${JSON.stringify(venueMap).replace(/"/g, '&quot;')}[this.value]; if(coords) document.querySelector('input[name=&quot;lat_lng&quot;]').value = coords;">
                    <datalist id="venue-list">${venueOptions}</datalist>
                </div>

                <div style="display:flex; flex-direction:column; gap:5px;"><label>經緯度 (Map Coords)</label><input type="text" name="lat_lng" placeholder="例如: 25.051, 121.550" value="${editData ? (editData.lat_lng || '') : ''}"></div>
                
                <div style="display:flex; gap:10px;">
                    <div style="width:100px;"><label>幣別</label><select name="currency" style="width:100%;">
                        <option value="TWD" ${editData?.currency==='TWD'?'selected':''}>TWD</option>
                        <option value="JPY" ${editData?.currency==='JPY'?'selected':''}>JPY</option>
                    </select></div>
                    <div style="flex:1;"><label>票價</label><input type="number" name="ticket_price" placeholder="票價" style="width:100%;" value="${editData ? editData.ticket_price : ''}"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;"><label>座席資訊</label><input type="text" name="seat_info" placeholder="例如: 特區 B2排 12號" value="${editData ? (editData.seat_info || '') : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>歌單&紀錄</label><textarea name="setlist" placeholder="請輸入歌單..." rows="5">${editData ? (editData.setlist || '') : ''}</textarea></div>
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
    toggleBodyScroll(true);
}

window.handleSave = async function() {
    if (!GAS_API_URL) { alert('請先設定 GAS_API_URL'); return; }
    const form = document.getElementById('admin-form'); 
    const formData = new FormData(form); 
    const data = {};
    formData.forEach((val, key) => {
        if (key !== 'milestone') data[key] = val;
    });

    // 智慧驗證：除非是活動、展覽或運動賽事，否則主要藝人與名單不能同時為空
    const skipArtistCheck = ['EVENT', 'SPORTS'].includes(data.type);
    if (!skipArtistCheck && !data.artist.trim() && !data.artist_list.trim()) {
        alert('請至少填寫「主要藝人」或「出演者名單」其中一項！');
        return;
    }

    const saveBtn = document.getElementById('save-btn'); 
    saveBtn.disabled = true; 
    saveBtn.textContent = 'Saving...';
    
    // 收集所有勾選的里程碑
    const milestones = [];
    form.querySelectorAll('input[name="milestone"]:checked').forEach(cb => milestones.push(cb.value));
    data.is_first_time = milestones.join(',');

    try { 
        await fetch(GAS_API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ password: adminPassword, data: data }) }); 
        alert('紀錄已送出！'); 
        closeModal(); 
        location.reload(); 
    } catch (e) { 
        alert('儲存失敗：' + e.toString()); 
        saveBtn.disabled = false; 
        saveBtn.textContent = 'SAVE TICKET'; 
    }
}

window.addArtistToField = function(fieldName, artistName) {
    const input = document.querySelector(`input[name="${fieldName}"]`);
    if (!input) return;
    
    let current = input.value.trim();
    if (!current) {
        input.value = artistName;
    } else {
        // 使用、或逗號拆分現有名單，檢查是否已存在
        const items = current.split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
        if (!items.includes(artistName)) {
            items.push(artistName);
            input.value = items.join('、');
        }
    }
    // 觸發閃爍效果提示已加入
    input.style.borderColor = 'var(--text-accent)';
    setTimeout(() => { input.style.borderColor = '#333'; }, 300);
}

window.onclick = (e) => { 
    if (e.target == modal || e.target == document.getElementById('login-modal')) {
        closeModal();
    }
};

