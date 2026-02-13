// CONFIGURATION
const GAS_API_URL = ''; 

// MOCK DATA (測試用假資料)
const MOCK_DATA = [
    {
        id: '1',
        date: '2025-01-12',
        time: '18:30',
        type: 'ONE_MAN',
        status: 'CONFIRMED',
        artist: 'YOASOBI',
        tour_title: 'ASIA TOUR 2024-2025 “超現實”',
        venue_name: '台北小巨蛋',
        lat_lng: '25.051, 121.550',
        seat_info: '特區 B2排',
        is_first_time: true,
        setlist: '1. 祝福\n2. 夜に駆ける\n3. 勇者\n4. アイドル',
        images: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=500'
    },
    {
        id: '2',
        date: '2024-03-30',
        time: '11:00',
        type: 'FES',
        status: 'COMPLETED',
        artist: '閃靈 Chthonic', 
        artist_list: '閃靈, 滅火器, 草東沒有派對, 大象體操, 拍謝少年, 鄭宜農...',
        tour_title: '大港開唱 Megaport 2024',
        venue_name: '高雄駁二藝術特區',
        lat_lng: '22.619, 120.281',
        seat_info: '南霸天舞台',
        is_first_time: false,
        setlist: '',
        images: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=500'
    },
    {
        id: '3',
        date: '2023-12-31',
        time: '23:00',
        type: 'ONLINE',
        status: 'COMPLETED',
        artist: '星街すいせい',
        artist_list: 'Hololive Talents',
        tour_title: 'Hololive Countdown Live 2023',
        venue_name: 'Streaming (SPWN)',
        lat_lng: '', 
        seat_info: 'PC Front',
        is_first_time: false,
        setlist: '...',
        images: ''
    },
    {
        id: '4',
        date: '2026-05-20',
        time: '18:00',
        type: 'ONE_MAN',
        status: 'APPLIED',
        artist: 'LiSA',
        tour_title: 'LiVE is Smile Always ~LANDER~',
        venue_name: '武道館',
        lat_lng: '35.693, 139.749',
        seat_info: '',
        is_first_time: true,
        setlist: '',
        images: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=500'
    },
    {
        id: '5',
        date: '2025-02-14',
        time: '19:00',
        type: 'EVENT',
        status: 'LOST', 
        artist: 'Ado',
        tour_title: 'Special Talk Event',
        venue_name: 'Zepp DiverCity',
        lat_lng: '35.624, 139.775',
        seat_info: '',
        is_first_time: false,
        setlist: '',
        images: ''
    }
];

let allTickets = [];
let mapInstance = null;
let detailMapInstance = null;

// DOM Elements
const listTab = document.querySelector('[data-tab="list"]');
const mapTab = document.querySelector('[data-tab="map"]');
const listView = document.getElementById('list-view');
const mapView = document.getElementById('map-view');
const ticketContainer = document.getElementById('ticket-container');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupTabs();
});

// --- DATA FETCHING ---
async function fetchData() {
    try {
        if (!GAS_API_URL) {
            console.warn('No API URL provided, using mock data.');
            renderApp(MOCK_DATA);
            return;
        }
        const res = await fetch(GAS_API_URL);
        const data = await res.json();
        if (data && data.length > 0) {
            renderApp(data);
        } else {
            renderApp(MOCK_DATA);
        }
    } catch (e) {
        console.error('Error fetching data:', e);
        document.getElementById('loading').textContent = 'Loaded Mock Data (API Error)';
        renderApp(MOCK_DATA);
    }
}

function renderApp(data) {
    allTickets = data;
    document.getElementById('loading').style.display = 'none';
    renderTickets(data);
    renderMenu(data);
}

// --- RENDER TICKETS ---
function renderTickets(tickets) {
    ticketContainer.innerHTML = '';
    
    const sorted = [...tickets].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const dateObj = new Date(t.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-US', { month: 'short' });
        const year = dateObj.getFullYear();

        // Status Logic
        let statusClass = '';
        let statusLabel = '';
        switch(t.status) {
            case 'APPLIED':
                statusClass = 'status-applied';
                statusLabel = '<div class="status-badge" style="background:#95a5a6; color:white;">抽選中</div>';
                break;
            case 'WON':
                statusClass = 'status-won';
                statusLabel = '<div class="status-badge" style="background:#f1c40f; color:#333;">当選</div>';
                break;
            case 'CONFIRMED':
                statusClass = 'status-confirmed';
                statusLabel = '<div class="status-badge" style="background:#2ecc71; color:white;">参戦確定</div>';
                break;
            case 'LOST':
                statusClass = 'status-lost';
                statusLabel = '<div class="status-badge" style="background:#7f8c8d; color:white;">落選</div>';
                break;
            default: 
                statusClass = '';
        }

        // Type & Focus Logic
        let typeBadge = '';
        let typeClass = '';
        let displayArtist = t.artist;
        let displayTitle = t.tour_title;
        const focusLabel = '<span class="focus-badge">お目当て</span>';

        switch(t.type) {
            case 'FES':
                typeBadge = '<span class="type-tag fes">FES</span>';
                typeClass = 'type-fes';
                if (t.artist_list) {
                    const artists = t.artist_list.split(',').map(s=>s.trim());
                    if (artists.length > 2) {
                        displayArtist = `${artists[0]}, ${artists[1]}...`;
                    } else {
                        displayArtist = t.artist_list;
                    }
                    if (t.artist && t.artist !== 'Various Artists') {
                        displayTitle = t.artist; 
                    }
                }
                displayArtist = `${focusLabel}${t.artist}`; 
                break;
            case 'ONLINE':
                typeBadge = '<span class="type-tag online">ONLINE</span>';
                typeClass = 'type-online';
                if (t.artist_list) displayArtist = `${focusLabel}${t.artist}`;
                break;
            case 'EVENT':
                typeBadge = '<span class="type-tag event">EVENT</span>';
                typeClass = 'type-event';
                displayArtist = `${focusLabel}${t.artist}`;
                break;
            default: 
                typeBadge = '<span class="type-tag live">LIVE</span>';
                typeClass = 'type-live';
        }

        const firstTimeBadge = t.is_first_time ? '<div class="badge-first"></div>' : '';
        const posterImg = t.images ? t.images : 'https://via.placeholder.com/120x180?text=No+Image';
        
        const card = document.createElement('div');
        card.className = `ticket ${typeClass} ${statusClass}`;
        card.id = `ticket-${t.id}`;
        card.innerHTML = `
            ${firstTimeBadge}
            <div class="ticket-stub">
                <span class="day">${day}</span>
                <span class="month">${month}</span>
                <span class="year">${year}</span>
            </div>
            <div class="ticket-poster" style="background-image: url('${posterImg}')"></div>
            <div class="ticket-main" onclick="openDetail('${t.id}')">
                <div class="ticket-header">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="tour-title main-title">${displayTitle}</div>
                        ${typeBadge}
                    </div>
                    <div class="artist-name sub-title">${displayArtist}</div>
                </div>
                <div class="venue-info">
                    <i data-lucide="map-pin" style="width:14px"></i> ${t.venue_name}
                    ${statusLabel}
                </div>
            </div>
            <div class="ticket-rip" onclick="openDetail('${t.id}')"></div>
        `;
        ticketContainer.appendChild(card);
    });
    
    lucide.createIcons();
}

// --- TABS & MAP ---
function setupTabs() {
    listTab.addEventListener('click', () => switchTab('list'));
    mapTab.addEventListener('click', () => switchTab('map'));
}

function switchTab(tab) {
    if (tab === 'list') {
        listTab.classList.add('active');
        mapTab.classList.remove('active');
        listView.classList.add('active');
        mapView.classList.remove('active');
        document.getElementById('back-btn-container').style.display = 'none'; // Hide back btn
    } else {
        listTab.classList.remove('active');
        mapTab.classList.add('active');
        listView.classList.remove('active');
        mapView.classList.add('active');
        setTimeout(initMap, 200); 
    }
}

function initMap() {
    if (mapInstance) return; 
    mapInstance = L.map('map').setView([25.0330, 121.5654], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInstance);

    const locationGroups = {};
    allTickets.forEach(t => {
        if (!t.lat_lng) return;
        const key = t.lat_lng;
        if (!locationGroups[key]) {
            locationGroups[key] = {
                lat_lng: t.lat_lng,
                venue_name: t.venue_name,
                tickets: []
            };
        }
        locationGroups[key].tickets.push(t);
    });

    Object.values(locationGroups).forEach(group => {
        const [lat, lng] = group.lat_lng.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) return;
        group.tickets.sort((a, b) => new Date(b.date) - new Date(a.date));

        let popupContent = `<div style="font-family:'Noto Sans TC', sans-serif;">
            <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px; border-bottom:1px solid #ccc; padding-bottom:3px;">${group.venue_name}</div>`;
        
        if (group.tickets.length === 1) {
            const t = group.tickets[0];
            popupContent += `
                <div style="color:#e74c3c; font-weight:bold;">${t.artist}</div>
                <div style="font-size:0.9rem;">${t.tour_title}</div>
                <div style="color:#777; font-size:0.8rem;">${t.date}</div>
            `;
        } else {
            popupContent += `<ul style="padding-left:0; list-style:none; margin:0;">`;
            group.tickets.forEach(t => {
                popupContent += `
                    <li style="margin-bottom:6px; border-bottom:1px dashed #eee; padding-bottom:4px;">
                        <span style="color:#e74c3c; font-weight:bold;">${t.artist}</span>
                        <br>
                        <span style="font-size:0.8rem; color:#555;">${t.date}</span>
                    </li>
                `;
            });
            popupContent += `</ul>`;
        }
        popupContent += `</div>`;
        L.marker([lat, lng]).addTo(mapInstance).bindPopup(popupContent);
    });
}

// --- SIDE MENU & VIEW LOGIC ---
window.toggleMenu = function() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('side-menu-overlay');
    if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        overlay.classList.add('hidden');
        overlay.style.pointerEvents = 'none';
    } else {
        menu.classList.add('open');
        overlay.classList.remove('hidden');
        overlay.style.pointerEvents = 'auto';
    }
}

function renderMenu(tickets) {
    const menuContent = document.getElementById('menu-content');
    menuContent.innerHTML = '';
    
    // ALL TICKETS BTN
    const allBtn = document.createElement('div');
    allBtn.className = 'menu-group';
    allBtn.innerHTML = `
        <div class="menu-item" style="background:#333; text-align:center; padding:10px; font-weight:bold; color:var(--text-accent);" onclick="showAllTickets()">
            ALL TICKETS
        </div>
    `;
    menuContent.appendChild(allBtn);

    const groups = {};
    const sorted = [...tickets].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(t => {
        const year = t.date.split('-')[0];
        if (!groups[year]) groups[year] = [];
        groups[year].push(t);
    });

    Object.keys(groups).sort((a,b) => b-a).forEach(year => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'menu-group';
        const yearHeader = document.createElement('div');
        yearHeader.className = 'menu-year';
        yearHeader.textContent = year;
        groupDiv.appendChild(yearHeader);
        
        groups[year].forEach(t => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.onclick = () => showSingleTicket(t.id);
            item.innerHTML = `
                <div class="menu-date">${t.date}</div>
                <div class="menu-tour">${t.tour_title}</div>
                <div class="menu-artist">${t.artist}</div>
            `;
            groupDiv.appendChild(item);
        });
        menuContent.appendChild(groupDiv);
    });
}

function showSingleTicket(id) {
    toggleMenu(); 
    if (!listTab.classList.contains('active')) switchTab('list');

    const tickets = document.querySelectorAll('.ticket');
    tickets.forEach(el => {
        if (el.id === `ticket-${id}`) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });

    document.getElementById('back-btn-container').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.showAllTickets = function() {
    const menu = document.getElementById('side-menu');
    if (menu.classList.contains('open')) toggleMenu();
    
    if (!listTab.classList.contains('active')) switchTab('list');

    const tickets = document.querySelectorAll('.ticket');
    tickets.forEach(el => {
        el.style.display = 'flex';
    });
    document.getElementById('back-btn-container').style.display = 'none';
}

// --- MODAL ---
window.openDetail = function(id) {
    const t = allTickets.find(x => x.id === id);
    if (!t) return;

    let imgHtml = '';
    if (t.images) {
        imgHtml = `<div class="modal-hero-img" style="background-image: url('${t.images}');"></div>`;
    } else {
        imgHtml = `<div class="modal-hero-img" style="background-color: #333; display:flex; align-items:center; justify-content:center; color:#555;">No Image</div>`;
    }

    const setlistHtml = t.setlist ? t.setlist.replace(/\n/g, '<br>') : 'No setlist available.';
    
    let artistBlock = '';
    if (t.artist_list && t.artist_list.trim() !== '') {
        artistBlock = `
            <div style="margin: 0.5rem 0 1rem 0; font-size: 0.95rem; color: #444; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                <strong style="display:block; margin-bottom:4px; color:#e74c3c;">出演者</strong>
                ${t.artist_list}
            </div>
        `;
    }

    modalBody.innerHTML = `
        ${imgHtml}
        <div class="modal-text-content">
            <h2 style="margin-top:0.5rem; margin-bottom:0.2rem; font-size:1.8rem; font-family:'Anton', sans-serif; line-height:1.1;">${t.tour_title}</h2>
            <h3 style="color:#777; margin-top:0; font-size:1.1rem; font-weight:normal;">${t.artist}</h3>
            ${artistBlock}
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin: 1rem 0; font-size:0.9rem;">
                <div><strong>公演日:</strong> ${t.date}</div>
                <div><strong>開演:</strong> ${t.time}</div>
                <div style="grid-column: span 2;"><strong>会場:</strong> ${t.venue_name}</div>
                <div style="grid-column: span 2;"><strong>座席:</strong> ${t.seat_info || '-'}</div>
            </div>
            <hr style="border:0; border-top:1px dashed #ccc; margin: 1rem 0;">
            <h4>セットリスト</h4>
            <div style="background:#f9f9f9; padding:15px; border-radius:4px; font-family:monospace; line-height:1.6; max-height:200px; overflow-y:auto; border:1px solid #eee;">
                ${setlistHtml}
            </div>
            <h4 style="margin-top:1.5rem;">アクセス / 場所</h4>
            <div id="detail-map" style="height:200px; width:100%; border-radius:8px; border:1px solid #ddd; z-index: 1;"></div>
        </div>
    `;
    
    modal.classList.remove('hidden');

    setTimeout(() => {
        if (detailMapInstance) {
            detailMapInstance.remove(); 
            detailMapInstance = null;
        }
        if (t.lat_lng) {
            const [lat, lng] = t.lat_lng.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                detailMapInstance = L.map('detail-map', { zoomControl: false, attributionControl: false }).setView([lat, lng], 14);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(detailMapInstance);
                L.marker([lat, lng]).addTo(detailMapInstance);
            } else {
                document.getElementById('detail-map').innerHTML = '<p style="text-align:center; padding-top:80px; color:#999;">Map data unavailable</p>';
            }
        } else {
            document.getElementById('detail-map').style.display = 'none';
        }
    }, 300);
}

window.closeModal = function() {
    modal.classList.add('hidden');
    document.getElementById('login-modal').classList.add('hidden');
    if (detailMapInstance) {
        detailMapInstance.remove();
        detailMapInstance = null;
    }
}

window.onclick = function(event) {
    if (event.target == modal || event.target == document.getElementById('login-modal')) closeModal();
}

window.openLogin = function() {
    document.getElementById('login-modal').classList.remove('hidden');
}

window.checkLogin = function() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin') { 
        document.getElementById('login-modal').classList.add('hidden');
        showAdminForm();
    } else {
        document.getElementById('login-msg').textContent = 'Wrong password';
        document.getElementById('login-msg').style.color = 'red';
    }
}

function showAdminForm(editData = null) {
    const data = editData || {
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        artist: '',
        tour_title: '',
        venue_name: '',
        lat_lng: '',
        seat_info: '',
        ticket_price: '',
        setlist: '',
        images: '',
        is_first_time: false
    };
    modalBody.innerHTML = `
        <h2>${!!editData ? 'Edit Ticket' : 'Add New Ticket'}</h2>
        <form id="admin-form" onsubmit="event.preventDefault(); handleSave();" style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px;">
                <input type="date" name="date" value="${data.date}" required style="padding:8px; flex:1;">
                <input type="time" name="time" value="${data.time}" required style="padding:8px; flex:1;">
            </div>
            <input type="text" name="artist" placeholder="Artist Name" value="${data.artist}" required style="padding:8px;">
            <input type="text" name="tour_title" placeholder="Tour Title" value="${data.tour_title}" style="padding:8px;">
            <input type="text" name="venue_name" placeholder="Venue Name" value="${data.venue_name}" style="padding:8px;">
            <input type="text" name="lat_lng" placeholder="Lat,Lng (e.g. 35.681,139.767)" value="${data.lat_lng}" style="padding:8px;">
            <input type="text" name="seat_info" placeholder="Seat Info" value="${data.seat_info}" style="padding:8px;">
            <input type="number" name="ticket_price" placeholder="Price" value="${data.ticket_price}" style="padding:8px;">
            <textarea name="setlist" placeholder="Setlist" rows="5" style="padding:8px;">${data.setlist}</textarea>
            <input type="text" name="images" placeholder="Image URL" value="${data.images}" style="padding:8px;">
            <label style="display:flex; align-items:center; gap:5px;">
                <input type="checkbox" name="is_first_time" ${data.is_first_time ? 'checked' : ''}> First Time Landing?
            </label>
            <button type="submit" style="background:var(--text-accent); color:white; border:none; padding:10px; cursor:pointer; font-weight:bold;">SAVE TICKET</button>
        </form>
    `;
    modal.classList.remove('hidden');
}

window.handleSave = function() {
    const form = document.getElementById('admin-form');
    const formData = new FormData(form);
    const newTicket = {};
    formData.forEach((value, key) => {
        newTicket[key] = value;
    });
    newTicket.is_first_time = form.querySelector('[name="is_first_time"]').checked;
    console.log('Would save this to Google Sheet:', newTicket);
    alert('Simulated Save! Check console for data object.');
    closeModal();
}
