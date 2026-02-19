// 1. สร้างแผนที่
var bounds = [[-90, -180], [90, 180]];

var map = L.map('map', {
    maxBounds: bounds,       // ห้ามลากออกนอกขอบเขต
    maxBoundsViscosity: 1.0, // ความหนืดที่ขอบ (1.0 = แข็ง, ลากออกไม่ได้เลย)
    minZoom: 2,               // ห้าม Zoom out จนเล็กเกินไป (เห็นโลกหลายใบ)
    zoomControl: false       // Disable default zoom control
}).setView([13.0, 101.5], 6);


// Reset Button Logic
document.getElementById('reset-btn').onclick = function () {
    map.setView([13.0, 101.5], 6);
    // Also close sidebar if open? Maybe good UX
    closeSidebar();
};

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19.5,
    noWrap: true,            // ห้ามแสดงแผนที่ซ้ำ (โลกใบเดียว)
    bounds: bounds
}).addTo(map);

// 3. ข้อมูลสถานี
// STATION_INFO moved to station_data.js

var stations = [
    // --- Original Stations ---
    { name: "CM01", code: "KMITL", lat: 18.8000, lon: 98.9500 },
    { name: "CADT", code: "KMITL", lat: 11.6545, lon: 104.9116 },
    { name: "KMIT6", code: "KMITL", lat: 13.7278, lon: 100.7724 },
    { name: "STFD", code: "KMITL", lat: 13.7356, lon: 100.6611 },
    { name: "RUT1", code: "KMITL", lat: 14.9889, lon: 102.1206 },
    { name: "CPN1", code: "KMITL", lat: 10.7247, lon: 99.3744 },
    { name: "NUO2", code: "KMITL", lat: 18.0400, lon: 102.6347 },
    { name: "ITC0", code: "KMITL", lat: 11.5705, lon: 104.8994 },
    { name: "HUEV", code: "KMITL", lat: 16.4155, lon: 107.5687 },
    { name: "KKU0", code: "KMITL", lat: 16.4721, lon: 102.8260 },

    // --- DPT Stations ---
    { name: "NKSW", code: "DPT", lat: 15.690637, lon: 100.114112 },
    { name: "UTTD", code: "DPT", lat: 17.630094, lon: 100.096343 },
    { name: "CHAN", code: "DPT", lat: 12.610310, lon: 102.102411 },
    { name: "SPBR", code: "DPT", lat: 14.518875, lon: 100.130580 },
    { name: "DPT9", code: "DPT", lat: 13.756782, lon: 100.573200 },
    { name: "PJRK", code: "DPT", lat: 11.811621, lon: 99.796348 },
    { name: "SRTN", code: "DPT", lat: 9.132225, lon: 99.331361 },
    { name: "NKNY", code: "DPT", lat: 14.212003, lon: 101.202211 },
    { name: "SOKA", code: "DPT", lat: 7.206694, lon: 100.596121 },
    { name: "UDON", code: "DPT", lat: 17.412732, lon: 102.780704 },
    { name: "CNBR", code: "DPT", lat: 13.406019, lon: 100.997652 },
    { name: "NKRM", code: "DPT", lat: 14.992119, lon: 102.129470 },
    { name: "LPBR", code: "DPT", lat: 14.800907, lon: 100.651246 },
    { name: "SISK", code: "DPT", lat: 15.116122, lon: 104.285676 },
    { name: "CHMA", code: "DPT", lat: 18.84, lon: 98.97 }
];

// รายชื่อ DPT mountpoints (ตรงกับ DPT_MOUNTPOINTS ใน main.py)
var DPT_NAMES = ["NKRM", "NKNY", "DPT9", "LPBR", "CHAN", "CNBR", "SISK", "NKSW", "SOKA",
    "SRTN", "UDON", "SPBR", "UTTD", "PJRK", "CHMA"];

// กำหนด group ให้แต่ละสถานี (เช็คจาก name)
stations.forEach(function (s) {
    s.group = DPT_NAMES.includes(s.name) ? 'dpt' : 'kmitl';
});

// สร้าง divIcon วงกลมสี ตาม status (gray = loading, green = online, red = offline)
function createStatusIcon(color) {
    return L.divIcon({
        className: 'marker-status-dot',
        html: `<div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${color};
            border: 1px solid white;
            box-shadow: 0 0 6px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -12]
    });
}

var iconGray = createStatusIcon('#aaa');
var iconGreen = createStatusIcon('#2ecc71');
var iconRed = createStatusIcon('#e74c3c');

// --- Filter Logic ---
var currentFilter = 'all';

function applyFilter(group) {
    currentFilter = group;
    stations.forEach(function (s) {
        if (!s.marker) return;
        var el = s.marker.getElement();
        if (!el) return;

        if (group === 'all' || s.group === group) {
            el.classList.remove('marker-faded');
        } else {
            el.classList.add('marker-faded');
        }
    });
}

// Filter toggle button handlers
document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        // อัปเดต active class
        document.querySelectorAll('.filter-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        btn.classList.add('active');

        // ใช้ filter
        applyFilter(btn.dataset.filter);
    });
});

// 4. Sidebar Logic
var sidebar = document.getElementById('sidebar');
var closeSidebarBtn = document.getElementById('close-sidebar');
var sidebarContent = document.getElementById('sidebar-content');

function openSidebar(s) {
    var info = STATION_INFO[s.name];
    var infoHtml = '';

    if (info) {
        infoHtml = `
            <ul class="station-info-list">
                <li><strong>Organization:</strong> ${info.Organization || '-'}</li>
                <li><strong>Country:</strong> ${info.Country || '-'}</li>
                <li><strong>Latitude:</strong> ${info.Latitude || '-'}</li>
                <li><strong>Longitude:</strong> ${info.Longitude || '-'}</li>
                <li><strong>Navigation:</strong> ${info.Navigation || '-'}</li>
                <li><strong>Format:</strong> ${info.Format || '-'}</li>
                <li><strong>Receiver:</strong> ${info.Receiver || '-'}</li>
            </ul>
        `;
    } else {
        infoHtml = `<p style="color:red;">Info not found</p>`;
    }

    sidebarContent.innerHTML = `
        <h3>${s.name} (${s.code}) <span id="status-dot-${s.name}" class="status-dot"></span></h3>
        <p class="station-coords">Lat: ${s.lat.toFixed(4)}, Lon: ${s.lon.toFixed(4)}</p>
        
        <div id="station-info-container">
            <h4>Station Info</h4>
            <div id="station-info-content">${infoHtml}</div>
        </div>
        <div id="station-actions-container" style="margin-top: 15px;"></div>
    `;
    sidebar.classList.add('open');
    checkStationStatus(s.name);


    // Add Satellite Monitor Button if not exists
    if (!document.getElementById('sat-monitor-btn')) {
        var btn = document.createElement('button');
        btn.id = 'sat-monitor-btn';
        btn.innerText = 'Satellite Monitor';
        btn.onclick = function () {
            openSatelliteMonitor(s.name);
        };
        document.getElementById('station-actions-container').appendChild(btn);
    }

    // Add Compare Station Button if not exists
    if (!document.getElementById('compare-station-btn')) {
        var btnComp = document.createElement('button');
        btnComp.id = 'compare-station-btn';
        btnComp.innerText = 'Compare Station';
        btnComp.style.marginTop = '10px';
        btnComp.style.backgroundColor = '#6c757d'; // Grey color
        btnComp.className = 'compare-btn'; // We can add class for styling if needed, sharing style with sat-monitor-btn

        // Copy styles from sat-monitor-btn for consistency
        btnComp.style.width = '100%';
        btnComp.style.padding = '10px';
        btnComp.style.color = 'white';
        btnComp.style.border = 'none';
        btnComp.style.borderRadius = '5px';
        btnComp.style.cursor = 'pointer';
        btnComp.style.fontSize = '14px';
        btnComp.style.transition = 'background 0.2s';

        btnComp.onmouseover = function () { this.style.backgroundColor = '#5a6268'; };
        btnComp.onmouseout = function () { this.style.backgroundColor = '#6c757d'; };

        btnComp.onclick = function () {
            openComparisonWizard(s.name);
        };
        document.getElementById('station-actions-container').appendChild(btnComp);
    }
}


function checkStationStatus(stationName) {
    // 1. ดึง Element สำหรับ dot ใน Sidebar และ Navbar
    var dotSidebar = document.getElementById('status-dot-' + stationName);
    var dotNav = document.getElementById('status-dot-nav-' + stationName);

    // หา station object เพื่ออัปเดต marker icon บนแผนที่
    var station = stations.find(s => s.name === stationName);

    // ฟังก์ชันย่อยสำหรับเปลี่ยนสี dot + marker icon
    function updateStatus(colorClass, markerIcon) {
        [dotSidebar, dotNav].forEach(dot => {
            if (dot) {
                dot.classList.remove('status-red', 'status-green', 'status-orange');
                dot.classList.add(colorClass);
            }
        });
        // อัปเดต marker icon บนแผนที่ด้วย + ให้สีเขียวอยู่บนสีแดง
        if (station && station.marker) {
            station.marker.setIcon(markerIcon);
            station.marker.setZIndexOffset(colorClass === 'status-green' ? 1000 : 0);
            var el = station.marker.getElement();
            if (el && currentFilter !== 'all' && station.group !== currentFilter) {
                el.classList.add('marker-faded');
            }
        }
    }

    // 2. เช็คสถานะจาก NTRIP endpoint
    var apiHost = window.location.hostname;
    var url = `http://${apiHost}:8000/ntrip-status/${stationName}`;

    console.log(`Checking NTRIP status for ${stationName}...`);

    fetch(url, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) {
                console.warn(`${stationName}: API response not OK (${response.status})`);
                updateStatus('status-red', iconRed); // 🔴
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;

            if (data.status === 'green') {
                console.log(`${stationName}: NTRIP Status GREEN (RTCM data available)`);
                updateStatus('status-green', iconGreen); // 🟢
            } else {
                console.log(`${stationName}: NTRIP Status RED (No RTCM data)`);
                updateStatus('status-red', iconRed); // 🔴
            }
        })
        .catch(error => {
            console.error(`${stationName}: Network Error:`, error);
            updateStatus('status-red', iconRed); // 🔴
        });
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

closeSidebarBtn.onclick = closeSidebar;


stations.forEach(function (s) {
    // ใช้ iconGray (สีเทา) เป็นค่าเริ่มต้น รอ checkStationStatus อัปเดตเป็นเขียว/แดง
    var marker = L.marker([s.lat, s.lon], { icon: iconGray }).addTo(map)
        .bindTooltip(`<b>${s.name} (${s.code})</b>`)
        .on('click', function () {
            openSidebar(s);
            map.setView([s.lat, s.lon], 10);
        });

    s.marker = marker;
});

// --- Satellite Monitor Logic (Multi-Window) ---
var activeMonitors = {}; // { stationName: SatelliteMonitor_Instance }

class SatelliteMonitor {
    constructor(stationName) {
        this.stationName = stationName;
        this.socket = null;
        this.chart = null;
        this.lastTime = null;
        this.data = {
            labels: [],
            datasets: [
                {
                    label: 'GPS',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    tension: 0.1,
                    borderWidth: 2
                },
                {
                    label: 'GLONASS',
                    data: [],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    tension: 0.1,
                    borderDash: [5, 5], // Dashed
                    borderWidth: 2
                },
                {
                    label: 'Galileo',
                    data: [],
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    tension: 0.1,
                    borderDash: [2, 2], // Dotted
                    borderWidth: 2
                },
                {
                    label: 'BeiDou',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.1,
                    borderDash: [10, 5], // Long Dash
                    borderWidth: 2
                }
            ]
        };

        this.createWindow();
        this.initChart();
        this.connect();
    }

    createWindow() {
        // Create Modal HTML
        var modalId = `sat-modal-${this.stationName}`;
        var div = document.createElement('div');
        div.id = modalId;
        div.className = 'sat-modal';
        div.style.display = 'flex';
        // Center initial position
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';

        div.innerHTML = `
            <div id="${modalId}-header" class="sat-modal-header">
                <span class="sat-modal-title">📡 Satellite Monitor - ${this.stationName}</span>
                <div class="sat-modal-controls">
                    <button class="min-btn">-</button>
                    <button class="close-btn">X</button>
                </div>
            </div>
            <div id="${modalId}-content" class="sat-modal-content">
                <div class="chart-container">
                    <canvas id="satChart-${this.stationName}"></canvas>
                </div>
                <div id="sat-log-${this.stationName}" class="sat-log-container">
                    <div class="log-entry">Waiting for connection...</div>
                </div>
            </div>
        `;

        document.body.appendChild(div);

        // Event Listeners
        div.querySelector('.close-btn').onclick = () => this.close();
        div.querySelector('.min-btn').onclick = () => this.minimize();

        // Z-Index Management (Bring to front on click)
        div.onmousedown = () => {
            document.querySelectorAll('.sat-modal').forEach(m => m.style.zIndex = 2000);
            div.style.zIndex = 2001;
        };

        // Draggable
        makeDraggable(div, `${modalId}-header`);
    }

    initChart() {
        var ctx = document.getElementById(`satChart-${this.stationName}`).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.data,
            options: {
                scales: { y: { beginAtZero: true, suggestedMax: 15 } },
                elements: {
                    point: {
                        radius: 0 // Hide points for a clean line
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { usePointStyle: false, boxWidth: 20 }
                    }
                },
                interaction: { mode: 'index', intersect: false },
            }
        });
    }

    connect() {
        var apiHost = window.location.hostname;
        var wsUrl = `ws://${apiHost}:8000/ws/sat-data/${this.stationName}`;
        this.log("Connecting...");
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => this.log("Connected!");

        this.socket.onmessage = (event) => {
            var data = JSON.parse(event.data);
            if (data.status === "connected") return;
            if (data.error) {
                this.log("Error: " + data.error);
                return;
            }

            if (data.time && data.sats) {
                if (this.lastTime === data.time) return; // Deduplicate
                this.lastTime = data.time;

                this.log(`[${data.time}] GPS:${data.sats.GPS} GLO:${data.sats.GLONASS} GAL:${data.sats.Galileo} BDS:${data.sats.BeiDou}`);

                this.data.labels.push(data.time);
                this.data.datasets[0].data.push(data.sats.GPS);
                this.data.datasets[1].data.push(data.sats.GLONASS);
                this.data.datasets[2].data.push(data.sats.Galileo);
                this.data.datasets[3].data.push(data.sats.BeiDou);

                if (this.data.labels.length > 100) {
                    this.data.labels.shift();
                    this.data.datasets.forEach(ds => ds.data.shift());
                }
                this.chart.update('none');
            }
        };

        this.socket.onclose = () => this.log("Disconnected.");
        this.socket.onerror = (err) => {
            this.log("WebSocket Error.");
            console.error(err);
        };
    }

    log(msg) {
        var div = document.getElementById(`sat-log-${this.stationName}`);
        if (!div) return;
        var isScrolledToBottom = div.scrollHeight - div.clientHeight <= div.scrollTop + 50;

        var entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerText = msg;
        div.appendChild(entry);

        if (isScrolledToBottom) div.scrollTop = div.scrollHeight;
    }

    minimize() {
        var modal = document.getElementById(`sat-modal-${this.stationName}`);
        var content = document.getElementById(`${modal.id}-content`);

        if (content.style.display !== 'none') {
            content.style.display = 'none';
            modal.dataset.prevHeight = modal.style.height;
            modal.style.height = 'auto'; // Shrink to fit header
            modal.style.minHeight = '0px'; // Override CSS min-height
            modal.style.resize = 'none';
        } else {
            content.style.display = 'flex';
            modal.style.height = modal.dataset.prevHeight || 'auto';
            modal.style.minHeight = '100px'; // Restore CSS min-height
            modal.style.resize = 'both';
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
        var modal = document.getElementById(`sat-modal-${this.stationName}`);
        if (modal) modal.remove();

        delete activeMonitors[this.stationName];

        // Re-enable button if sidebar is still open for this station
        // (This part is tricky since sidebar might be showing another station, 
        // but typically user can only click button if sidebar is open)
        // We will just handle the button state when opening.
    }
}

function openSatelliteMonitor(stationName) {
    if (activeMonitors[stationName]) {
        // Bring to front
        var modal = document.getElementById(`sat-modal-${stationName}`);
        if (modal) {
            document.querySelectorAll('.sat-modal').forEach(m => m.style.zIndex = 2000);
            modal.style.zIndex = 2001;
        }
        return;
    }

    activeMonitors[stationName] = new SatelliteMonitor(stationName);
}

function closeSatelliteMonitor() {
    // Legacy function support removed or redirect
}

function makeDraggable(element, headerId) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var header = document.getElementById(headerId);

    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // Reset transform on first drag
        if (element.style.transform.includes('translate')) {
            var rect = element.getBoundingClientRect();
            element.style.transform = 'none';
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
        }

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;

        // Bring to front
        document.querySelectorAll('.sat-modal').forEach(m => m.style.zIndex = 2000);
        element.style.zIndex = 2001;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.right = 'auto'; // Prevent conflict
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 5. จัดการ Navbar และ Station List
var stationsBtn = document.getElementById('stations-btn');
var stationsList = document.getElementById('stations-list');

// สร้างลิสต์รายชื่อสถานี
stations.forEach(function (s) {
    var link = document.createElement('a');
    link.href = "#";
    // Add Dot Span with unique ID for Navbar
    link.innerHTML = `${s.name} (${s.code}) <span id="status-dot-nav-${s.name}" class="status-dot"></span>`;
    link.onclick = function (e) {
        e.preventDefault(); // ป้องกันการดีดขึ้นบนสุดของหน้า

        // เลื่อนแผนที่ไปหาสถานี และเปิด Sidebar
        map.setView([s.lat, s.lon], 10);
        openSidebar(s);

        // ปิด Dropdown
        stationsList.classList.remove('show');
    };
    stationsList.appendChild(link);
});

// Initialize Status Checks for ALL stations immediately
stations.forEach(function (s) {
    checkStationStatus(s.name);
});

// Toggle การแสดงผล Dropdown
stationsBtn.onclick = function () {
    stationsList.classList.toggle('show');
};



// 6. Lightbox Functions
var lightbox = document.getElementById('lightbox');
var lightboxImg = document.getElementById('lightbox-img');
var captionText = document.getElementById('caption');
var closeLightboxBtn = document.getElementsByClassName("close-lightbox")[0];

window.openLightbox = function (src) {
    lightbox.style.display = "block";
    lightboxImg.src = src;
    // captionText.innerHTML = src.split('/').pop(); // Optional: Show filename
}

window.closeLightbox = function () {
    lightbox.style.display = "none";
}

// Close when clicking X
if (closeLightboxBtn) {
    closeLightboxBtn.onclick = function () {
        closeLightbox();
    }
}

// Close when clicking outside the image

document.addEventListener('click', function (event) {
    // Handle Dropdown close
    if (!event.target.matches('#stations-btn')) {
        if (stationsList.classList.contains('show')) {
            stationsList.classList.remove('show');
        }
    }

    // Handle Lightbox close (if clicking background)
    if (event.target == lightbox) {
        closeLightbox();
    }
});

// --- Comparison Logic ---

var activeComparators = {}; // { id: StationComparator_Instance }

function openComparisonWizard(baseStationName) {
    // 1. Create Modal Overlay
    var overlay = document.createElement('div');
    overlay.className = 'comparison-modal-overlay';
    overlay.id = 'comparison-wizard-overlay';

    // 2. Modal Content (Single Page)
    var content = document.createElement('div');
    content.className = 'comparison-content';
    // Widen content for side-by-side layout
    content.style.width = '600px';
    content.style.maxHeight = '90vh';

    content.innerHTML = `
        <h3>Compare with ${baseStationName}</h3>
        
        <div style="display: flex; gap: 20px; height: 300px;">
            <!-- Left: Station List -->
            <div style="flex: 1; display: flex; flex-direction: column;">
                <p style="margin-top:0; font-weight:bold;">1. Select Station</p>
                <input type="text" id="station-search" placeholder="Search..." style="margin-bottom: 5px; padding: 5px; width: 100%; box-sizing: border-box;">
                <ul class="station-select-list" id="compare-station-list" style="border: 1px solid #ccc; flex: 1;">
                    <!-- Items injected here -->
                </ul>
            </div>

            <!-- Right: Systems & Controls -->
            <div style="flex: 1; display: flex; flex-direction: column;">
                <p style="margin-top:0; font-weight:bold;">2. Select Systems</p>
                <div class="system-checkbox-group" style="margin-top: 5px; flex: 1;">
                    <label class="system-checkbox-label"><input type="checkbox" value="GPS" checked> GPS</label>
                    <label class="system-checkbox-label"><input type="checkbox" value="GLONASS" checked> GLONASS</label>
                    <label class="system-checkbox-label"><input type="checkbox" value="Galileo" checked> Galileo</label>
                    <label class="system-checkbox-label"><input type="checkbox" value="BeiDou" checked> BeiDou</label>
                </div>
                
                <div style="margin-top: auto; text-align: right;">
                    <button class="btn-secondary" id="wizard-cancel-btn">Cancel</button>
                    <button class="btn-primary" id="wizard-start-btn" disabled>Start Comparison</button>
                </div>
            </div>
        </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeWizard();
    });

    var selectedTargetStation = null;
    var startBtn = document.getElementById('wizard-start-btn');
    var list = document.getElementById('compare-station-list');
    var searchInput = document.getElementById('station-search');

    function renderStationList(filterText = '') {
        list.innerHTML = '';
        stations.forEach(s => {
            if (s.name === baseStationName) return; // Skip self
            if (filterText && !s.name.toLowerCase().includes(filterText.toLowerCase()) && !s.code.toLowerCase().includes(filterText.toLowerCase())) return;

            var li = document.createElement('li');
            li.className = 'station-select-item';
            if (s.name === selectedTargetStation) {
                li.style.backgroundColor = '#e2e6ea';
                li.style.fontWeight = 'bold';
            }
            li.innerHTML = `<span>${s.name}</span> <span style="color:#888; font-size:12px;">${s.code}</span>`;
            li.onclick = () => {
                selectedTargetStation = s.name;
                startBtn.disabled = false;
                renderStationList(filterText); // Re-render to update highlights
            };
            list.appendChild(li);
        });
    }

    // Initial Render
    renderStationList();

    // Search Logic
    searchInput.oninput = (e) => {
        renderStationList(e.target.value);
    };

    document.getElementById('wizard-cancel-btn').onclick = closeWizard;

    startBtn.onclick = () => {
        var selectedSystems = [];
        document.querySelectorAll('.system-checkbox-group input:checked').forEach(cb => {
            selectedSystems.push(cb.value);
        });

        if (!selectedTargetStation) {
            alert("Please select a station to compare with.");
            return;
        }

        if (selectedSystems.length === 0) {
            alert("Please select at least one satellite system.");
            return;
        }

        startComparison(baseStationName, selectedTargetStation, selectedSystems);
        closeWizard();
    };

    function closeWizard() {
        document.body.removeChild(overlay);
    }
}

function startComparison(station1, station2, systems) {
    var id = `${station1}-${station2}`;
    if (activeComparators[id]) {
        // Bring to front logic if needed
        return;
    }
    activeComparators[id] = new StationComparator(station1, station2, systems);
}

class StationComparator {
    constructor(station1, station2, systems) {
        this.s1 = station1;
        this.s2 = station2;
        this.systems = systems;
        this.id = `${station1}-${station2}`;

        this.socket1 = null;
        this.socket2 = null;
        this.chart = null;

        this.data = {
            labels: [],
            datasets: []
        };

        // Define Distinct Colors
        // S1: Standard Primary Colors
        this.colorsS1 = {
            'GPS': 'rgba(255, 99, 132, 1)',     // Red
            'GLONASS': 'rgba(54, 162, 235, 1)', // Blue
            'Galileo': 'rgba(255, 206, 86, 1)', // Yellow
            'BeiDou': 'rgba(75, 192, 192, 1)'   // Teal
        };

        // S2: Clearly Distinct, Darker/Alternative Colors
        this.colorsS2 = {
            'GPS': 'rgba(153, 102, 255, 1)',    // Purple
            'GLONASS': 'rgba(46, 204, 113, 1)', // Green
            'Galileo': 'rgba(230, 126, 34, 1)', // Carrot Orange
            'BeiDou': 'rgba(255, 105, 180, 1)'  // Hot Pink
        };

        this.systems.forEach(sys => {
            // Station 1 (Solid, Primary)
            this.data.datasets.push({
                label: `${this.s1} - ${sys}`,
                data: [],
                borderColor: this.colorsS1[sys],
                backgroundColor: this.colorsS1[sys].replace('1)', '0.5)'),
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 0
            });

            // Station 2 (Dashed, Distinct Color)
            this.data.datasets.push({
                label: `${this.s2} - ${sys}`,
                data: [],
                borderColor: this.colorsS2[sys],
                backgroundColor: this.colorsS2[sys].replace('1)', '0.5)'),
                tension: 0.1,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            });
        });

        this.createWindow();
        this.initChart();
        this.connect();
    }

    createWindow() {
        var modalId = `comp-modal-${this.id}`;
        var div = document.createElement('div');
        div.id = modalId;
        div.className = 'sat-modal'; // Reuse existing class for basic styling
        div.style.width = '600px'; // Wider for comparison
        div.style.display = 'flex';
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';

        div.innerHTML = `
            <div id="${modalId}-header" class="sat-modal-header" style="background: #6f42c1;">
                <span class="sat-modal-title">⚔️ Compare: ${this.s1} vs ${this.s2}</span>
                <div class="sat-modal-controls">
                    <button class="close-btn">X</button>
                </div>
            </div>
            <div id="${modalId}-content" class="sat-modal-content">
                <div class="chart-container" style="height: 300px;">
                    <canvas id="compChart-${this.id}"></canvas>
                </div>
                <!-- Optional: Shared Log or Status -->
                <div style="font-size:12px; margin-top:5px; text-align:center; color:#555;">
                    Live Data Comparison (${this.systems.join(', ')})
                </div>
            </div>
        `;

        document.body.appendChild(div);

        div.querySelector('.close-btn').onclick = () => this.close();
        div.onmousedown = () => {
            document.querySelectorAll('.sat-modal').forEach(m => m.style.zIndex = 2000);
            div.style.zIndex = 2001;
        };

        makeDraggable(div, `${modalId}-header`);
    }

    initChart() {
        var ctx = document.getElementById(`compChart-${this.id}`).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.data,
            options: {
                scales: {
                    y: { beginAtZero: true, suggestedMax: 15 },
                    x: { display: false } // Hide X axis labels for cleaner look? Or keep them? Let's hide for now as time sync is tricky
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { usePointStyle: true, boxWidth: 10 }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                animation: false // Disable animation for performance
            }
        });
    }

    connect() {
        var apiHost = window.location.hostname;

        // Connect to S1
        this.socket1 = new WebSocket(`ws://${apiHost}:8000/ws/sat-data/${this.s1}`);
        this.socket1.onmessage = (e) => this.handleMessage(e, this.s1);

        // Connect to S2
        this.socket2 = new WebSocket(`ws://${apiHost}:8000/ws/sat-data/${this.s2}`);
        this.socket2.onmessage = (e) => this.handleMessage(e, this.s2);
    }

    handleMessage(event, stationName) {
        var data = JSON.parse(event.data);
        if (!data.sats) return;

        // Simple approach: On every message, update the corresponding dataset's last value 
        // OR push new value. Since charts need synchronized X-axis, this is tricky.
        // Simplified Strategy for MVP:
        // Just push data to the end. If they drift, so be it. 
        // Better: Use a shared time axis? 
        // Let's try: Push data. If dataset lengths differ significantly, trim?
        // Actually, let's just push.

        var timeLabel = data.time;

        // Check if we need to add a new label (shared X axis)
        // If the last label is different from this one, push it?
        // But we have two async streams.
        // Let's mostly rely on S1 to drive the X-axis labels, and S2 just updates its latest?
        // No, that might miss S2 data.

        // "Good Enough" Strategy:
        // Always push to datasets.
        // If `data.time` matches the last label, update the last point?
        // If `data.time` is new, push new point?

        // Let's just push blindly for now and see. 
        // Actually, Chart.js line charts expect data arrays to match labels array length usually?
        // No, they can be sparse if we use x/y objects, but here we use simple arrays.

        // Refined Strategy:
        // Use a single "latest time" tracker.

        this.updateChartData(stationName, data);
    }

    updateChartData(stationName, data) {
        // Find relevant datasets
        // Index 0, 2, 4... are S1
        // Index 1, 3, 5... are S2
        // But we filtered by system.

        // Map system -> dataset index
        // stored in this.systems order.

        this.systems.forEach((sys, i) => {
            var val = data.sats[sys];
            var datasetIndex = (i * 2) + (stationName === this.s1 ? 0 : 1);

            // Push data
            this.data.datasets[datasetIndex].data.push(val);

            // Shift if too long
            if (this.data.datasets[datasetIndex].data.length > 50) {
                this.data.datasets[datasetIndex].data.shift();
            }
        });

        // Labels
        // We'll just keep labels array synced with the longest dataset?
        // Or just push time.
        if (stationName === this.s1) { // Let S1 drive labels for simplicity
            this.data.labels.push(data.time);
            if (this.data.labels.length > 50) this.data.labels.shift();
            this.chart.update(); // Update only on S1 to avoid flickering? Or both?
        } else {
            this.chart.update('none');
        }
    }

    close() {
        if (this.socket1) this.socket1.close();
        if (this.socket2) this.socket2.close();

        var modal = document.getElementById(`comp-modal-${this.id}`);
        if (modal) modal.remove();

        delete activeComparators[this.id];
    }
}
