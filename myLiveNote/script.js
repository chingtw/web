// CONFIGURATION
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwzoQZigBBoFE-CLi406rD4H9XFg1oT6PZFERAVIcaWuMaCA64H26o7Digb7OMhKsBp/exec'
const MAPTILER_API_KEY = 'JbsYXpwxgNI7OFDQhBHS'; // 請填入您的 MapTiler API Key


// MOCK DATA
const MOCK_DATA = [
    { id: '1', date: '2025-01-12', time: '18:30', type: 'ONE_MAN', status: 'CONFIRMED', artist: 'YOASOBI', tour_title: 'ASIA TOUR 2024-2025 “超現實”', venue_name: '台北小巨蛋', lat_lng: '25.051, 121.550', seat_info: '特區 B2排', ticket_price: '4800', currency: 'TWD', is_first_time: true, setlist: '1. 祝福\n2. 夜に駆ける\n3. 勇者\n4. アイドル', images: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500' }
];

const TYPE_MAP_PRO = { 'ONE_MAN': 'LIVE', 'FES': 'FES', 'VIEWING': 'VIEWING', 'ONLINE': 'ONLINE', 'SIGNING': 'EVENT', 'FAN_MEETING': 'EVENT', 'GREETING': 'EVENT', 'EVENT': 'EVENT', 'EXHIBITION': 'EXHIBIT', 'STAGE': 'STAGE', 'SPORTS': 'SPORTS', 'SCREENING': 'SCREENING', 'SOUND_LEAK': 'OUTSIDE', 'HYBRID_LEAK': 'HYBRID' };
const TYPE_MAP_JP = { 'ONE_MAN': 'ワンマンライブ', 'FES': 'FES / 対バン', 'VIEWING': 'ライブビューイング', 'ONLINE': 'オンライン配信', 'SIGNING': 'サイン會', 'FAN_MEETING': 'ファンミーティング', 'GREETING': '挨拶 / 舞台挨拶', 'EVENT': 'イベント', 'EXHIBITION': '展示會', 'STAGE': '舞台劇 / 演劇', 'SPORTS': 'スポーツ / 試合', 'SCREENING': '映像上映', 'SOUND_LEAK': '音漏れ参戦 (場外)', 'HYBRID_LEAK': '音漏れ参戦 (配信同時視聴)' };

const ARTIST_RANKING_EXCLUDED_TYPES = {
    full: ['EXHIBITION', 'SCREENING'],
    inPerson: ['EXHIBITION', 'SCREENING', 'VIEWING', 'ONLINE', 'SOUND_LEAK', 'HYBRID_LEAK']
};
const ARTIST_NAME_COLLATOR = new Intl.Collator('ja-JP', { numeric: true, sensitivity: 'base' });
const TAIWAN_VENUE_REGIONS = new Set([
    '台北', '臺北', '新北', '桃園', '台中', '臺中', '台南', '臺南', '高雄',
    '基隆', '新竹', '苗栗', '彰化', '南投', '雲林', '嘉義', '屏東',
    '宜蘭', '花蓮', '台東', '臺東', '澎湖', '金門', '連江', '馬祖'
]);
const NON_OVERSEAS_VENUE_LABELS = new Set(['VRLIVE', 'LIVE配信']);

const MILESTONE_MAP = {
    'ARTIST': { label: '初參戰', class: 'badge-artist', icon: 'mic-2' },
    'EXPEDITION': { label: '初遠征', class: 'badge-expedition', icon: 'plane' },
    'VENUE': { label: '初会場', class: 'badge-venue', icon: 'map-pin' },
    'EVENT': { label: '初參加', class: 'badge-event', icon: 'star' }
};

let allTickets = [];
let venueConfig = [];
let allUsers = []; // 全域使用者快取
let currentFilterCategory = 'date'; // date, artist, status, milestone
let currentFilterValue = 'ALL';
let showAllArtists = false;
let is3DMode = true; // 預設啟用 3D 模式
let adminPassword = '';
let artistRankingMode = 'inPerson';
let artistRankingSort = 'count';
let venueRankingSort = 'count';
const LOGIN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小時

let mapInstance = null;
let detailMapInstance = null;
let artistChartInstance = null;
let venueChartInstance = null;
let typeChartInstance = null;

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
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u');
    const isSharedPortal = window.location.pathname.includes('shared.html') && !currentUser;

    // 1. 初始化登入狀態
    checkPersistentLogin();

    // 如果是在入口選擇頁面，跳過資料抓取，節省效能
    if (!isSharedPortal) {
        fetchData(); 
        fetchVenues(); 
        fetchUsers(); // 撈取夥伴名單
    }
    
    setupTabs(); 
    setupYearScroll();
    setupStatsSwitcher();
    setupArtistRankingModeSwitcher();
    setupCategorySwitcher(); // 補回分類按鈕監聽初始化
    setupScrollTop();
    setupScrollTimeline(); // 初始化時間軸指示器

    // 綁定 3D 票券滾動事件
    const tContainer = document.getElementById('ticket-container');
    if (tContainer) {
        tContainer.addEventListener('scroll', update3DScrollEffect, { passive: true });
        window.addEventListener('resize', update3DScrollEffect, { passive: true });
    }

    // 手機版進去後 LIST 預設不要顯示，按鈕也不要高亮
    if (window.innerWidth <= 600) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
    }

});

async function fetchUsers() {
    try {
        const res = await fetch(`${GAS_API_URL}?action=getUsers`);
        allUsers = await res.json();
        updateCalendarButtonsVisibility();
        if (window.currentDetailId && !document.getElementById('modal').classList.contains('hidden')) {
            const targetTicket = allTickets.find(t => String(t.id) === String(window.currentDetailId));
            if (targetTicket) updateModalAdminTool(targetTicket);
        }
    } catch (e) {
        console.error('Failed to fetch users:', e);
        allUsers = [];
    }
}

function checkUserHasCalendar(username) {
    const urlParams = new URLSearchParams(window.location.search);
    const u = username || urlParams.get('u') || 'ching';
    const found = allUsers.find(user => user.username === u);
    return !!(found && (found.has_calendar || (found.calendar_id && String(found.calendar_id).trim() !== '')));
}

function checkUserIsSubscribed(username) {
    const urlParams = new URLSearchParams(window.location.search);
    const u = username || urlParams.get('u') || 'ching';
    return localStorage.getItem(`livenote_cal_subscribed_${u}`) === 'true';
}

function updateCalendarButtonsVisibility() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';
    const calBtn = document.getElementById('cal-subscribe-btn');
    
    if (!calBtn) return;
    
    const hasCal = checkUserHasCalendar(currentUser);
    const isSubscribed = checkUserIsSubscribed(currentUser);
    
    // 訂閱日曆按鈕：要有登入且有 calendar_id 才顯示
    if (adminPassword && hasCal) {
        calBtn.classList.remove('hidden');
        if (isSubscribed) {
            calBtn.innerHTML = `<i data-lucide="calendar-check-2" style="width:12px; height:12px; color:#4caf50;"></i> 已訂閱日曆`;
            calBtn.style.borderColor = '#2e5a2e';
        } else {
            calBtn.innerHTML = `<i data-lucide="calendar" style="width:12px; height:12px;"></i> 訂閱日曆`;
            calBtn.style.borderColor = '#444';
        }
        if (window.lucide) lucide.createIcons({ nodes: [calBtn] });
    } else {
        calBtn.classList.add('hidden');
    }
}

function checkPersistentLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';
    
    // 使用者帳號綁定的 Key
    const saved = localStorage.getItem(`livenote_auth_${currentUser}`);
    
    if (saved) {
        try {
            const auth = JSON.parse(saved);
            const now = new Date().getTime();
            if (now < auth.expiry) {
                adminPassword = auth.pass;
                // 更新 UI 狀態：僅顯示該使用者有權限的操作
                setTimeout(() => {
                    const addBtn = document.getElementById('admin-add-btn');
                    if (addBtn) addBtn.classList.remove('hidden');
                    updateCalendarButtonsVisibility();
                }, 500);
            } else {
                localStorage.removeItem(`livenote_auth_${currentUser}`);
            }
        } catch (e) {
            localStorage.removeItem(`livenote_auth_${currentUser}`);
        }
    }
}

// --- CUSTOM DIALOG SYSTEM (HAND-CRAFTED) ---
window.showAlert = function(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';
        
        let icon = 'info';
        let extraIconClass = '';
        if (type === 'success') icon = 'check-circle-2';
        if (type === 'error') icon = 'alert-triangle';
        if (type === 'stats') {
            icon = 'trophy';
            extraIconClass = 'stats-trophy-icon';
        }

        overlay.innerHTML = `
            <div class="custom-dialog-box">
                <div class="custom-dialog-icon ${extraIconClass}"><i data-lucide="${icon}"></i></div>
                <div class="custom-dialog-message">${message}</div>
                <div class="custom-dialog-btns">
                    <button class="custom-dialog-btn primary">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
        
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('visible'), 10);

        overlay.querySelector('.primary').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve();
            }, 300);
        };
    });
};

window.showConfirm = function(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay';

        overlay.innerHTML = `
            <div class="custom-dialog-box">
                <div class="custom-dialog-icon"><i data-lucide="help-circle"></i></div>
                <div class="custom-dialog-message">${message}</div>
                <div class="custom-dialog-btns">
                    <button class="custom-dialog-btn secondary">CANCEL</button>
                    <button class="custom-dialog-btn primary">CONFIRM</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
        
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('visible'), 10);

        const close = (result) => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(result);
            }, 300);
        };

        overlay.querySelector('.primary').onclick = () => close(true);
        overlay.querySelector('.secondary').onclick = () => close(false);
    });
};

// --- UTILITIES ---

async function fetchVenues() {
    try {
        const res = await fetch(`${GAS_API_URL}?action=getVenues`);
        venueConfig = await res.json();
    } catch (e) {
        console.error('Failed to fetch venues:', e);
        venueConfig = [];
    }
}
function setupScrollTimeline() {
    const timeline = document.getElementById('scroll-timeline');
    const yearText = document.getElementById('scroll-year-text');
    const prevText = document.getElementById('scroll-year-prev');
    const nextText = document.getElementById('scroll-year-next');
    const ticketContainer = document.getElementById('ticket-container');
    let scrollTimeout;

    if (!timeline || !ticketContainer) return;

    function updateScrollTimeline() {
        if (!listView.classList.contains('active')) {
            timeline.classList.remove('visible');
            return;
        }

        // 判定滾動高度決定是否顯示 (3D 模式看 container 滾動，2D 模式看 window 滾動)
        const isScrolling = is3DMode
            ? (ticketContainer.scrollTop > 30)
            : (window.scrollY > 200);

        if (!isScrolling) {
            timeline.classList.remove('visible');
            return;
        }

        const wrappers = ticketContainer.querySelectorAll('.ticket-wrapper');
        let currentYear = "";

        // 3D 模式以「容器中線」比對，2D 模式以「視窗中線」比對
        const listRect = is3DMode
            ? ticketContainer.getBoundingClientRect()
            : { top: 0, height: window.innerHeight };

        const listCenter = listRect.top + listRect.height / 2;
        let closestWrapper = null;
        let minDistance = Infinity;

        wrappers.forEach(w => {
            const rect = w.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const distance = Math.abs(center - listCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestWrapper = w;
            }
        });

        if (closestWrapper) {
            currentYear = closestWrapper.getAttribute('data-year');
        }

        if (currentYear) {
            const yearNum = parseInt(currentYear);
            yearText.textContent = currentYear;
            prevText.textContent = yearNum + 1; // 上方顯示較新的年份 (最新在頂部)
            nextText.textContent = yearNum - 1; // 下方顯示較舊的年份 (舊的在底部)
            
            timeline.classList.add('visible');
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                timeline.classList.remove('visible');
            }, 1200); 
        } else {
            timeline.classList.remove('visible');
        }
    }

    // 同時監聽 3D 容器與 2D 視窗，確保雙模式下時間軸皆可正常運作
    ticketContainer.addEventListener('scroll', updateScrollTimeline, { passive: true });
    window.addEventListener('scroll', updateScrollTimeline, { passive: true });
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
        
        // 同步將票券滾動容器歸零回頂端
        const container = document.getElementById('ticket-container');
        if (container) {
            container.scrollTop = 0;
        }

        if (window.innerWidth <= 600) {
            // 找出當前 active 的 section，先加入淡出類別執行平滑淡出動畫
            const activeSection = document.querySelector('main section.active');
            if (activeSection) {
                activeSection.classList.add('section-fade-out');
            }

            // 延遲 350ms 等淡出動畫播完且平滑滾動至頂部後，再將其隱藏，徹底避免閃爍
            setTimeout(() => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('main section').forEach(s => {
                    s.classList.remove('active');
                    s.classList.remove('section-fade-out'); // 清除類別供下次切換使用
                });
                
                // 重置單張票券查看狀態，還原完整列表
                const backBtn = document.getElementById('back-btn-container');
                if (backBtn) backBtn.style.display = 'none';
                document.querySelectorAll('.ticket').forEach(el => el.style.display = 'flex');
                
                const strip = document.getElementById('live-status-strip');
                if (strip) strip.classList.remove('hidden-single-ticket');
            }, 350);
        }
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
            if (btn.classList.contains('active')) return;
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.stats;
            container.classList.remove('active-artist', 'active-venue', 'active-type', 'active-cost');
            container.classList.add(`active-${type}`);

            // if (type === 'cost') {
            //     triggerCostAnimation();
            // }
        };
    });
}
function setupArtistRankingModeSwitcher() {
    const btns = document.querySelectorAll('.ranking-mode-btn');
    const sortBtns = document.querySelectorAll('.ranking-sort-btn');
    const venueSortBtns = document.querySelectorAll('.venue-sort-btn');
    if (!btns.length && !sortBtns.length && !venueSortBtns.length) return;

    if (!ARTIST_RANKING_EXCLUDED_TYPES[artistRankingMode]) {
        artistRankingMode = 'inPerson';
    }

    btns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rankingMode === artistRankingMode);
        btn.onclick = () => {
            const nextMode = btn.dataset.rankingMode;
            if (!ARTIST_RANKING_EXCLUDED_TYPES[nextMode] || nextMode === artistRankingMode) return;

            artistRankingMode = nextMode;
            btns.forEach(b => b.classList.toggle('active', b.dataset.rankingMode === artistRankingMode));
            if (statsView.classList.contains('active')) initStats();
        };
    });

    sortBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rankingSort === artistRankingSort);
        btn.onclick = () => {
            const nextSort = btn.dataset.rankingSort;
            if (!['count', 'name'].includes(nextSort) || nextSort === artistRankingSort) return;

            artistRankingSort = nextSort;
            sortBtns.forEach(b => b.classList.toggle('active', b.dataset.rankingSort === artistRankingSort));
            if (statsView.classList.contains('active')) initStats();
        };
    });

    venueSortBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.venueSort === venueRankingSort);
        btn.onclick = () => {
            const nextSort = btn.dataset.venueSort;
            if (!['count', 'overseas'].includes(nextSort) || nextSort === venueRankingSort) return;

            venueRankingSort = nextSort;
            venueSortBtns.forEach(b => b.classList.toggle('active', b.dataset.venueSort === venueRankingSort));
            if (statsView.classList.contains('active')) initStats();
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
            window.updateYearFilterMask();
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
        window.updateYearFilterMask();
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
function formatPrice(price, currency) { 
    if (price === undefined || price === null || price === '') return '-'; 
    let symbol = 'NT$';
    if (currency === 'JPY') symbol = '¥';
    else if (currency === 'HKD') symbol = 'HK$';
    else if (currency === 'USD') symbol = 'US$';
    return `${symbol}${Number(price).toLocaleString()}`; 
}
function getDisplayName(t) {
    if (t.artist && t.artist.trim() !== '') return { name: t.artist, isType: false };
    return { name: TYPE_MAP_JP[t.type] || 'イベント', isType: true };
}

// DYNAMIC LOGO LOGIC
const logoText = "NO Live • NO LIFE • ";
const logoContainer = document.getElementById('main-logo');

function initDynamicLogo() {
    if (!logoContainer) return;
    logoContainer.innerHTML = '';
    const chars = logoText.split('');
    const totalChars = chars.length;
    
    chars.forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.setAttribute('style', `--index: ${i}; --angle: ${(i / totalChars) * 360}deg;`);
        
        // 初始散亂狀態：範圍縮小，主要集中在頂部區域
        const randomX = (Math.random() - 0.5) * 300;
        const randomY = (Math.random() - 0.5) * 150;
        const randomRotate = (Math.random() - 0.5) * 720;
        span.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;
        span.style.opacity = '0';
        span.style.filter = 'blur(10px)';
        
        logoContainer.appendChild(span);
        
        setTimeout(() => {
            span.style.opacity = '0.4';
            span.style.filter = 'blur(2px)';
        }, i * 30);
    });
}

function setLogoState(state) {
    if (!logoContainer) return;
    logoContainer.classList.remove('loading', 'circle', 'sticky-sidebar');
    logoContainer.classList.add(state);
    
    if (state === 'circle' || state === 'sticky-sidebar') {
        const spans = logoContainer.querySelectorAll('span');
        spans.forEach(span => {
            span.style.transform = '';
            span.style.opacity = '';
            span.style.filter = '';
        });
    }
}

// 捲動監聽
window.addEventListener('scroll', () => {
    if (!logoContainer) return;
    const scrollThreshold = 120;
    if (window.scrollY > scrollThreshold) {
        if (!logoContainer.classList.contains('sticky-sidebar')) setLogoState('sticky-sidebar');
    } else {
        if (logoContainer.classList.contains('sticky-sidebar') && !logoContainer.classList.contains('loading')) {
            setLogoState('circle');
        }
    }
});

initDynamicLogo();

// --- TICKET ELEMENT GENERATOR ---
function generateTicketHTML(t, index = 0) {
    let statusClass = '';
    let statusText = '';
    switch(t.status) {
        case 'APPLIED': statusClass = 'status-applied'; statusText = '抽選中 / 待搶票'; break;
        case 'CONFIRMED': statusClass = 'status-confirmed'; statusText = '參戰確定'; break;
        case 'COMPLETED': statusClass = 'status-completed'; statusText = '<i data-lucide="check-circle-2" style="width:12px; vertical-align:middle;"></i> 參戰完畢'; break;
        case 'FAILED_DRAW': statusClass = 'status-failed'; statusText = '落選'; break;
        case 'FAILED_TICKET': statusClass = 'status-failed'; statusText = '搶票失敗'; break;
        case 'CANCELLED': statusClass = 'status-cancelled'; statusText = '公演取消'; break;
        default: statusClass = 'status-confirmed'; statusText = '參戰確定'; break;
    }
    const proLabel = TYPE_MAP_PRO[t.type] || 'LIVE';
    
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

    const venues = (t.venue_name || '').split(/[、,]+/).map(v => v.trim()).filter(v => v !== '');
    const venuePillsHtml = venues.map(v => `<div class="pill venue-pill"><i data-lucide="map-pin"></i> ${v}</div>`).join('');
    const ticketYear = cleanDate(t.date).split('-')[0];

    return `
        ${badgesHtml}
        <div class="ticket-info-left">
            <div class="ticket-header">
                <div class="ticket-logo">${proLabel}</div>
                <div class="status-badge">${statusText}</div>
            </div>
            <div class="ticket-title">${t.tour_title}</div>
            <div class="ticket-subtitle">${t.artist}</div>
            <div class="ticket-meta-top"><div class="info-box"><span>PRICE</span><span>${formatPrice(t.ticket_price, t.currency)}</span></div><div class="info-box"><span>SEAT</span><span>${t.seat_info || '-'}</span></div></div>
            <div class="ticket-pills">
                <div class="pill-row venue-row">${venuePillsHtml}</div>
                <div class="pill-row time-row">
                    <div class="pill"><i data-lucide="calendar"></i> ${cleanDate(t.date)}</div>
                    ${cleanTime(t.time) ? `<div class="pill"><i data-lucide="clock"></i> ${cleanTime(t.time)}</div>` : ''}
                </div>
            </div>
        </div>
        <div class="ticket-visual" style="background-image: url('${t.images || ''}')"></div>
        <div class="ticket-stub-right"><div class="barcode-container"><div class="barcode"></div><div class="ticket-num">${t.id}</div></div></div>
        <div class="ticket-click-overlay"></div>
    `;
}

async function fetchData() {
    const navBar = document.querySelector('.tabs');
    const menuBtn = document.getElementById('menu-btn');
    const filterBar = document.querySelector('.filter-categories');
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';
    const cacheKey = `livenote_cache_${currentUser}`;
    const CACHE_TTL = 30 * 60 * 1000; // 30 分鐘時效

    // 1. SWR 智慧檢查
    const cachedStr = localStorage.getItem(cacheKey);
    let cachedData = null;
    let isStale = true;

    if (cachedStr) {
        try {
            const cacheObj = JSON.parse(cachedStr);
            // 檢查是否包含時間戳記與資料
            if (cacheObj && cacheObj.data) {
                const now = Date.now();
                isStale = (now - cacheObj.timestamp) > CACHE_TTL;
                cachedData = cacheObj.data;
                
                // 如果快取還算新，或是雖然舊但還有資料，先呈現給使用者看
                if (cachedData.length > 0) {
                    allTickets = cachedData;
                    renderApp(cachedData);
                    
                    // 如果快取沒過期，可以直接關閉 Loading
                    if (!isStale) {
                        setLogoState('circle');
                        toggleBodyScroll(false);
                    }
                }
            }
        } catch (e) { console.error('Cache error:', e); }
    }

    // 2. 只有在完全沒快取，或快取已判定為過期時，才強制鎖定 UI 顯示 Loading
    const shouldShowLoading = !cachedData || isStale;
    const hasDataToDisplay = cachedData && cachedData.length > 0;

    try {
        if (shouldShowLoading) {
            setLogoState('loading');
            toggleBodyScroll(true); 
            if (hasDataToDisplay && isStale) {
                document.body.classList.add('updating-data');
            } else if (!hasDataToDisplay) {
                document.body.classList.add('initial-loading');
            }
        }
        
        const res = await fetch(`${GAS_API_URL}?u=${currentUser}`);
        const serverData = (await res.json()).filter(t => t.id && t.status !== 'HIDDEN');

        // 3. 背景更新 LocalStorage (包含最新時間戳記)
        const newCacheObj = {
            timestamp: Date.now(),
            data: serverData
        };
        localStorage.setItem(cacheKey, JSON.stringify(newCacheObj));

        if (cachedData) {
            // 差異化對比更新
            applySurgicalUpdates(serverData);
        } else {
            allTickets = serverData;
            renderApp(serverData);
        }

        setLogoState('circle');
        toggleBodyScroll(false);
        document.body.classList.remove('updating-data', 'initial-loading');

        const subtitle = document.querySelector('.subtitle');
        if (subtitle) subtitle.textContent = `${currentUser.toUpperCase()} 參戰紀錄`;

    } catch (e) { 
        console.error('Fetch error:', e);
        // 若出錯且原本沒快取，才顯示 Mock Data
        if (!cachedData) {
            renderApp(MOCK_DATA);
        }
        // 確保發生錯誤時也能解除 Loading 與遮罩狀態
        setLogoState('circle');
        toggleBodyScroll(false);
        document.body.classList.remove('updating-data', 'initial-loading');
    }
}

function renderApp(data) {
    allTickets = data;
    const loadingEl = document.getElementById('loading'); 
    if (loadingEl) loadingEl.style.display = 'none';
    
    renderStatusStrip(data);
    renderFilterBar(); 
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
        const counts = {};
        allTickets.forEach(t => {
            if (!['EXHIBITION', 'SCREENING'].includes(t.type)) {
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
            }
        });

        const sortedArtists = Object.entries(counts).sort((a,b) => b[1] - a[1]);
        const hasManyOneTimers = sortedArtists.some(a => a[1] === 1);
        if (hasManyOneTimers) {
            const toggle = document.createElement('button');
            toggle.className = `show-all-toggle ${showAllArtists ? 'active' : ''}`;
            toggle.textContent = showAllArtists ? 'HIDE 1-TIME ARTISTS' : 'SHOW ALL ARTISTS';
            toggle.onclick = () => { showAllArtists = !showAllArtists; renderFilterBar(); };
            addonContainer.appendChild(toggle);
        }

        const finalArtists = showAllArtists ? sortedArtists : sortedArtists.filter(a => a[1] > 1 || a[0] === currentFilterValue);
        values = ['ALL', ...finalArtists.map(a => showAllArtists ? `${a[0]} (${a[1]})` : a[0])];
    } else if (currentFilterCategory === 'status') {
        values = ['ALL', 'CONFIRMED', 'COMPLETED', 'APPLIED', 'FAILED', 'CANCELLED'];
    } else if (currentFilterCategory === 'milestone') {
        values = ['ALL', 'ARTIST', 'EXPEDITION', 'VENUE', 'EVENT'];
    }

    values.forEach(val => {
        const chip = document.createElement('div');
        let realVal = val;
        let displayVal = val;

        if (currentFilterCategory === 'artist' && val !== 'ALL' && val.includes(' (')) {
            realVal = val.substring(0, val.lastIndexOf(' ('));
        }

        chip.className = `year-chip ${realVal === currentFilterValue ? 'active' : ''}`;
        
        if (currentFilterCategory === 'status') {
            const map = { 
                'CONFIRMED': '參戰確定', 
                'COMPLETED': '參戰完畢', 
                'APPLIED': '待參戰',
                'FAILED': '未成行',
                'CANCELLED': '公演取消'
            };
            displayVal = map[val] || val;
        } else if (currentFilterCategory === 'milestone') {
            const map = { 'ARTIST': '初參戰', 'EXPEDITION': '初遠征', 'VENUE': '初会場', 'EVENT': '初參加' };
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

    if (window.updateYearFilterMask) {
        setTimeout(window.updateYearFilterMask, 50);
    }
}

function filterTickets() {
    let filtered = allTickets;

    if (currentFilterCategory === 'date' || currentFilterCategory === 'artist' || currentFilterCategory === 'milestone') {
        filtered = allTickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET' && t.status !== 'CANCELLED');
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
    
    // 每次重新篩選時，強制將票券滾動容器歸零回頂部，確保新資料從第一張開始且 3D 特效計算正確
    const container = document.getElementById('ticket-container');
    if (container) {
        container.scrollTop = 0;
    }

    renderTickets(filtered);
    ticketContainer.classList.add('animate-fade');
}

function applySurgicalUpdates(newData) {
    const oldMap = new Map(allTickets.map(t => [t.id, t]));
    const newMap = new Map(newData.map(t => [t.id, t]));
    let hasChanges = false;

    // A. 找出刪除或修改的
    allTickets.forEach(oldT => {
        const newT = newMap.get(oldT.id);
        const el = document.getElementById(`ticket-${oldT.id}`);
        const wrapper = document.getElementById(`wrapper-${oldT.id}`);
        
        if (!newT) {
            // 刪除：移除 DOM Wrapper
            if (wrapper) {
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'scale(0.9)';
                setTimeout(() => wrapper.remove(), 400);
            }
            hasChanges = true;
        } else if (JSON.stringify(oldT) !== JSON.stringify(newT)) {
            // 修改：精準替換內容
            if (el) {
                // 1. 同步外層容器的狀態類別 (避免邊框/遮罩跳動)
                const newStatusClass = newT.status.toLowerCase().replace('_','-');
                // 移除舊的所有 status- 開頭的 class
                el.className = el.className.split(' ').filter(c => !c.startsWith('status-')).join(' ');
                el.classList.add(`status-${newStatusClass}`);

                // 2. 更新內容
                el.innerHTML = generateTicketHTML(newT);
                el.classList.add('update-glow');
                setTimeout(() => el.classList.remove('update-glow'), 2000);
                lucide.createIcons();
            }
            hasChanges = true;
        }
    });

    // B. 找出新增的
    newData.forEach(newT => {
        if (!oldMap.has(newT.id)) {
            // 新增：重新執行 filter 以確保排序與過濾正確
            hasChanges = true;
        }
    });

    if (hasChanges) {
        allTickets = newData;
        // 如果有新增或大量變動，最保險是重新過濾一次，但因為 allTickets 已更新，這不會產生快取閃爍
        filterTickets();
        renderMenu(newData);
        renderStatusStrip(newData);
        if (statsView.classList.contains('active')) initStats();
    }
}

function renderTickets(tickets) {
    // 動態更新當前符合篩選條件的票券總數
    const countEl = document.getElementById('ticket-count');
    if (countEl) {
        countEl.textContent = `${tickets.length} ${tickets.length === 1 ? 'TICKET' : 'TICKETS'}`;
    }

    const fragment = document.createDocumentFragment();
    
    // 如果是單一年度篩選且該年非目前進行中的年份，在此計算並插入年度統計卡片
    const currentYearStr = new Date().getFullYear().toString();
    const isSingleYearFiltered = (currentFilterCategory === 'date' && currentFilterValue !== 'ALL' && currentFilterValue !== currentYearStr);
    let indexOffset = 0;
    
    if (isSingleYearFiltered) {
        indexOffset = 1;
        const yearStr = currentFilterValue;
        
        // 該年份有效的票券列表 (排除 APPLIED, FAILED_DRAW, FAILED_TICKET, CANCELLED)
        const validYearTickets = tickets.filter(t => !['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET', 'CANCELLED'].includes(t.status));

        // 1. 該年場數
        const totalShows = validYearTickets.length;
        
        // 2. 首次藝人幾位 (掃描所有有效票券，必須在該年看過且往年沒看過，包含拼盤場與共演名單)
        const artistsPriorToY = new Set();
        const artistsInY = new Set();

        allTickets.forEach(t => {
            if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET', 'CANCELLED'].includes(t.status)) return;
            const tYear = cleanDate(t.date).split('-')[0];
            if (!tYear) return;

            const tArtists = new Set();
            if (t.artist && t.artist.trim() !== '') {
                tArtists.add(t.artist.trim().toUpperCase()); // 統一轉大寫比較，防止大小寫不一致
            }
            if (t.artist_list && t.artist_list.trim() !== '') {
                const list = t.artist_list.split(/[、,]+/).map(s => s.trim().toUpperCase()).filter(s => s !== '');
                list.forEach(a => tArtists.add(a));
            }

            if (tYear < yearStr) {
                tArtists.forEach(a => artistsPriorToY.add(a));
            } else if (tYear === yearStr) {
                tArtists.forEach(a => artistsInY.add(a));
            }
        });

        let firstTimeArtists = 0;
        artistsInY.forEach(a => {
            if (!artistsPriorToY.has(a)) {
                firstTimeArtists++;
            }
        });

        // 3. 首次會場幾個 (掃描所有有效票券，必須在該年去過且往年沒去過)
        const venuesPriorToY = new Set();
        const venuesInY = new Set();

        allTickets.forEach(t => {
            if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET', 'CANCELLED'].includes(t.status)) return;
            const tYear = cleanDate(t.date).split('-')[0];
            if (!tYear) return;

            const tVenues = new Set();
            if (t.venue_name && t.venue_name.trim() !== '') {
                const list = t.venue_name.split(/[、,]+/).map(s => s.trim().toUpperCase()).filter(s => s !== '');
                list.forEach(v => tVenues.add(v));
            }

            if (tYear < yearStr) {
                tVenues.forEach(v => venuesPriorToY.add(v));
            } else if (tYear === yearStr) {
                tVenues.forEach(v => venuesInY.add(v));
            }
        });

        let firstTimeVenues = 0;
        venuesInY.forEach(v => {
            if (!venuesPriorToY.has(v)) {
                firstTimeVenues++;
            }
        });

        // 4. 海外場數
        const overseasShows = validYearTickets.filter(t => {
            if (!t.venue_name) return false;
            if (t.lat_lng) {
                const firstCoord = t.lat_lng.split('|')[0].trim();
                const parts = firstCoord.split(',');
                if (parts.length === 2) {
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (!isNaN(lng) && lng !== 0) {
                        if (lng > 118 && lng < 125 && lat > 21 && lat < 26) {
                            return false; 
                        }
                        return true; 
                    }
                }
            }
            const list = t.venue_name.split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
            return list.some(v => {
                const compact = v.replace(/\s/g, '').toUpperCase();
                if (NON_OVERSEAS_VENUE_LABELS.has(compact) || compact.includes('VRLIVE') || compact.includes('LIVE配信') || compact.includes('ONLINE') || compact.includes('線上')) {
                    return false;
                }
                return !isTaiwanVenue(v);
            });
        }).length;

        // 創建統計卡片
        const statsWrapper = document.createElement('div');
        statsWrapper.id = `wrapper-stats-${yearStr}`;
        statsWrapper.className = 'ticket-wrapper stats-card-wrapper';
        statsWrapper.setAttribute('data-year', yearStr);
        statsWrapper.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAlert(`
                <div class="stats-alert-container">
                    <div class="stats-alert-title">${yearStr} ANNUAL REVIEW</div>
                    <div class="stats-alert-row">
                        <span class="meta-icon-gold"><i data-lucide="music"></i></span>
                        <strong class="stats-alert-label">總場次</strong>
                        <span class="stats-alert-value">${totalShows} <span class="stats-alert-unit">場</span></span>
                    </div>
                    <div class="stats-alert-row">
                        <span class="meta-icon-gold"><i data-lucide="plane"></i></span>
                        <strong class="stats-alert-label">海外遠征</strong>
                        <span class="stats-alert-value">${overseasShows} <span class="stats-alert-unit">場</span></span>
                    </div>
                    <div class="stats-alert-row">
                        <span class="meta-icon-gold"><i data-lucide="mic-2"></i></span>
                        <strong class="stats-alert-label">新開拓藝人</strong>
                        <span class="stats-alert-value">${firstTimeArtists} <span class="stats-alert-unit">位</span></span>
                    </div>
                    <div class="stats-alert-row">
                        <span class="meta-icon-gold"><i data-lucide="map-pin"></i></span>
                        <strong class="stats-alert-label">新解鎖會場</strong>
                        <span class="stats-alert-value">${firstTimeVenues} <span class="stats-alert-unit">個</span></span>
                    </div>
                </div>
            `, 'stats');
        };

        const statsCard = document.createElement('div');
        statsCard.id = `ticket-stats-${yearStr}`;
        statsCard.className = 'ticket status-confirmed stats-ticket animate-up';
        statsCard.style.animationDelay = '0s';
        statsCard.innerHTML = `
            <div class="ticket-info-left">
                <div class="ticket-header">
                    <div class="ticket-logo">${yearStr}</div>
                    <div class="status-badge"><i data-lucide="bar-chart-3" style="width: 12px; height: 12px; vertical-align: middle;"></i>ANNUAL SUMMARY</div>
                </div>
                <div class="ticket-title">ANNUAL REPORT<br>年度總結</div>
                <div class="stats-ticket-grid">
                    <div class="stats-ticket-item">
                        <span class="stats-item-label">TOTAL SHOWS / 參戰場數</span>
                        <span class="stats-item-val">${totalShows} <span class="stats-item-unit">場</span></span>
                    </div>
                    <div class="stats-ticket-item">
                        <span class="stats-item-label">OVERSEAS SHOWS / 海外遠征</span>
                        <span class="stats-item-val">${overseasShows} <span class="stats-item-unit">場</span></span>
                    </div>
                    <div class="stats-ticket-item">
                        <span class="stats-item-label">NEW ARTISTS / 首次藝人</span>
                        <span class="stats-item-val">${firstTimeArtists} <span class="stats-item-unit">位</span></span>
                    </div>
                    <div class="stats-ticket-item">
                        <span class="stats-item-label">NEW VENUES / 首次會場</span>
                        <span class="stats-item-val">${firstTimeVenues} <span class="stats-item-unit">個</span></span>
                    </div>
                </div>
            </div>
            <div class="ticket-visual stats-ticket-visual">
                <div class="stats-visual-circle">
                     <i data-lucide="trophy" class="stats-visual-icon"></i>
                </div>
            </div>
            <div class="ticket-stub-right">
                <div class="barcode-container">
                    <div class="barcode"></div>
                    <div class="ticket-num">REPORT-${yearStr}</div>
                </div>
            </div>
            <div class="ticket-click-overlay"></div>
        `;
        statsWrapper.appendChild(statsCard);
        fragment.appendChild(statsWrapper);
    }

    const sorted = [...tickets].sort((a,b) => new Date(cleanDate(b.date)) - new Date(cleanDate(a.date)));
    
    sorted.forEach((t, index) => {
        const wrapper = document.createElement('div');
        const ticketYear = cleanDate(t.date).split('-')[0];
        wrapper.id = `wrapper-${t.id}`;
        wrapper.className = 'ticket-wrapper';
        wrapper.setAttribute('data-year', ticketYear);

        const card = document.createElement('div');
        card.id = `ticket-${t.id}`;
        
        // 修正：補回 status- 前綴並統一失敗狀態類別
        const rawStatus = t.status.toLowerCase().replace('_','-');
        let statusClass = `status-${rawStatus}`;
        if (t.status === 'FAILED_DRAW' || t.status === 'FAILED_TICKET') {
            statusClass += ' status-failed';
        }

        card.className = `ticket ${statusClass} animate-up`;
        card.style.animationDelay = `${(index + indexOffset) * 0.05}s`;
        card.innerHTML = generateTicketHTML(t, index);
        wrapper.onclick = () => openDetail(t.id);
        
        wrapper.appendChild(card);
        fragment.appendChild(wrapper);
    });
    
    ticketContainer.innerHTML = '';
    ticketContainer.appendChild(fragment);
    lucide.createIcons();
    
    // 渲染完後立刻計算一次 3D 滾筒效果
    setTimeout(update3DScrollEffect, 100);
}

function setupTabs() {
    listTab.addEventListener('click', () => switchTab('list'));
    mapTab.addEventListener('click', () => switchTab('map'));
    statsTab.addEventListener('click', () => switchTab('stats'));
}

let isStatsInitialized = false;

function switchTab(tab) {
    [listTab, mapTab, statsTab].forEach(t => t.classList.remove('active'));
    [listView, mapView, statsView].forEach(v => v.classList.remove('active'));
    document.getElementById('back-btn-container').style.display = 'none';
    
    if (tab === 'list') { 
        listTab.classList.add('active'); 
        listView.classList.add('active');
        if (window.innerWidth <= 600) {
            setTimeout(() => {
                const filterEl = listView.querySelector('.filter-categories');
                if (filterEl) {
                    const rect = filterEl.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    // 精準滑動至分類過濾按鈕列頂部（留 10px 緩衝）
                    window.scrollTo({ top: rect.top + scrollTop - 10, behavior: 'smooth' });
                }
                update3DScrollEffect();
            }, 200);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(update3DScrollEffect, 200);
        }
    }
    else if (tab === 'map') { 
        mapTab.classList.add('active'); 
        mapView.classList.add('active'); 
        setTimeout(() => {
            initMap();
            if (window.innerWidth <= 600) {
                const rect = mapView.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo({ top: rect.top + scrollTop - 20, behavior: 'smooth' });
            }
        }, 200); 
    }
    else if (tab === 'stats') { 
        statsTab.classList.add('active'); 
        statsView.classList.add('active'); 
        
        const cards = document.querySelectorAll('.stats-card');
        if (!isStatsInitialized) {
            cards.forEach((c, idx) => {
                c.classList.add('animate-up');
                c.style.animationDelay = `${idx * 0.1}s`;
            });
            // 關鍵：動畫跑完就物理移除類別
            setTimeout(() => {
                cards.forEach(c => c.classList.remove('animate-up'));
            }, 1200);
        }

        setTimeout(() => {
            initStats();
            isStatsInitialized = true;
            if (window.innerWidth <= 600) {
                const rect = statsView.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo({ top: rect.top + scrollTop - 20, behavior: 'smooth' });
            }
        }, 200); 
    }
}

function isArtistRankingEligible(t) {
    const excludedTypes = ARTIST_RANKING_EXCLUDED_TYPES[artistRankingMode] || ARTIST_RANKING_EXCLUDED_TYPES.full;
    return !excludedTypes.includes(t.type);
}

function sortArtistRanking(entries) {
    if (artistRankingSort === 'name') {
        return entries.sort((a, b) => ARTIST_NAME_COLLATOR.compare(a[0], b[0]) || b[1] - a[1]);
    }
    return entries.sort((a, b) => b[1] - a[1] || ARTIST_NAME_COLLATOR.compare(a[0], b[0]));
}

function getVenueRegionLabel(venueName) {
    const match = String(venueName || '').match(/[（(]([^()（）]+)[）)]\s*$/);
    return match ? match[1].trim() : '';
}

function normalizeTaiwanRegion(region) {
    return String(region || '').replace(/[縣市\s]/g, '').replace(/^臺/, '台');
}

function isTaiwanVenue(venueName) {
    const label = normalizeTaiwanRegion(getVenueRegionLabel(venueName));
    if (label) {
        const compactLabel = label.replace(/\s/g, '').toUpperCase();
        if (NON_OVERSEAS_VENUE_LABELS.has(compactLabel)) return true;
        return TAIWAN_VENUE_REGIONS.has(label) || TAIWAN_VENUE_REGIONS.has(label.replace(/^台/, '臺'));
    }

    const config = venueConfig.find(v => v.venue_name === venueName);
    if (config && config.region) return config.region === 'TW';
    return true;
}

function sortVenueRanking(entries) {
    if (venueRankingSort === 'overseas') {
        return entries.sort((a, b) => {
            const aTaiwan = isTaiwanVenue(a[0]);
            const bTaiwan = isTaiwanVenue(b[0]);
            if (aTaiwan !== bTaiwan) return aTaiwan ? 1 : -1;
            return b[1] - a[1] || ARTIST_NAME_COLLATOR.compare(a[0], b[0]);
        });
    }
    return entries.sort((a, b) => {
        const countDiff = b[1] - a[1];
        if (countDiff !== 0) return countDiff;

        const aTaiwan = isTaiwanVenue(a[0]);
        const bTaiwan = isTaiwanVenue(b[0]);
        if (aTaiwan !== bTaiwan) return aTaiwan ? 1 : -1;

        return ARTIST_NAME_COLLATOR.compare(a[0], b[0]);
    });
}

function initMap() {
    if (mapInstance) {
        mapInstance.resize(); // 解決隱藏 tab 初始化導致的容器尺寸不正確問題
        return;
    }
    
    // 設定全域地圖語系為當地語言 (例如日本顯示日文、台灣顯示中文)
    maptilersdk.config.primaryLanguage = maptilersdk.Language.LOCAL;
    
    // 設定預設視野以沖繩為中心，大縮放比例以完整覆蓋台灣與日本全島
    maptilersdk.config.apiKey = MAPTILER_API_KEY;
    mapInstance = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.DATAVIZ.DARK, // 更換為兼具 3D 建築與純黑金配色的 Dataviz Dark 底圖，消除任何亮色陸地
        center: [132.0, 28.0], // 日本與台灣中間的沖繩海域 [Lng, Lat]
        zoom: 3.5,
        navigationControl: true, // 顯示縮放控件
        geolocateControl: false
    });
    
    // 監聽縮放層級以決定是否顯示場地名稱標籤
    mapInstance.on('zoom', () => {
        const zoom = mapInstance.getZoom();
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            // 當縮放層級 >= 10.5 時顯示標籤（可自訂調整，10.5 大致是縣市級別的比例尺）
            if (zoom >= 13) {
                mapContainer.classList.add('show-marker-labels');
            } else {
                mapContainer.classList.remove('show-marker-labels');
            }
        }
    });
    
    // 按經緯度群組活動 (排除失敗狀態)
    const venueGroups = {};
    allTickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET' && t.status !== 'CANCELLED').forEach(t => {
        if (t.lat_lng) {
            // 支援多座標解析：以 | 分隔
            const coordsArray = t.lat_lng.split('|').map(s => s.trim()).filter(s => s !== '');
            const venueArray = (t.venue_name || '').split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
            
            coordsArray.forEach((coords, idx) => {
                if (!venueGroups[coords]) venueGroups[coords] = [];
                // 將票券與對應的舞台名稱封裝
                const specificVenueName = venueArray[idx] || t.venue_name; // 若索引對不到則用完整名稱
                venueGroups[coords].push({ ticket: t, displayName: specificVenueName });
            });
        }
    });

    // 預設加入台灣與日本的代表基準點，確保初始地圖視野必定同時包含台日兩地
    const latlngs = [
        [121.55, 25.05], // 台灣台北 [Lng, Lat]
        [139.69, 35.68]  // 日本東京 [Lng, Lat]
    ];

    Object.keys(venueGroups).forEach(coords => {
        const [la, ln] = coords.split(',').map(Number);
        if (isNaN(la) || isNaN(ln)) return; // 跳過無效座標
        latlngs.push([ln, la]); // 收集座標點以供視野自適應

        // 排序該場館的所有活動 (日期由新到舊)
        const itemsAtVenue = venueGroups[coords].sort((a, b) => new Date(cleanDate(b.ticket.date)) - new Date(cleanDate(a.ticket.date)));
        
        // 建立自訂的 Marker 元素（包裝容器，避免內部旋轉干擾標籤）
        const el = document.createElement('div');
        el.className = 'custom-marker-wrapper';
        
        const pin = document.createElement('div');
        pin.className = 'custom-marker-pin';
        el.appendChild(pin);

        const label = document.createElement('div');
        label.className = 'marker-label-text';
        label.textContent = itemsAtVenue[0].displayName; // 顯示該座標最常參戰的場地名稱
        el.appendChild(label);
        
        // 建立包含所有活動的清單 HTML
        let listHtml = itemsAtVenue.map(item => {
            const t = item.ticket;
            return `
                <div style="margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                    <strong style="color:var(--text-accent); font-size:1rem;">${getDisplayName(t).name}</strong><br>
                    <span style="font-size:0.85rem; color:#eee; word-break:keep-all; line-break:strict; display:block; margin-top:2px;">${t.tour_title}</span><br>
                    <span style="color:#aaa; font-size:0.75rem;">${cleanDate(t.date)}</span>
                    <button onclick="openDetail('${t.id}')" style="background:var(--text-accent); border:none; color:black; width:100%; margin-top:5px; padding:2px; font-size:0.75rem; font-weight:bold; cursor:pointer; border-radius:2px;">DETAIL</button>
                </div>
            `;
        }).join('');

        const popupContent = `
            <div style="color:white; font-family:'Noto Sans TC'; max-height:200px; overflow-y:auto; padding-right:5px;">
                <div style="font-size:0.8rem; color:var(--text-accent); margin-bottom:8px; font-weight:bold; border-left:3px solid var(--text-accent); padding-left:5px;">
                    ${itemsAtVenue[0].displayName}
                </div>
                ${listHtml}
            </div>
        `;
        
        // 建立 MapTiler Popup
        const popup = new maptilersdk.Popup({ offset: [0, -30] })
            .setHTML(popupContent);

        // 監聽 Popup 開啟與關閉，以控制場地名稱標籤的顯示與隱藏
        popup.on('open', () => {
            el.classList.add('popup-open');
        });
        popup.on('close', () => {
            el.classList.remove('popup-open');
        });

        // 建立 MapTiler Marker，設定 [Lng, Lat]，將 anchor 設為 'bottom' 讓水滴針尖對齊座標點
        new maptilersdk.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([ln, la])
            .setPopup(popup)
            .addTo(mapInstance);
    });

    // 自動根據所有標籤的位置，調整地圖視野至剛好包容所有參戰地點（例如同時顯示台灣與日本）
    if (latlngs.length > 0) {
        mapInstance.fitBounds(latlngs, {
            padding: { top: 80, bottom: 80, left: 60, right: 60 },
            maxZoom: 6 // 限制最大縮放比例，防止只有單一城市時放得太大
        });
    }
}

function initStats() {
    const artC = {}; const venC = {}; const typC = {}; const costC = {};
    const yearlyAttendance = {}; // 用於儲存每年場次
    let totalCount = 0;

    allTickets.forEach(t => { 
        if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET', 'CANCELLED'].includes(t.status)) return; 
        totalCount++;

        const year = cleanDate(t.date).split('-')[0];

        // 0. 年度場次統計
        if (year) {
            yearlyAttendance[year] = (yearlyAttendance[year] || 0) + 1;
        }

        // 1. 藝人統計
        if (isArtistRankingEligible(t)) {
            const currentEventArtists = new Set();
            if (t.artist && t.artist.trim() !== '') currentEventArtists.add(t.artist.trim());
            if (t.artist_list && t.artist_list.trim() !== '') {
                const list = t.artist_list.split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
                list.forEach(a => currentEventArtists.add(a));
            }
            currentEventArtists.forEach(a => { artC[a] = (artC[a] || 0) + 1; });
        }

        // 2. 場地統計
        if (t.venue_name && t.venue_name.trim() !== '') {
            const venues = t.venue_name.split(/[、,]+/).map(s => s.trim()).filter(s => s !== '');
            venues.forEach(v => { venC[v] = (venC[v] || 0) + 1; });
        }

        // 3. 公演種別統計
        const typeKey = t.type || 'ONE_MAN';
        typC[typeKey] = (typC[typeKey] || 0) + 1;

        // 4. 金額統計
        if (t.ticket_price && !isNaN(t.ticket_price)) {
            const cur = t.currency || 'TWD';
            costC[cur] = (costC[cur] || 0) + Number(t.ticket_price);
        }
    });

    const sa = sortArtistRanking(Object.entries(artC)); 
    const sv = sortVenueRanking(Object.entries(venC));
    const st = Object.entries(typC).sort((a,b)=>b[1]-a[1]);
    const sc = Object.entries(costC).sort((a,b)=>b[1]-a[1]);

    // 更新總場次標題
    const statsTitle = document.querySelector('#stats-view h2');
    if (statsTitle) statsTitle.innerHTML = `STATS <span class="stats-total-hint">TOTAL: ${totalCount} RECORDS</span>`;

    renderDonut('artistChart', sa.slice(0, 10), artistChartInstance, (c)=>artistChartInstance=c);
    renderDonut('venueChart', sv.slice(0, 10), venueChartInstance, (c)=>venueChartInstance=c);
    renderDonut('typeChart', st.map(i => [TYPE_MAP_JP[i[0]] || i[0], i[1]]), typeChartInstance, (c)=>typeChartInstance=c); 

    renderStatsList('artist-stats-list', sa, 'artist'); 
    renderStatsList('venue-stats-list', sv, 'venue');
    renderStatsList('type-stats-list', st.map(i => [TYPE_MAP_JP[i[0]] || i[0], i[1]]), 'type');
    
    renderCostList(sc, yearlyAttendance);
}
 
function triggerCostAnimation() {
    const container = document.getElementById('cost-stats-list');
    if (!container) return;
    container.querySelectorAll('.count-animate').forEach(el => {
        const target = parseFloat(el.dataset.target);
        const currency = el.dataset.currency;
        animateNumber(el, target, currency);
    });
}

function animateNumber(element, target, currency = null) {
    const duration = 1200; 
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeProgress * (target - start) + start);
        
        if (currency) {
            // 金額模式
            element.textContent = formatPrice(currentCount, currency);
        } else {
            // 場次模式 (RECORDS)
            element.innerHTML = `${currentCount}<span class="unit-label">RECORDS</span>`;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (currency) {
                element.textContent = formatPrice(target, currency);
            } else {
                element.innerHTML = `${target}<span class="unit-label">RECORDS</span>`;
            }
        }
    }
    requestAnimationFrame(update);
}

function renderCostList(data, yearlyData) {
    const container = document.getElementById('cost-stats-list');
    const annualContainer = document.getElementById('annual-attendance-list');
    if (!container || !annualContainer) return;

    const counts = Object.values(yearlyData);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

    // 1. 渲染年度場次 (初始值為 0)
    const sortedYears = Object.keys(yearlyData).sort((a, b) => b - a);
    annualContainer.innerHTML = sortedYears.map(year => {
        const count = yearlyData[year];
        const levelPercent = (count / maxCount) * 100;
        return `
            <div class="annual-item" style="--level: ${levelPercent}%">
                <span class="year-label">${year}</span>
                <span class="count-value records-animate" data-target="${count}">0<span class="unit-label">RECORDS</span></span>
            </div>
        `;
    }).join('');

    // 2. 渲染總額容器 (初始值為 0)
    container.innerHTML = data.map(i => `
        <div class="stats-item no-hover" style="cursor:default;">
            <div class="stats-header">
                <span class="name" style="font-family:'Bebas Neue'; letter-spacing:4px; color:#888;">${i[0]} TOTAL EXPENDITURE</span>
                <span class="count count-animate" data-target="${i[1]}" data-currency="${i[0]}" style="font-size:1.4rem;">${formatPrice(0, i[0])}</span>
            </div>
        </div>
    `).join('');

    // 使用 IntersectionObserver 確保僅在顯示時「首次」跳動
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseFloat(el.dataset.target);
                const currency = el.dataset.currency || null;
                
                setTimeout(() => {
                    animateNumber(el, target, currency);
                }, 100);
                
                observer.unobserve(el); // 關鍵：觸發後停止觀察，達成「僅首次載入有動畫」
            }
        });
    }, { threshold: 0.1 });

    // 同時監視金額與場次數字
    container.querySelectorAll('.count-animate').forEach(el => observer.observe(el));
    annualContainer.querySelectorAll('.records-animate').forEach(el => observer.observe(el));
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
    const existingShowMoreBtn = container.nextElementSibling;
    if (existingShowMoreBtn && existingShowMoreBtn.classList.contains('show-more-btn')) {
        existingShowMoreBtn.remove();
    }
    
    const renderItems = (items) => items.map(i => {
        const name = i[0];
        const count = i[1];
        
        // 篩選與該藝人/場地/種類相關的所有場次
        const relatedEvents = allTickets.filter(t => {
            if (['APPLIED', 'FAILED_DRAW', 'FAILED_TICKET'].includes(t.status)) return false;
            if (type === 'artist') {
                if (!isArtistRankingEligible(t)) return false;
                const list = (t.artist_list || '').split(/[、,]+/).map(s => s.trim());
                return (t.artist === name) || list.includes(name);
            } else if (type === 'venue') {
                const venueList = (t.venue_name || '').split(/[、,]+/).map(s => s.trim());
                return venueList.includes(name);
            } else if (type === 'type') {
                // 透過反查 TYPE_MAP_JP 或直接匹配原始值
                const rawType = Object.keys(TYPE_MAP_JP).find(k => TYPE_MAP_JP[k] === name) || name;
                return t.type === rawType;
            }
            return false;
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
            <div class="stats-item animate-fade" onclick="this.classList.toggle('open'); this.querySelector('.stats-details').classList.toggle('open');">
                <div class="stats-header">
                    <span class="name">${name}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="count">${count} 回</span>
                        <div class="toggle-icon"></div>
                    </div>
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
    document.body.classList.toggle('menu-open', isOpen); // 加入此行以同步 body 狀態
    toggleBodyScroll(isOpen);
};function renderMenu(tickets) {
    const menu = document.getElementById('menu-content'); 
    const nav = document.getElementById('menu-nav');
    menu.innerHTML = '';
    nav.innerHTML = '';

    const monthNames = {
        '01': 'JANUARY', '02': 'FEBRUARY', '03': 'MARCH', '04': 'APRIL',
        '05': 'MAY', '06': 'JUNE', '07': 'JULY', '08': 'AUGUST',
        '09': 'SEPTEMBER', '10': 'OCTOBER', '11': 'NOVEMBER', '12': 'DECEMBER'
    };

    const years = {}; 
    tickets.filter(t => t.status !== 'FAILED_DRAW' && t.status !== 'FAILED_TICKET' && t.status !== 'CANCELLED').forEach(t => { 
        const y = cleanDate(t.date).split('-')[0]; 
        if (!years[y]) years[y] = []; 
        years[y].push(t); 
    });

    const sortedYears = Object.keys(years).sort((a,b)=>b-a);

    sortedYears.forEach(y => {
        // 排序該年份內的票券 (日期由新到舊)
        years[y].sort((a, b) => new Date(cleanDate(b.date)) - new Date(cleanDate(a.date)));

        // 1. 產生導覽列按鈕
        const navLink = document.createElement('div');
        navLink.className = 'nav-year-link';
        navLink.textContent = y;
        navLink.dataset.year = y; // 儲存年份以便查詢
        navLink.onclick = () => {
            const target = document.getElementById(`menu-year-${y}`);
            if (target) {
                // 移除所有 active 類別並幫自己加上
                document.querySelectorAll('.nav-year-link').forEach(l => l.classList.remove('active'));
                navLink.classList.add('active');

                const topPos = target.getBoundingClientRect().top - menu.getBoundingClientRect().top + menu.scrollTop;
                menu.scrollTo({
                    top: topPos - 20,
                    behavior: 'smooth'
                });
            }
        };
        nav.appendChild(navLink);

        // 預設高亮最新的一年
        if (y === sortedYears[0]) navLink.classList.add('active');

        // 2. 產生年份群組
        const div = document.createElement('div'); 
        div.className = 'menu-group'; 
        div.innerHTML = `<div class="menu-year" id="menu-year-${y}" data-year="${y}">${y}</div>`;
        
        // 按月份群組票券
        const months = {};
        years[y].forEach(t => {
            const dateParts = cleanDate(t.date).split('-');
            const m = dateParts[1] || '00'; // 取得月分
            if (!months[m]) months[m] = [];
            months[m].push(t);
        });

        // 排序月份由新到舊
        const sortedMonths = Object.keys(months).sort((a, b) => b - a);

        sortedMonths.forEach(m => {
            const monthNum = parseInt(m);
            // 月份標題
            const monthTitle = document.createElement('div');
            monthTitle.className = 'menu-month';
            const monthNameEn = monthNames[m] || 'UNKNOWN';
            monthTitle.innerHTML = `${monthNameEn} <span class="jp-month">/ ${monthNum}月</span>`;
            div.appendChild(monthTitle);

            // 月份內的項目
            months[m].forEach(t => {
                const item = document.createElement('div'); 
                item.className = 'menu-item'; 
                item.onclick = () => { toggleMenu(); openDetail(t.id); };
                const info = getDisplayName(t);
                item.innerHTML = `<div class="menu-artist ${info.isType ? 'is-type' : ''}">${info.name}</div><div class="menu-tour">${t.tour_title}</div>`; 
                div.appendChild(item);
            });
        });

        menu.appendChild(div);
    });

    // --- 捲動監聽：自動追隨高亮 ---
    menu.onscroll = () => {
        const yearSections = menu.querySelectorAll('.menu-year');
        const menuRect = menu.getBoundingClientRect();
        let closestYear = "";
        let minDiff = Infinity;
        
        yearSections.forEach(section => {
            const rect = section.getBoundingClientRect();
            // 計算年份標題相對於選單視窗目標高度 (menuRect.top + 20) 的距離
            const diff = Math.abs(rect.top - (menuRect.top + 20));
            if (diff < minDiff) {
                minDiff = diff;
                closestYear = section.dataset.year;
            }
        });

        if (closestYear) {
            nav.querySelectorAll('.nav-year-link').forEach(link => {
                link.classList.toggle('active', link.dataset.year === closestYear);
            });
        }
    };
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
    
    const strip = document.getElementById('live-status-strip');
    if (strip) strip.classList.add('hidden-single-ticket');
    
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
    const strip = document.getElementById('live-status-strip');
    if (strip) strip.classList.remove('hidden-single-ticket');

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

window.updateModalAdminTool = function(rawT) {
    const adminTool = document.getElementById('modal-admin-tool-inner');
    if (!adminTool || !rawT) return;
    
    if (adminPassword) {
        const urlParams = new URLSearchParams(window.location.search);
        const currentUser = urlParams.get('u') || 'ching';
        const hasCal = checkUserHasCalendar(currentUser);
        const isSubscribed = checkUserIsSubscribed(currentUser);

        // 同步按鈕：要有 calendar_id 和有訂閱才顯示
        const showSyncBtn = hasCal && isSubscribed;
        const syncBtnHtml = showSyncBtn ? `
            <button id="cal-sync-btn-${rawT.id}" onclick="handleSyncCalendar('${rawT.id}', this)" style="background:${rawT.calendar_event_id ? '#1a2e1a' : '#111'}; color:${rawT.calendar_event_id ? '#4caf50' : '#aaa'}; border:1px solid ${rawT.calendar_event_id ? '#4caf50' : '#444'}; padding:4px 10px; border-radius:4px; font-family:'Bebas Neue'; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:5px; box-shadow:0 0 10px rgba(0,0,0,0.5);">
                <i data-lucide="${rawT.calendar_event_id ? 'calendar-check-2' : 'calendar-plus'}" style="width:13px;"></i>
                ${rawT.calendar_event_id ? '' : ''}
            </button>
        ` : '';

        adminTool.innerHTML = `
            <div style="display:flex; gap:8px; align-items:center;">
                <div onclick="showAdminForm(${JSON.stringify(rawT).replace(/"/g, '&quot;')})" style="background:var(--text-accent); color:black; padding:4px 12px; border-radius:4px; font-family:'Bebas Neue'; font-size:0.9rem; cursor:pointer; display:flex; align-items:center; gap:5px; box-shadow:0 0 10px rgba(0,0,0,0.5);">
                    <i data-lucide="edit-3" style="width:14px;"></i> EDIT
                </div>
                ${syncBtnHtml}
            </div>`;
    } else {
        adminTool.innerHTML = `
            <div onclick="openLogin()" class="admin-lock-btn">
                <i data-lucide="lock"></i>
            </div>`;
    }
    if (window.lucide) lucide.createIcons({ nodes: [adminTool] });
};

window.openDetail = function(id) {
    window.currentDetailId = id; // 儲存目前正在觀看的票券 ID
    const rawT = allTickets.find(x => x.id === id); if (!rawT) return;
    
    // 開啟的瞬間立即將 Modal 滾動條重置為頂部，防止上一次觀看殘留的滾動高度
    modal.scrollTop = 0;
    
    const t = {};
    Object.keys(rawT).forEach(k => { t[k.trim().toLowerCase()] = rawT[k]; });

    const typeLabelJP = TYPE_MAP_JP[rawT.type] || 'イベント';
    const seatDisplay = t.seat_info || rawT.seat_info || '-';
    const setlistDisplay = t.setlist || rawT.setlist || '';
    const hasLatLng = rawT.lat_lng && rawT.lat_lng.trim() !== '';
    const isMultiVenue = hasLatLng && rawT.lat_lng.split('|').map(s => s.trim()).filter(s => s !== '').length > 1;
    const ticketImg = t.ticket_image || rawT.ticket_image || '';
    const statusMap = { 
        'APPLIED': '抽選中 / 待搶票', 
        'CONFIRMED': '參戰確定', 
        'COMPLETED': '參戰完畢',
        'FAILED_DRAW': '落選',
        'FAILED_TICKET': '搶票失敗',
        'CANCELLED': '公演取消'
    };
    const statusText = statusMap[rawT.status] || '參戰確定';
    const isFailed = rawT.status === 'FAILED_DRAW' || rawT.status === 'FAILED_TICKET';

    // 處理夥伴標籤顯示
    let companionsHtml = '';
    if (rawT.tag && rawT.tag.trim() !== '') {
        const taggedUsernames = rawT.tag.split(',').map(u => u.trim());
        const taggedUsers = allUsers.filter(u => taggedUsernames.includes(u.username));
        
        if (taggedUsers.length > 0) {
            companionsHtml = `
                <div class="companion-display" style="margin-top: 1.5rem;">
                    <h4 style="color:var(--text-accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">WITH COMPANIONS / 參戰夥伴</h4>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        ${taggedUsers.map(u => `
                            <div class="companion-avatar-box" title="${u.display_name}" style="text-align:center;">
                                <div style="width:45px; height:45px; border-radius:50%; overflow:hidden; border:2px solid var(--text-accent); background:#111;">
                                    ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : '<i data-lucide="user" style="width:20px; color:#555; margin-top:10px;"></i>'}
                                </div>
                                <div style="font-size:0.65rem; color:#888; margin-top:4px; font-family:'Bebas Neue';">${u.username.toUpperCase()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // 重置翻轉狀態
    modal.querySelector('.modal-content').classList.remove('flipped');

    const hasHeroImg = !!(rawT.images && rawT.images.trim() !== '');
    
    modalBody.innerHTML = `
        <div class="modal-flipper">
            <!-- 正面：詳細資訊 -->
            <div class="modal-front">
                <div class="modal-hero-img ${!hasHeroImg ? 'no-img' : ''}" style="${hasHeroImg ? `background-image: url('${rawT.images}')` : 'height: 60px;'}">
                    <div id="modal-admin-tool-inner" style="position: absolute; top: 15px; left: 20px; z-index: 101;"></div>
                </div>
                <div class="modal-text-content">
                    <h2 style="color:var(--text-accent); font-family:'Anton'; font-size:2.2rem;">${rawT.tour_title}</h2><h3 style="color:#aaa; font-size:1.2rem; margin-top:0;">${rawT.artist}</h3>
                    ${rawT.artist_list ? `<div style="margin:1rem 0; background:#1a1a1a; padding:15px; border-left:3px solid var(--text-accent);"><strong style="color:var(--text-accent);">共演陣容/嘉賓</strong><br>${rawT.artist_list}</div>` : ''}
                    <div class="modal-meta-grid">
                        <div class="modal-meta-item"><strong>狀態</strong><span>${statusText}</span></div>
                        <div class="modal-meta-item"><strong>公演種別</strong><span>${typeLabelJP}</span></div>
                        <div class="modal-meta-item"><strong>公演日</strong><span>${cleanDate(rawT.date)}</span></div>
                        <div class="modal-meta-item"><strong>開演</strong><span>${cleanTime(rawT.time)}</span></div>
                        ${!isFailed ? `
                            <div class="modal-meta-item"><strong>料金</strong><span>${formatPrice(rawT.ticket_price, rawT.currency)}</span></div>
                            <div class="modal-meta-item"><strong>座席</strong><span>${seatDisplay}</span></div>
                        ` : ''}
                        <div class="modal-meta-item" style="grid-column:span 2;"><strong>會場</strong><span>${rawT.venue_name}</span></div>
                    </div>

                    ${companionsHtml}

                    ${!isFailed ? `
                        <div class="modal-ticket-separator"></div><h4 style="color:var(--text-accent); font-family:'Bebas Neue'; letter-spacing:1px; margin-bottom:10px;">SETLIST & MEMO / セトリ・參戰紀錄</h4>
                        <div class="setlist-container" style="background:#0a0a0a; padding:20px; border:1px solid #222; font-family:monospace; max-height:300px; overflow:auto; color:#bbb; line-height:1.6; white-space: pre;">${setlistDisplay ? setlistDisplay : 'No setlist available.'}</div>
                    ` : ''}

                    ${hasLatLng ? `<div class="detail-map-container"><div id="${isMultiVenue ? 'detail-map-flat' : 'detail-map'}"></div></div>` : ''}
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
            <button class="flip-toggle-btn" onclick="toggleTicketFlip(this)">
                <i data-lucide="ticket"></i>
            </button>
        ` : ''}
    `;
    // 更新左上角 Admin 工具 (鎖頭或編輯按鈕)
    updateModalAdminTool(rawT);

    modal.classList.remove('hidden');
    modal.scrollTop = 0;
    toggleBodyScroll(true);
    lucide.createIcons();

    setTimeout(() => {
        if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
        if (hasLatLng) { 
            const coordsArray = rawT.lat_lng.split('|').map(s => s.trim()).filter(s => s !== '');
            const venueNames = (rawT.venue_name || '').split('、').map(v => v.trim()).filter(v => v !== '');
            const latlngs = [];
            const markers = [];
            
            // 根治 scroll 跳轉：暫時攔截 Modal 內所有元素的 focus()，強制加上 preventScroll
            const origFocus = HTMLElement.prototype.focus;
            HTMLElement.prototype.focus = function(opts) {
                origFocus.call(this, Object.assign({ preventScroll: true }, opts));
            };

            maptilersdk.config.apiKey = MAPTILER_API_KEY;

            if (isMultiVenue) {
                // ── 多地標：使用平面地圖（MAP 模式），避免 fitBounds 縮到世界地圖 ──
                detailMapInstance = new maptilersdk.Map({
                    container: 'detail-map-flat',
                    style: maptilersdk.MapStyle.DATAVIZ.DARK,
                    keyboard: false,
                    pitch: 0,
                    bearing: 0,
                    navigationControl: false,
                    geolocateControl: false,
                    doubleClickZoom: false,
                    scrollZoom: false,
                    dragPan: true
                });

                // ① Marker 可在 load 之前就加入（MapLibre 支援），立即執行不需等待
                coordsArray.forEach((coords, idx) => {
                    const [la, ln] = coords.split(',').map(Number);
                    if (!isNaN(la) && !isNaN(ln)) {
                        latlngs.push([ln, la]);

                        const el = document.createElement('div');
                        el.className = 'custom-marker-wrapper';
                        const pin = document.createElement('div');
                        pin.className = 'custom-marker-pin';
                        el.appendChild(pin);

                        // 場地名稱標籤（縮放到一定比例後顯示）
                        const label = document.createElement('div');
                        label.className = 'marker-label-text';
                        const specificName = venueNames[idx] || venueNames[venueNames.length - 1] || rawT.venue_name;
                        label.textContent = specificName;
                        el.appendChild(label);

                        const popup = new maptilersdk.Popup({ offset: [0, -30] })
                            .setHTML(`<strong style="color:white; font-family:'Noto Sans TC';">${specificName}</strong>`);

                        popup.on('open', () => { el.classList.add('popup-open'); });
                        popup.on('close', () => { el.classList.remove('popup-open'); });

                        new maptilersdk.Marker({ element: el, anchor: 'bottom' })
                            .setLngLat([ln, la])
                            .setPopup(popup)
                            .addTo(detailMapInstance);
                    }
                });

                // ② styling + fitBounds 需等 style 載入完畢
                //    三重保險：once('load') + loaded() 即時 + setTimeout fallback
                //    guard flag 防止重複執行
                let flatReady = false;
                const applyFlatMap = () => {
                    if (flatReady || !detailMapInstance) return;
                    flatReady = true;

                    // 套用暗金配色
                    try { detailMapInstance.setPaintProperty('background', 'background-color', '#080808'); } catch(e) {}
                    try {
                        detailMapInstance.getStyle().layers.forEach(layer => {
                            try {
                                if (layer.type === 'fill')   detailMapInstance.setPaintProperty(layer.id, 'fill-color', '#0a0a08');
                                if (layer.type === 'line')   detailMapInstance.setPaintProperty(layer.id, 'line-color', '#2a2018');
                                if (layer.type === 'symbol') {
                                    detailMapInstance.setPaintProperty(layer.id, 'text-color', '#6b5d4d');
                                    detailMapInstance.setPaintProperty(layer.id, 'text-halo-color', '#000000');
                                }
                            } catch(e) {}
                        });
                    } catch(e) {}

                    // 監聽縮放層級自動顯示標籤
                    const flatMapContainer = document.getElementById('detail-map-flat');
                    const updateFlatLabels = () => {
                        if (!flatMapContainer || !detailMapInstance) return;
                        flatMapContainer.classList.toggle('show-marker-labels', detailMapInstance.getZoom() >= 13);
                    };
                    detailMapInstance.on('zoom', updateFlatLabels);

                    // animate:false 確保視野立即套用，不被初始化動畫覆蓋
                    // fitBounds 只接受 [SW, NE] 兩個角落點，需手動計算所有地標的最小/最大值
                    if (latlngs.length > 0) {
                        const minLng = Math.min(...latlngs.map(p => p[0]));
                        const minLat = Math.min(...latlngs.map(p => p[1]));
                        const maxLng = Math.max(...latlngs.map(p => p[0]));
                        const maxLat = Math.max(...latlngs.map(p => p[1]));
                        detailMapInstance.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 14, animate: false });
                    }
                    updateFlatLabels();
                };

                detailMapInstance.once('load', applyFlatMap);                       // 正常非同步載入
                if (detailMapInstance.loaded && detailMapInstance.loaded()) applyFlatMap(); // style 已快取立即執行
                setTimeout(applyFlatMap, 500);                                      // 終極保險：500ms 後若仍未執行則強制觸發
            } else {
                // ── 單一地標：使用 3D 建築物街道地圖 ──
                detailMapInstance = new maptilersdk.Map({
                    container: 'detail-map',
                    style: maptilersdk.MapStyle.STREETS.DARK, // 暗色街道地圖，支援 3D 建築物渲染
                    keyboard: false,
                    pitch: 55,
                    bearing: -10,
                    navigationControl: false,
                    geolocateControl: false,
                    doubleClickZoom: false,
                    scrollZoom: false,
                    dragPan: true
                });

                let isUserInteracting = false;
                
                // 監聽拖曳開始與結束，暫停/恢復自動旋轉
                detailMapInstance.on('dragstart', () => {
                    isUserInteracting = true;
                });
                detailMapInstance.on('dragend', () => {
                    clearTimeout(window.detailMapRotationTimeout);
                    // 停止拖曳 3 秒後重啟自動旋轉
                    window.detailMapRotationTimeout = setTimeout(() => {
                        isUserInteracting = false;
                    }, 3000);
                });

                function rotateCamera() {
                    // 若地圖實例已銷毀，或彈窗被關閉，則終止動畫迴圈，釋放 CPU 資源
                    if (!detailMapInstance || modal.classList.contains('hidden')) {
                        return;
                    }
                    if (!isUserInteracting) {
                        const currentBearing = detailMapInstance.getBearing();
                        detailMapInstance.setBearing((currentBearing + 0.15) % 360);
                    }
                    requestAnimationFrame(rotateCamera);
                }

                // 地圖載入完成後，全面改裝配色為暗金主題
                detailMapInstance.on('load', () => {
                    // 先將底圖背景色強制設為純黑
                    try { detailMapInstance.setPaintProperty('background', 'background-color', '#080808'); } catch(e) {}

                    const layers = detailMapInstance.getStyle().layers;
                    layers.forEach(layer => {
                        try {
                            // 1. 所有 fill 圖層（陸地、水域、公園、商業區等）一律壓成極深黑
                            //    不再依賴圖層名稱匹配，確保不會有任何藍色/綠色/灰色殘留
                            if (layer.type === 'fill') {
                                detailMapInstance.setPaintProperty(layer.id, 'fill-color', '#0a0a08');
                            }

                            // 2. 3D 建築物 → 深棕黑，帶微弱金色調
                            if (layer.type === 'fill-extrusion') {
                                detailMapInstance.setPaintProperty(layer.id, 'fill-extrusion-color', '#1a1510');
                                detailMapInstance.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.85);
                            }

                            // 3. 所有線條圖層（道路、街道、邊界、鐵路等）→ 暗金棕色
                            if (layer.type === 'line') {
                                detailMapInstance.setPaintProperty(layer.id, 'line-color', '#2a2018');
                            }

                            // 4. 地名標籤文字 → 暗金色 + 純黑光暈
                            if (layer.type === 'symbol') {
                                detailMapInstance.setPaintProperty(layer.id, 'text-color', '#6b5d4d');
                                detailMapInstance.setPaintProperty(layer.id, 'text-halo-color', '#000000');
                            }
                        } catch(e) {} // 部分圖層可能使用 data-driven 表達式，跳過即可
                    });
                    
                    // 開始自動旋轉
                    requestAnimationFrame(rotateCamera);
                });

                // 單一地標：在 load 外加 Marker（Marker 不依賴 style，可提前加入）
                coordsArray.forEach((coords, idx) => {
                    const [la, ln] = coords.split(',').map(Number);
                    if (!isNaN(la) && !isNaN(ln)) {
                        latlngs.push([ln, la]);

                        const el = document.createElement('div');
                        el.className = 'custom-marker-wrapper';
                        const pin = document.createElement('div');
                        pin.className = 'custom-marker-pin';
                        el.appendChild(pin);

                        const specificName = venueNames[idx] || venueNames[venueNames.length - 1] || rawT.venue_name;
                        const popup = new maptilersdk.Popup({ offset: [0, -30] })
                            .setHTML(`<strong style="color:white; font-family:'Noto Sans TC';">${specificName}</strong>`);

                        const marker = new maptilersdk.Marker({ element: el, anchor: 'bottom' })
                            .setLngLat([ln, la])
                            .setPopup(popup)
                            .addTo(detailMapInstance);

                        markers.push({ marker, popup });
                    }
                });

                if (latlngs.length === 1) {
                    detailMapInstance.setCenter(latlngs[0]);
                    detailMapInstance.setZoom(17);
                    setTimeout(() => {
                        if (markers.length > 0) markers[0].marker.togglePopup();
                    }, 400);
                }
            }
            // 1 秒後還原原生 focus，不影響後續操作
            setTimeout(() => { HTMLElement.prototype.focus = origFocus; }, 1000);
        }
    }, 300);
}

window.closeModal = () => {
    modal.classList.add('hidden');
    document.getElementById('login-modal').classList.add('hidden');
    document.body.classList.remove('login-open'); // 關閉時移除類別
    const adminTool = document.getElementById('modal-admin-tool-inner');
    if (adminTool) adminTool.innerHTML = ''; // 清除 Admin 工具
    toggleBodyScroll(false);
    
    // 立即銷毀詳情地圖實例，釋放 WebGL 與 CPU 資源，防止背景持續旋轉耗能
    if (detailMapInstance) {
        detailMapInstance.remove();
        detailMapInstance = null;
    }
    clearTimeout(window.detailMapRotationTimeout);
    
    // 關閉的同時將滾動條重置歸零，確保下一次打開任何票券時，燈箱都是從最頂部開始呈現
    modal.scrollTop = 0;
};

window.openLogin = (callback = null) => { 
    // 如果選單是開啟狀態，則關閉它
    if (document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }
    document.getElementById('login-modal').classList.remove('hidden'); 
    document.body.classList.add('login-open'); // 開啟登入時加入類別
    document.getElementById('admin-pass').focus(); 
    toggleBodyScroll(true);
    window.loginCallback = callback;
};

window.checkLogin = async () => { 
    const passInput = document.getElementById('admin-pass');
    const pass = passInput.value; 
    const loginBtn = document.querySelector('#login-modal button');
    
    // 取得當前使用者名稱
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching'; 

    if (pass.length === 0) return;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';

    try {
        const res = await fetch(`${GAS_API_URL}?action=login&u=${currentUser}&p=${encodeURIComponent(pass)}`);
        const result = await res.json();

        if (result.success) {
            adminPassword = pass; 
            
            // 儲存登入資訊 (有效期 24 小時)
            const expiry = new Date().getTime() + LOGIN_EXPIRY_MS;
            localStorage.setItem(`livenote_auth_${currentUser}`, JSON.stringify({ pass, expiry }));

            document.getElementById('login-modal').classList.add('hidden');
            document.body.classList.remove('login-open'); 
            
            const addBtn = document.getElementById('admin-add-btn');
            if (addBtn) addBtn.classList.remove('hidden');
            updateCalendarButtonsVisibility();

            // 執行登入後的回調 (例如開啟表單)
            if (window.loginCallback) {
                window.loginCallback();
                window.loginCallback = null;
            } else {
                // 如果沒有回調且光箱開著，重新渲染光箱以顯示編輯按鈕
                if (!document.getElementById('modal').classList.contains('hidden') && window.currentDetailId) {
                    openDetail(window.currentDetailId);
                }
            }
        } else {
            await showAlert('密碼錯誤！Invalid Password.', 'error');
            passInput.value = '';
            passInput.focus();
        }
    } catch (e) {
        console.error('Login error:', e);
        await showAlert('驗證時發生錯誤，請稍後再試。', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Unlock';
    }
}

// --- 全域變數優化 ---
let processedVenuesGlobal = [];

function showAdminForm(editData = null) {
    // 關鍵優化：如果沒有密碼，先要求登入，登入成功後再回來執行 showAdminForm
    if (!adminPassword) {
        openLogin(() => showAdminForm(editData));
        return;
    }

    // 進入編輯模式時，隱藏左上角的工具按鈕 (EDIT 按鈕或鎖頭)
    const adminTool = document.getElementById('modal-admin-tool-inner');
    if (adminTool) adminTool.innerHTML = '';

    // 如果側邊選單是開啟狀態，則關閉它，避免擋住表單
    if (document.getElementById('side-menu').classList.contains('open')) {
        toggleMenu();
    }
// ... (rest of the function)

    // 重置翻轉狀態，避免開啟表單時是翻轉的
    modal.querySelector('.modal-content').classList.remove('flipped');
    
    // 處理並儲存到全域變數，供輸入監聽使用
    processedVenuesGlobal = venueConfig.map(v => {
        let region = v.region || 'OTHER';
        if (!v.region && v.lat_lng) {
            const ln = parseFloat(v.lat_lng.split(',')[1]);
            if (ln > 128) region = 'JP';
            else if (ln > 118 && ln < 125) region = 'TW';
        }
        return { ...v, _region: region };
    });

    // 產生會場建議標籤 (過濾已選、支援搜尋)
    window.updateVenueList = (region = 'ALL', searchTerm = '') => {
        const container = document.getElementById('venue-quick-tags');
        const vInput = document.querySelector('input[name="venue_name"]');
        if (!container || !vInput) return;

        // 當切換到 Google 搜尋模式時的專屬邏輯 (支援語系切換)
        if (region === 'G_TW' || region === 'G_JP' || region === 'G_OTHER') {
            clearTimeout(window.googleSearchTimeout);
            document.querySelectorAll('.venue-cat-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.region === region);
            });
            
            // 如果從點擊標籤進來沒傳 searchTerm，嘗試從輸入框抓取
            if (!searchTerm) {
                const parts = vInput.value.split('、');
                searchTerm = parts[parts.length - 1].trim();
            }
            
            if (searchTerm.trim().length > 0) {
                container.innerHTML = '<span style="color:#888; font-size:0.8rem;"><i data-lucide="loader-2" class="spin" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> 搜尋 Google Maps 中...</span>';
                lucide.createIcons();
                
                window.googleSearchTimeout = setTimeout(() => {
                    if (typeof google === 'object' && typeof google.maps === 'object' && google.maps.places) {
                        if (!window.googleAutocompleteService) window.googleAutocompleteService = new google.maps.places.AutocompleteService();
                        
                        // 根據點擊的標籤設定搜尋語系與地區限制
                        let lang = 'en';
                        let country = null;
                        if (region === 'G_TW') { lang = 'zh-TW'; country = 'tw'; }
                        else if (region === 'G_JP') { lang = 'ja'; country = 'jp'; }

                        const requestObj = { input: searchTerm, language: lang };
                        if (country) { requestObj.componentRestrictions = { country: country }; }

                        window.googleAutocompleteService.getPlacePredictions(requestObj, (predictions, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                                container.innerHTML = predictions.slice(0, 5).map(p => {
                                    return `<span class="tag-chip" style="border-color: #4285F4; color: #4285F4; background: rgba(66, 133, 244, 0.1);" onclick="selectGooglePlace('${p.place_id}', '${p.description.replace(/'/g, "\\'")}', '${lang}')">
                                        <i data-lucide="map-pin" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> ${p.structured_formatting ? p.structured_formatting.main_text : p.description.split(',')[0]}
                                    </span>`;
                                }).join('');
                                lucide.createIcons();
                            } else {
                                container.innerHTML = '<span style="color:#888; font-size:0.8rem;">找不到相關地標，請嘗試其他關鍵字。</span>';
                            }
                        });
                    } else {
                        container.innerHTML = '<span style="color:#888; font-size:0.8rem;">Google Maps API 未載入或 Key 無效。</span>';
                    }
                }, 600); // 600ms debounce 防連點
            } else {
                container.innerHTML = '<span style="color:#888; font-size:0.8rem;">請在上方輸入會場關鍵字，Google 將為您搜尋座標...</span>';
            }
            return;
        }

        // --- 以下為原本的本地地標 (ALL/TW/JP/OTHER) 邏輯 ---

        // 取得目前輸入框中已有的所有會場名稱 (用於排除)
        const selectedVenues = vInput.value.split(/[、,，]+/).map(s => s.trim()).filter(s => s !== '');

        let filtered = region === 'ALL' ? processedVenuesGlobal : processedVenuesGlobal.filter(v => v._region === region);
        
        // 1. 排除已選會場
        filtered = filtered.filter(v => !selectedVenues.includes(v.venue_name));

        // 2. 如果有搜尋字串，進一步過濾
        if (searchTerm.trim() !== '') {
            const s = searchTerm.toLowerCase();
            filtered = filtered.filter(v => v.venue_name.toLowerCase().includes(s));
        }

        // 只顯示前 15 個結果
        container.innerHTML = filtered.slice(0, 15).map(v => 
            `<span class="tag-chip" onclick="addVenueToField('${v.venue_name.replace(/'/g, "\\'")}', '${v.lat_lng}')">+ ${v.venue_name}</span>`
        ).join('');
        
        document.querySelectorAll('.venue-cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === region);
        });
    };

    // 自動同步座標的邏輯
    window.syncCoordinates = () => {
        const vInput = document.querySelector('input[name="venue_name"]');
        const lInput = document.querySelector('input[name="lat_lng"]');
        if (!vInput || !lInput) return;

        const venues = vInput.value.split(/[、,，]+/).map(s => s.trim()).filter(s => s !== '');
        const coords = [];

        venues.forEach(name => {
            const config = processedVenuesGlobal.find(v => v.venue_name === name);
            if (config && config.lat_lng) {
                coords.push(config.lat_lng);
            }
        });

        if (coords.length > 0) {
            lInput.value = coords.join(' | ');
        }
    };

    // 會場輸入變更時觸發
    window.onVenueInputChange = (val) => {
        const vInput = document.querySelector('input[name="venue_name"]');
        if (!vInput) return;

        // 1. 統一轉換分隔符號
        const converted = val.replace(/[,，]/g, '、');
        if (converted !== val) {
            const start = vInput.selectionStart;
            vInput.value = converted;
            vInput.setSelectionRange(start, start);
        }

        // 2. 取得目前正在輸入的片段 (最後一個 、 之後的文字)
        const parts = converted.split('、');
        const currentSearch = parts[parts.length - 1].trim();

        // 3. 讀取目前地區並更新下方標籤
        const activeRegionBtn = document.querySelector('.venue-cat-btn.active');
        const currentRegion = activeRegionBtn ? activeRegionBtn.dataset.region : 'ALL';
        
        updateVenueList(currentRegion, currentSearch);

        // 4. 嘗試同步座標
        syncCoordinates();
    };

    // 2. 處理藝人建議 (仍來自 allTickets 統計)
    const artistCounts = {};
    allTickets.forEach(t => {
        if (!['EXHIBITION', 'SCREENING'].includes(t.type)) {
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
        }
    });

    const sortedArtists = Object.entries(artistCounts).sort((a,b) => b[1] - a[1]);
    const artistOptions = sortedArtists.map(a => `<option value="${a[0]}">`).join('');
    
    // 產生前 12 名常用藝人標籤供快速新增
    const quickTags = sortedArtists.slice(0, 12).map(a => 
        `<span class="tag-chip" onclick="addArtistToField('artist_list', '${a[0].replace(/'/g, "\\'")}')">+ ${a[0]}</span>`
    ).join('');

    // 產生熱門藝人標籤 (從 allTickets 統計)
    window.updateArtistList = (searchTerm = '') => {
        const container = document.getElementById('artist-quick-tags');
        const aInput = document.getElementById('form-artist-list');
        if (!container || !aInput) return;

        // 取得目前已輸入的所有藝人 (用於排除)
        const selectedArtists = aInput.value.split(/[、,，]+/).map(s => s.trim()).filter(s => s !== '');

        let filtered = sortedArtists;
        
        // 1. 排除已選藝人
        filtered = filtered.filter(a => !selectedArtists.includes(a[0]));

        // 2. 如果有搜尋字串，進一步過濾
        if (searchTerm.trim() !== '') {
            const s = searchTerm.toLowerCase();
            filtered = filtered.filter(a => a[0].toLowerCase().includes(s));
        }

        // 只顯示前 15 個結果
        container.innerHTML = filtered.slice(0, 15).map(a => 
            `<span class="tag-chip" onclick="addArtistToField('artist_list', '${a[0].replace(/'/g, "\\'")}')">+ ${a[0]}</span>`
        ).join('');
    };

    // 出演者名單輸入變更時觸發
    window.onArtistListInputChange = (val) => {
        const aInput = document.getElementById('form-artist-list');
        if (!aInput) return;

        // 1. 統一轉換分隔符號 (將逗號轉換為頓號)
        const converted = val.replace(/[,，]/g, '、');
        if (converted !== val) {
            const start = aInput.selectionStart;
            aInput.value = converted;
            aInput.setSelectionRange(start, start);
        }

        // 2. 取得目前正在輸入的片段 (最後一個 、 之後的文字)
        const parts = converted.split('、');
        const currentSearch = parts[parts.length - 1].trim();

        // 3. 更新下方標籤
        updateArtistList(currentSearch);
    };

    // 產生熱門會場標籤 (從 venueConfig 取得)
    const quickVenues = processedVenuesGlobal.slice(0, 12).map(v => 
        `<span class="tag-chip" onclick="addVenueToField('${v.venue_name.replace(/'/g, "\\'")}', '${v.lat_lng}')">+ ${v.venue_name}</span>`
    ).join('');

    // 夥伴選擇器渲染
    const currentCompanions = editData && editData.tag ? String(editData.tag).split(',').map(u => u.trim()).filter(u => u !== '') : [];
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    // 排除自己後的夥伴清單
    const companionOptionsHtml = allUsers.filter(u => u.username !== currentUser).map(u => {
        const isActive = currentCompanions.includes(u.username);
        return `
            <div class="companion-tag-chip ${isActive ? 'active' : ''}" 
                 onclick="toggleCompanionTag(this, '${u.username}')"
                 data-username="${u.username}"
                 style="display:flex; align-items:center; gap:8px; padding:6px 14px; background:${isActive ? 'rgba(197, 164, 137, 0.15)' : '#111'}; border:1px solid ${isActive ? 'var(--text-accent)' : '#333'}; border-radius:25px; cursor:pointer; transition:all 0.3s; box-shadow: ${isActive ? '0 0 10px rgba(197, 164, 137, 0.2)' : 'none'};">
                <div style="width:26px; height:26px; border-radius:50%; overflow:hidden; background:#222; flex-shrink:0; border:1.5px solid ${isActive ? 'var(--text-accent)' : 'transparent'}; transition:all 0.3s;">
                    ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` : '<i data-lucide="user" style="width:14px; color:#555; margin-top:5px; display:block; margin-left:auto; margin-right:auto;"></i>'}
                </div>
                <span style="font-size:0.85rem; font-family:'Bebas Neue'; letter-spacing:1px; color:${isActive ? 'var(--text-accent)' : '#888'};">${u.username.toUpperCase()} ${isActive ? '<i data-lucide="check" style="width:12px; vertical-align:middle; margin-left:4px;"></i>' : ''}</span>
            </div>
        `;
    }).join('');

    // 如果是編輯模式，預設里程碑處理
    const ms = editData ? (editData.is_first_time || '').toString().split(/[、,]+/).map(s => s.trim()) : [];

    modalBody.innerHTML = `
        <div class="modal-front" style="padding: 2rem; box-sizing: border-box;">
            <h2 style="color:var(--text-accent); font-family:'Bebas Neue'; margin-bottom:1.5rem; font-size:2rem; letter-spacing:1px;">
                ${editData ? 'EDIT TICKET' : 'ADD NEW TICKET'}
            </h2>
            <form id="admin-form" onsubmit="event.preventDefault(); handleSave();" style="display:flex; flex-direction:column; gap:15px;">
                <input type="hidden" name="id" value="${editData ? editData.id : ''}">
                <input type="hidden" name="tag" id="form-tag-field" value="${editData ? (editData.tag || '') : ''}">
                
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
                        <option value="SOUND_LEAK" ${editData?.type==='SOUND_LEAK'?'selected':''}>場外音漏</option>
                        <option value="HYBRID_LEAK" ${editData?.type==='HYBRID_LEAK'?'selected':''}>場外音漏 (直播同步)</option>
                        <option value="SCREENING" ${editData?.type==='SCREENING'?'selected':''}>映像上映</option>
                        <option value="STAGE" ${editData?.type==='STAGE'?'selected':''}>舞台劇 / 演劇</option>
                        <option value="SIGNING" ${editData?.type==='SIGNING'?'selected':''}>簽名會</option>
                        <option value="FAN_MEETING" ${editData?.type==='FAN_MEETING'?'selected':''}>見面會</option>
                        <option value="GREETING" ${editData?.type==='GREETING'?'selected':''}>挨拶 / 舞台挨拶</option>
                        <option value="EXHIBITION" ${editData?.type==='EXHIBITION'?'selected':''}>展覽</option>
                        <option value="EVENT" ${editData?.type==='EVENT'?'selected':''}>活動</option>
                        <option value="SPORTS" ${editData?.type==='SPORTS'?'selected':''}>運動賽事</option>
                    </select></div>
                    <div style="flex:1;"><label>狀態</label><select name="status" style="width:100%;">
                        <option value="CONFIRMED" ${editData?.status==='CONFIRMED'?'selected':''}>參戰確定</option>
                        <option value="COMPLETED" ${editData?.status==='COMPLETED'?'selected':''}>參戰完畢</option>
                        <option value="APPLIED" ${editData?.status==='APPLIED'?'selected':''}>抽選中 / 待搶票</option>
                        <option value="FAILED_DRAW" ${editData?.status==='FAILED_DRAW'?'selected':''}>落選</option>
                        <option value="FAILED_TICKET" ${editData?.status==='FAILED_TICKET'?'selected':''}>搶票失敗</option>
                        <option value="CANCELLED" ${editData?.status==='CANCELLED'?'selected':''}>公演取消</option>
                    </select></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>主角/出演・出賽 (Main Focus)</label>
                    <input type="text" name="artist" list="artist-list" placeholder="單一藝人專場請填此 (FES可留空)" value="${editData ? editData.artist : ''}" autocomplete="off" spellcheck="false">
                    <datalist id="artist-list">${artistOptions}</datalist>
                </div>

                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>共演陣容/嘉賓 (多位使用、隔開)</label>
                    <input type="text" name="artist_list" id="form-artist-list" placeholder="FES、拼盤請填此;ex: LiSA、May'n" value="${editData ? (editData.artist_list || '') : ''}" oninput="onArtistListInputChange(this.value)" autocomplete="off" spellcheck="false">
                    <div id="artist-quick-tags" class="quick-add-tags">${quickTags}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>巡迴/活動標題</label><input type="text" name="tour_title" placeholder="例如: ASIA TOUR 2024" required value="${editData ? editData.tour_title : ''}"></div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <label>會場名稱 (多會場用、隔開)</label>
                    <div class="venue-cat-container">
                        <div class="venue-cat-btn active" data-region="ALL" onclick="updateVenueList('ALL')">ALL</div>
                        <div class="venue-cat-btn" data-region="TW" onclick="updateVenueList('TW')">TAIWAN</div>
                        <div class="venue-cat-btn" data-region="JP" onclick="updateVenueList('JP')">JAPAN</div>
                        <div class="venue-cat-btn" data-region="OTHER" onclick="updateVenueList('OTHER')">OTHER</div>
                    </div>
                    <div class="venue-cat-container" style="margin-top: 5px;">
                        <div class="venue-cat-btn" data-region="G_TW" onclick="updateVenueList('G_TW')" style="color:#4285F4; border-color:#4285F4;">GOOGLE-TAIWAN</div>
                        <div class="venue-cat-btn" data-region="G_JP" onclick="updateVenueList('G_JP')" style="color:#4285F4; border-color:#4285F4;">GOOGLE-JAPAN</div>
                        <div class="venue-cat-btn" data-region="G_OTHER" onclick="updateVenueList('G_OTHER')" style="color:#4285F4; border-color:#4285F4;">GOOGLE-OTHER</div>
                    </div>
                    <input type="text" name="venue_name" id="form-venue-name" placeholder="例如: 台北巨蛋 (台北)" required value="${editData ? editData.venue_name : ''}" oninput="onVenueInputChange(this.value)" autocomplete="off" spellcheck="false">
                </div>

                <div style="display:flex; flex-direction:column; gap:5px;">
                    <div id="venue-quick-tags" class="quick-add-tags">${quickVenues}</div>
                    <label>經緯度 (Map Coords)</label>
                    <input type="text" name="lat_lng" id="form-lat-lng" placeholder="例如: 25.051, 121.550" value="${editData ? (editData.lat_lng || '') : ''}">
                </div>
                
                <div style="display:flex; gap:10px;">
                    <div style="width:100px;"><label>幣別</label><select name="currency" style="width:100%;">
                        <option value="TWD" ${editData?.currency==='TWD'?'selected':''}>TWD</option>
                        <option value="JPY" ${editData?.currency==='JPY'?'selected':''}>JPY</option>
                        <option value="HKD" ${editData?.currency==='HKD'?'selected':''}>HKD</option>
                        <option value="USD" ${editData?.currency==='USD'?'selected':''}>USD</option>
                    </select></div>
                    <div style="flex:1;"><label>票價</label><input type="number" name="ticket_price" placeholder="票價" style="width:100%;" value="${editData ? editData.ticket_price : ''}"></div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:5px;"><label>座席資訊</label><input type="text" name="seat_info" placeholder="例如: 特區 B2排 12號" value="${editData ? (editData.seat_info || '') : ''}"></div>
                <div style="display:flex; flex-direction:column; gap:5px;"><label>歌單&紀錄</label><textarea name="setlist" placeholder="請輸入..." rows="5">${editData ? (editData.setlist || '') : ''}</textarea></div>
                
                <!-- 參戰夥伴選擇 (僅限新增模式顯示較佳，但統一放也行) -->
                <div style="display:flex; flex-direction:column; gap:8px; background: #0a0a0a; padding: 12px; border-radius: 8px; border: 1px solid #222;">
                    <label style="font-size: 0.8rem; letter-spacing: 1px; color: var(--text-accent); font-family: 'Bebas Neue';">WITH COMPANIONS / 參戰夥伴</label>
                    <div style="display:flex; gap:10px; flex-wrap: wrap;" id="companion-selector">
                        ${companionOptionsHtml || '<p style="color:#444; font-size:0.8rem; margin:0;">No other users found.</p>'}
                    </div>
                </div>

                <!-- 封面圖片上傳 -->
                <div style="display:flex; flex-direction:column; gap:8px; background: #0a0a0a; padding: 12px; border-radius: 8px; border: 1px solid #222;">
                    <label style="font-size: 0.8rem; letter-spacing: 1px; color: var(--text-accent); font-family: 'Bebas Neue';">COVER IMAGE / 封面圖片</label>
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
                        <input type="text" name="images" placeholder="https://..." value="${editData ? (editData.images || '') : ''}" style="flex:1; min-width: 150px; border-color: #333; background: #000;">
                        <input type="file" id="file-images" accept="image/*" style="display:none;" onchange="handleFileUpload(this, 'images')">
                        <button type="button" onclick="document.getElementById('file-images').click()" class="upload-btn">
                            <i data-lucide="image-plus"></i> <span>UPLOAD</span>
                        </button>
                    </div>
                </div>

                <!-- 票券圖片上傳 -->
                <div style="display:flex; flex-direction:column; gap:8px; background: #0a0a0a; padding: 12px; border-radius: 8px; border: 1px solid #222;">
                    <label style="font-size: 0.8rem; letter-spacing: 1px; color: var(--text-accent); font-family: 'Bebas Neue';">TICKET STUB / 票券圖片</label>
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
                        <input type="text" name="ticket_image" placeholder="https://..." value="${editData ? (editData.ticket_image || '') : ''}" style="flex:1; min-width: 150px; border-color: #333; background: #000;">
                        <input type="file" id="file-ticket" accept="image/*" style="display:none;" onchange="handleFileUpload(this, 'ticket_image')">
                        <button type="button" onclick="document.getElementById('file-ticket').click()" class="upload-btn">
                            <i data-lucide="ticket"></i> <span>UPLOAD</span>
                        </button>
                    </div>
                </div>
                
                <div style="background:#1a1a1a; padding:15px; border-radius:8px; margin-top:5px; border:1px solid #333;">
                    <label style="display:block; margin-bottom:12px; font-weight:bold; color:var(--text-accent); font-size:0.9rem; letter-spacing:1px;">MILESTONES / 紀念紀錄</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="ARTIST" ${ms.includes('ARTIST')?'checked':''}> 初參戰</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="EXPEDITION" ${ms.includes('EXPEDITION')?'checked':''}> 初遠征</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="VENUE" ${ms.includes('VENUE')?'checked':''}> 初会場</label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.85rem;"><input type="checkbox" name="milestone" value="EVENT" ${ms.includes('EVENT')?'checked':''}> 初參加</label>
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button type="submit" id="save-btn" style="flex:2; background:var(--text-accent); color:black; padding:15px; font-weight:bold; font-family:'Bebas Neue'; border:none; font-size:1.2rem; cursor:pointer; border-radius:4px; transition:all 0.3s;">
                        ${editData ? 'UPDATE TICKET' : 'SAVE TICKET'}
                    </button>
                    ${editData ? `
                        <button type="button" id="delete-btn" onclick="handleDelete('${editData.id}')" style="flex:1; background:#441111; color:#ff6666; border:1px solid #662222; padding:15px; font-weight:bold; font-family:'Bebas Neue'; border-radius:4px; cursor:pointer; font-size:1.2rem;">
                            DELETE
                        </button>
                    ` : ''}
                </div>
            </form>
        </div>
    `;
    modal.classList.remove('hidden');
    toggleBodyScroll(true);
    lucide.createIcons();
    
    // 初始化場地清單顯示為 ALL
    updateVenueList('ALL');
}

window.selectGooglePlace = async function(placeId, fallbackName, lang = 'zh-TW') {
    // 1. 檢查 Google SDK 是否載入
    if (typeof google !== 'object' || !google.maps) return;

    const vInput = document.querySelector('input[name="venue_name"]');
    if (vInput) vInput.style.opacity = '0.5';

    try {
        // 2. 匯入新的 Places 程式庫並建立 Place 實例
        const { Place } = await google.maps.importLibrary("places");
        const place = new Place({
            id: placeId,
            requestedLanguage: lang
        });

        // 3. 請求欄位資料 (新版欄位名稱略有不同)
        // displayName 對應舊版的 name
        // location 對應舊版的 geometry.location
        // addressComponents 對應舊版的 address_components
        await place.fetchFields({
            fields: ['displayName', 'location', 'addressComponents']
        });

        if (vInput) vInput.style.opacity = '1';

        if (place.location) {
            const rawName = place.displayName.replace(/臺/g, "台");
            // location.lat() 與 lng() 依然是函數
            const newLatLng = `${place.location.lat().toFixed(5)}, ${place.location.lng().toFixed(5)}`;
            
            let cityName = '';
            if (place.addressComponents) {
                // 注意：新版屬性名為小駝峰 (shortText, longText)
                const admin1 = place.addressComponents.find(c => c.types.includes('administrative_area_level_1'));
                const locality = place.addressComponents.find(c => c.types.includes('locality'));
                
                if (admin1) {
                    cityName = (admin1.shortText || admin1.longText)
                        .replace(/臺/g, "台")
                        .replace(/[市縣]/g, "");
                } else if (locality) {
                    cityName = (locality.shortText || locality.longText)
                        .replace(/臺/g, "台")
                        .replace(/[市縣]/g, "");
                }
            }
            
            const formattedName = cityName ? `${rawName} (${cityName})` : rawName;
            
            // 執行你原本的 UI 更新邏輯
            addVenueToField(formattedName, newLatLng);
            updateVenueList('ALL');
            
            document.querySelectorAll('.venue-cat-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.region === 'ALL');
            });
        } else {
            throw new Error('Place location not found');
        }

    } catch (error) {
        console.error("Google Places API Error:", error);
        if (vInput) vInput.style.opacity = '1';
        
        // 錯誤時的回退邏輯
        addVenueToField(fallbackName.split(' ')[0], ''); 
        updateVenueList('ALL');
    }
};

window.toggleCompanionTag = function(element, username) {
    element.classList.toggle('active');
    
    // 獲取所有選中的 username
    const selected = Array.from(document.querySelectorAll('.companion-tag-chip.active'))
                          .map(el => el.dataset.username);
    
    // 更新隱藏欄位
    const tagField = document.getElementById('form-tag-field');
    if (tagField) {
        tagField.value = selected.join(',');
    }

    // 視覺回饋樣式
    if (element.classList.contains('active')) {
        element.style.borderColor = 'var(--text-accent)';
        element.style.background = 'rgba(197, 164, 137, 0.1)';
    } else {
        element.style.borderColor = '#333';
        element.style.background = '#111';
    }
}

window.handleDelete = async function(id) {
    const delBtn = document.getElementById('delete-btn');
    const saveBtn = document.getElementById('save-btn');
    if (delBtn && delBtn.disabled) return;

    if (!await showConfirm('確定要刪除這筆紀錄嗎？(Delete this record?)')) return;
    if (!GAS_API_URL) return;

    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    if (saveBtn) saveBtn.disabled = true;
    if (delBtn) {
        delBtn.disabled = true;
        delBtn.textContent = 'Deleting...';
    }

    try {
        await fetch(GAS_API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ 
                username: currentUser,
                password: adminPassword, 
                data: { id: id, status: 'HIDDEN' } 
            }) 
        }); 
        
        // 關鍵：刪除成功後立刻清除快取，強迫下次進入抓最新
        localStorage.removeItem(`livenote_cache_${currentUser}`);
        
        await showAlert('紀錄已刪除！', 'success'); 
        closeModal(); 
        location.reload(); 
    } catch (e) { 
        await showAlert('刪除失敗：' + e.toString(), 'error'); 
        if (saveBtn) saveBtn.disabled = false;
        if (delBtn) {
            delBtn.disabled = false;
            delBtn.textContent = 'DELETE';
        }
    }
}

window.handleSave = async function() {
    const saveBtn = document.getElementById('save-btn');
    const delBtn = document.getElementById('delete-btn');
    if (saveBtn && saveBtn.disabled) return;

    if (!GAS_API_URL) { await showAlert('請先設定 GAS_API_URL', 'error'); return; }
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    const form = document.getElementById('admin-form'); 
    const formData = new FormData(form); 
    const data = {};
    formData.forEach((val, key) => {
        if (key !== 'milestone') {
            let cleanVal = typeof val === 'string' ? val.trim() : val;
            if (key === 'venue_name' || key === 'artist_list') {
                let standardized = cleanVal.replace(/[\/,，|、\n\r\t]+/g, '、');
                cleanVal = standardized.split('、').map(item => item.trim()).filter(item => item !== '').join('、');
            }
            data[key] = cleanVal;
        }
    });
    const skipArtistCheck = ['EVENT', 'SPORTS','EXHIBITION','SCREENING'].includes(data.type);
    if (!skipArtistCheck && !data.artist.trim() && !data.artist_list.trim()) {
        await showAlert('請至少填寫「主要藝人」或「出演者名單」其中一項！', 'error');
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true; 
        saveBtn.textContent = 'Saving...';
    }
    if (delBtn) delBtn.disabled = true;
    
    const milestones = [];
    form.querySelectorAll('input[name="milestone"]:checked').forEach(cb => milestones.push(cb.value));
    data.is_first_time = milestones.join(',');

    try { 
        await fetch(GAS_API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ 
                username: currentUser,
                password: adminPassword, 
                data: data 
            }) 
        }); 

        // 關鍵：儲存成功後立刻清除快取
        localStorage.removeItem(`livenote_cache_${currentUser}`);

        await showAlert('紀錄已送出！', 'success'); 
        closeModal(); 
        location.reload(); 
    } catch (e) { 
        await showAlert('儲存失敗：' + e.toString(), 'error'); 
        if (saveBtn) {
            saveBtn.disabled = false; 
            saveBtn.textContent = 'SAVE TICKET'; 
        }
        if (delBtn) delBtn.disabled = false;
    }
}

window.addArtistToField = function(fieldName, artistName) {
    const input = document.querySelector(`input[name="${fieldName}"]`);
    if (!input) return;
    
    let current = input.value.trim();
    if (!current) {
        input.value = artistName;
    } else {
        // 取得目前的藝人片段 (以、隔開)
        const parts = current.split('、');
        // 取代最後一個正在輸入的片段 (例如 "li" -> "LiSA")
        parts[parts.length - 1] = artistName;
        // 確保沒有重複且過濾空項
        const uniqueParts = [...new Set(parts.map(p => p.trim()).filter(p => p !== ''))];
        input.value = uniqueParts.join('、');
    }

    // 觸發藝人建議清單更新 (搜尋清空)
    if (window.updateArtistList) {
        updateArtistList('');
    }

    // 視覺回饋
    input.style.borderColor = 'var(--text-accent)';
    setTimeout(() => { input.style.borderColor = '#333'; }, 300);
}

window.addVenueToField = function(venueName, latLng) {
    console.log("Adding venue:", venueName, "with coords:", latLng);
    const vInput = document.querySelector('input[name="venue_name"]');
    const lInput = document.querySelector('input[name="lat_lng"]');
    if (!vInput || !lInput) return;

    // 處理會場名稱：智慧型取代最後一個片段
    let vVal = vInput.value.trim();
    if (!vVal) {
        vInput.value = venueName;
    } else {
        const parts = vVal.split('、');
        // 取代最後一個正在輸入的殘缺片段
        parts[parts.length - 1] = venueName;
        // 確保沒有重複
        const uniqueParts = [...new Set(parts.map(p => p.trim()).filter(p => p !== ''))];
        vInput.value = uniqueParts.join('、');
    }

    // 處理經緯度 (Map Coords)：
    // 如果 latLng 有傳入值 (例如來自 Google 搜尋標籤或預設場地)
    if (latLng) {
        let currentCoords = lInput.value.trim();
        if (!currentCoords) {
            lInput.value = latLng;
        } else {
            // 如果原本已經有座標，確保數量與會場數量一致 (以 | 分隔)
            const venuesCount = vInput.value.split('、').length;
            const coordsCount = currentCoords.split('|').length;
            
            // 如果數量少於會場數，就把新座標接在後面；否則直接覆蓋確保不混亂
            if (coordsCount < venuesCount) {
                lInput.value = currentCoords + ' | ' + latLng;
            } else {
                lInput.value = latLng;
            }
        }
    } else {
        // 如果沒有傳入明確的 latLng，則嘗試從預設 config 中同步
        syncCoordinates();
    }
    
    // 更新建議清單
    const activeRegionBtn = document.querySelector('.venue-cat-btn.active');
    updateVenueList(activeRegionBtn ? activeRegionBtn.dataset.region : 'ALL', '');

    // 視覺回饋
    vInput.style.borderColor = 'var(--text-accent)';
    lInput.style.borderColor = 'var(--text-accent)';
    setTimeout(() => { 
        vInput.style.borderColor = '#333'; 
        lInput.style.borderColor = '#333'; 
    }, 300);
}

// --- CLOUDFLARE R2 UPLOAD LOGIC ---

window.handleFileUpload = async function(fileInput, targetFieldName) {
    const file = fileInput.files[0];
    if (!file) return;

    const originalBtn = fileInput.nextElementSibling;
    if (originalBtn && originalBtn.disabled) return;

    // 限制檔案大小 (例如 10MB)
    if (file.size > 10 * 1024 * 1024) {
        await showAlert('檔案太大了！請上傳小於 10MB 的圖片。', 'error');
        return;
    }

    const originalText = originalBtn.innerHTML;
    const textInput = document.querySelector(`input[name="${targetFieldName}"]`);
    const saveBtn = document.getElementById('save-btn');
    const delBtn = document.getElementById('delete-btn');
    
    // 取得當前使用者名稱
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    try {
        originalBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (delBtn) delBtn.disabled = true;

        originalBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;"></i> UPLOADING...';
        lucide.createIcons();

        // 確保檔名不含中文、空格與特殊字元，避免 AWS Signature V4 簽名與 URL 解析失敗
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // 處理 Content-Type 缺失的防錯機制（如 iOS HEIC 格式）
        let contentType = file.type;
        if (!contentType) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'png') contentType = 'image/png';
            else if (ext === 'webp') contentType = 'image/webp';
            else if (ext === 'heic') contentType = 'image/heic';
            else contentType = 'image/jpeg';
        }

        // 1. 向 GAS 請求預簽名網址
        const gasUrl = `${GAS_API_URL}?action=getPresignedUrl&u=${currentUser}&fileName=${encodeURIComponent(cleanFileName)}&contentType=${encodeURIComponent(contentType)}&path=LiveNote/user_img/${currentUser}`;
        const res = await fetch(gasUrl);
        const result = await res.json();

        if (result.status !== 'success') throw new Error(result.message);

        // 2. 直接上傳到 Cloudflare R2
        const uploadRes = await fetch(result.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': contentType
            }
        });

        if (!uploadRes.ok) throw new Error('R2 Upload Failed');

        // 3. 更新輸入框
        textInput.value = result.publicUrl;
        textInput.style.borderColor = 'var(--text-accent)';
        
        // 成功提示效果
        originalBtn.style.background = '#1a4a1a';
        originalBtn.innerHTML = '<i data-lucide="check" style="width:14px;"></i> DONE';
        lucide.createIcons();
        
        setTimeout(() => {
            originalBtn.style.background = '';
            originalBtn.innerHTML = originalText;
            originalBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = false;
            if (delBtn) delBtn.disabled = false;
            lucide.createIcons();
        }, 2000);

    } catch (e) {
        console.error('Upload error:', e);
        await showAlert('上傳失敗：' + e.toString(), 'error');
        originalBtn.disabled = false;
        if (saveBtn) saveBtn.disabled = false;
        if (delBtn) delBtn.disabled = false;
        originalBtn.innerHTML = originalText;
        lucide.createIcons();
    }
}

window.onclick = (e) => { 
    if (e.target == modal || e.target == document.getElementById('login-modal')) {
        closeModal();
    }
};

function renderStatusStrip(tickets) {
    const stripEl = document.getElementById('live-status-strip');
    if (!stripEl) return;

    const now = new Date();
    const validTickets = tickets.filter(t => 
        t.status !== 'FAILED_DRAW' && 
        t.status !== 'FAILED_TICKET' && 
        t.status !== 'CANCELLED' && 
        t.status !== 'HIDDEN' &&
        t.date
    );

    let lastCompleted = null;
    let lastCompletedDate = null;
    let nextUpcoming = null;
    let nextUpcomingDate = null;

    validTickets.forEach(t => {
        const dateParts = cleanDate(t.date).split('-');
        if (dateParts.length !== 3) return;

        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const liveDate = new Date(year, month, day);

        if (t.time && cleanTime(t.time)) {
            const timeParts = cleanTime(t.time).split(':');
            if (timeParts.length === 2) {
                liveDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
            }
        } else {
            liveDate.setHours(23, 59, 59, 999);
        }

        if (liveDate < now) {
            if (!lastCompletedDate || liveDate > lastCompletedDate) {
                lastCompleted = t;
                lastCompletedDate = liveDate;
            }
        } else {
            if (t.status === 'CONFIRMED') {
                if (!nextUpcomingDate || liveDate < nextUpcomingDate) {
                    nextUpcoming = t;
                    nextUpcomingDate = liveDate;
                }
            }
        }
    });

    if (!lastCompleted && !nextUpcoming) {
        stripEl.classList.add('hidden');
        return;
    }

    stripEl.innerHTML = '';
    stripEl.classList.remove('hidden');

    let html = '';

    if (lastCompleted) {
        const pastName = lastCompleted.tour_title.trim();
        const pastDate = cleanDate(lastCompleted.date);
        const pastVenue = lastCompleted.venue_name || '-';
        html += `
            <div class="status-item status-past" onclick="openDetail('${lastCompleted.id}')">
                <span class="status-icon"><i data-lucide="history"></i></span>
                <div class="status-info-group">
                    <div class="status-meta-row">
                        <span class="status-label">LAST LIVE</span>
                        <span class="status-date">${pastDate}</span>
                    </div>
                    <div class="status-main-row" title="${pastName}">${pastName}</div>
                    <div class="status-venue-row" title="${pastVenue}">
                        <i data-lucide="map-pin"></i>
                        <span>${pastVenue}</span>
                    </div>
                </div>
            </div>
        `;
    }

    if (lastCompleted && nextUpcoming) {
        html += `<div class="status-divider"></div>`;
    }

    if (nextUpcoming) {
        const nextName = nextUpcoming.tour_title.trim();
        const nextDate = cleanDate(nextUpcoming.date);
        const nextVenue = nextUpcoming.venue_name || '-';
        
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const liveDateStart = new Date(nextUpcomingDate.getFullYear(), nextUpcomingDate.getMonth(), nextUpcomingDate.getDate());
        const diffDays = Math.max(0, Math.round((liveDateStart - todayStart) / (1000 * 60 * 60 * 24)));
        
        let countdownText = '';
        if (diffDays === 0) {
            countdownText = 'TODAY';
        } else if (diffDays === 1) {
            countdownText = 'TOMORROW';
        } else {
            countdownText = `IN ${diffDays} DAYS`;
        }

        html += `
            <div class="status-item status-future" onclick="openDetail('${nextUpcoming.id}')">
                <span class="status-icon"><i data-lucide="calendar-heart"></i></span>
                <div class="status-info-group">
                    <div class="status-meta-row">
                        <span class="status-label">NEXT LIVE</span>
                        <span class="status-date">${nextDate}</span>
                        <span class="status-countdown">${countdownText}</span>
                    </div>
                    <div class="status-main-row" title="${nextName}">${nextName}</div>
                    <div class="status-venue-row" title="${nextVenue}">
                        <i data-lucide="map-pin"></i>
                        <span>${nextVenue}</span>
                    </div>
                </div>
            </div>
        `;
    }

    stripEl.innerHTML = html;
    if (window.lucide) {
        lucide.createIcons();
    }
}

// --- 3D 滾輪票券翻頁特效 (3D Rolodex Scroll Effect) ---
function update3DScrollEffect() {
    const container = document.getElementById('ticket-container');
    if (!container) return;

    if (!is3DMode) {
        // 2D 模式下，直接清除所有卡片的 3D inline styles 與 wrapper 樣式
        const tickets = container.querySelectorAll('.ticket');
        tickets.forEach(ticket => {
            ticket.style.transform = '';
            ticket.style.opacity = '';
            ticket.style.visibility = '';
            ticket.style.zIndex = '';
        });
        const wrappers = container.querySelectorAll('.ticket-wrapper');
        wrappers.forEach(wrapper => {
            wrapper.style.zIndex = '';
            wrapper.style.pointerEvents = '';
        });
        return;
    }

    const containerHeight = container.clientHeight || 600;
    const listCenter = containerHeight / 2;
    const wrappers = container.querySelectorAll('.ticket-wrapper');
    
    if (wrappers.length === 0) return;

    wrappers.forEach(wrapper => {
        const ticket = wrapper.querySelector('.ticket');
        if (!ticket) return;

        // 移除 CSS 動畫類，防止其 keyframe forwards 鎖死 transform 屬性
        if (ticket.classList.contains('animate-up')) {
            ticket.classList.remove('animate-up');
        }

        // 計算 wrapper（排版容器）相對於滾動容器頂部的位移
        const wrapperTop = wrapper.offsetTop - container.scrollTop;
        const wrapperHeight = wrapper.clientHeight;
        const wrapperCenter = wrapperTop + wrapperHeight / 2;
        
        // 正規化距離 (-2.0 到 2.0 代表相對於容器半高度的偏移)
        const normalizedDiff = (wrapperCenter - listCenter) / listCenter;

        if (Math.abs(normalizedDiff) > 1.8) {
            ticket.style.opacity = '0';
            ticket.style.visibility = 'hidden';
            ticket.style.pointerEvents = 'none';
            wrapper.style.pointerEvents = 'none';
            ticket.style.transform = 'scale(0.8) translateZ(-300px) rotateX(0deg)'; // 退至深處隱藏，因為在子元素上，絕不影響 wrapper 的 layout！
            wrapper.style.zIndex = '1';
        } else {
            ticket.style.visibility = 'visible';
            ticket.style.pointerEvents = 'auto';
            wrapper.style.pointerEvents = 'auto';

            let opacityFactor = 0.55; 
            let scaleFactor = 0.12;
            let angleFactor = 35;
            
            if (normalizedDiff < 0) {
                opacityFactor = 0.4;
                scaleFactor = 0.06;
                angleFactor = 20;
            }

            const angle = normalizedDiff * angleFactor;
            const translateZ = -Math.abs(normalizedDiff) * 180;
            const scale = 1 - Math.abs(normalizedDiff) * scaleFactor;
            const opacity = 1 - Math.abs(normalizedDiff) * opacityFactor;
            
            ticket.style.transform = `translateZ(${translateZ}px) rotateX(0deg) scale(${scale})`;
            ticket.style.opacity = Math.max(0.05, Math.min(1, opacity));
            
            const zIndex = Math.round(100 - Math.abs(normalizedDiff) * 50);
            ticket.style.zIndex = zIndex;
            wrapper.style.zIndex = zIndex; // 同步將 z-index 套用在外層 wrapper 上以強制消除穿透重疊
        }
    });
}

// --- 票券詳細卡片翻轉控制 (Ticket Modal Flip Controller) ---
window.toggleTicketFlip = function(btn) {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) return;

    const isFlipped = modalContent.classList.toggle('flipped');

    // 根據翻轉狀態，切換為「資訊 (info)」或「票券 (ticket)」Icon
    const iconName = isFlipped ? 'info' : 'ticket';
    btn.innerHTML = `<i data-lucide="${iconName}"></i>`;

    if (window.lucide) {
        lucide.createIcons();
    }
};

// --- 3D / 2D 模式切換控制 (3D Mode Toggle) ---
window.toggle3DMode = function() {
    is3DMode = !is3DMode;
    
    const container = document.getElementById('ticket-container');
    if (container) {
        if (is3DMode) {
            container.classList.remove('mode-2d');
        } else {
            container.classList.add('mode-2d');
        }
    }
    
    const btn = document.getElementById('toggle-3d-btn');
    if (btn) {
        if (is3DMode) {
            btn.classList.add('active');
            btn.innerHTML = `
                <i data-lucide="layers" style="width:14px; height:14px;"></i>
                <span>3D VIEW</span>
            `;
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `
                <i data-lucide="menu" style="width:14px; height:14px;"></i>
                <span>2D VIEW</span>
            `;
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    update3DScrollEffect();
};

// 強制清理 Service Worker & Cache Storage 快取並重整
window.forceClearCacheAndReload = async function() {
    try {
        // 1. 註銷所有的 Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }
        // 2. 刪除所有的 Cache Storage 快取
        if (window.caches) {
            const keys = await caches.keys();
            for (let key of keys) {
                await caches.delete(key);
            }
        }
        // 3. 清理 LocalStorage 中的票券資料與場地快取 (保留管理員登入資訊)
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('livenote_cache_') || key.startsWith('livenote_venues_'))) {
                localStorage.removeItem(key);
            }
        }
        // 4. 強制從伺服器端重載網頁 (不使用快取)
        window.location.reload(true);
    } catch (e) {
        console.error('Failed to clear cache:', e);
        window.location.reload(true);
    }
};

// ── GOOGLE CALENDAR 同步功能 ──────────────────────────────────────

/**
 * 同步單筆 Live 記錄到 Google Calendar
 * 由卡片上的「📅 同步日曆」按鈕觸發
 * @param {string} recordId - 要同步的記錄 ID
 * @param {HTMLElement} btn - 按鈕元素（用於更新 UI 狀態）
 */
window.handleSyncCalendar = async function(recordId, btn) {
    if (!adminPassword) {
        await showAlert('請先登入才能使用日曆同步功能', 'error');
        return;
    }
    if (!recordId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" style="width:12px;height:12px;animation:spin 1s linear infinite;"></i> 同步中...`;
        lucide.createIcons({ nodes: [btn] });
    }

    try {
        const res = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'syncCalendar',
                username: currentUser,
                password: adminPassword,
                recordId: recordId
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            if (btn) {
                btn.innerHTML = `<i data-lucide="check-circle-2" style="width:12px;height:12px;"></i> 已同步`;
                btn.style.color = '#4caf50';
                btn.style.borderColor = '#4caf50';
                lucide.createIcons({ nodes: [btn] });
            }
            await showAlert('已成功同步到 Google 行事曆！', 'success');
        } else {
            throw new Error(data.message || '同步失敗');
        }
    } catch (e) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            lucide.createIcons({ nodes: [btn] });
        }
        await showAlert('同步失敗：' + e.toString(), 'error');
    }
};

/**
 * 取得並開啟 Google Calendar 訂閱連結（情境 B）
 * 由 Side Menu 的「訂閱日曆」按鈕觸發
 */
window.handleSubscribeCalendar = async function() {
    if (!adminPassword) {
        await showAlert('請先登入才能取得日曆訂閱連結', 'error');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('u') || 'ching';

    const subscribeBtn = document.getElementById('cal-subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.disabled = true;
        subscribeBtn.innerHTML = `<i data-lucide="loader-2" style="width:12px;height:12px;"></i> 載入中...`;
        lucide.createIcons({ nodes: [subscribeBtn] });
    }

    try {
        const res = await fetch(`${GAS_API_URL}?action=getCalendarLink&u=${currentUser}&p=${encodeURIComponent(adminPassword)}`);
        const data = await res.json();

        if (data.status === 'success' && data.subscribeUrl) {
            window.open(data.subscribeUrl, '_blank');
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.innerHTML = `<i data-lucide="calendar-check-2" style="width:12px;height:12px;"></i> 訂閱日曆`;
                lucide.createIcons({ nodes: [subscribeBtn] });
            }
        } else {
            throw new Error(data.message || '無法取得訂閱連結');
        }
    } catch (e) {
        if (subscribeBtn) {
            subscribeBtn.disabled = false;
            subscribeBtn.innerHTML = `<i data-lucide="calendar" style="width:12px;height:12px;"></i> 訂閱日曆`;
            lucide.createIcons({ nodes: [subscribeBtn] });
        }
        await showAlert('取得連結失敗：' + e.toString(), 'error');
    }
};

// ─────────────────────────────────────────────────────────────────
