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