

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
var stations = [
    // --- Original Stations ---
    { name: "CHMA", code: "CHMA", lat: 18.8000, lon: 98.9500 },
    { name: "CADT", code: "CADT", lat: 11.6545, lon: 104.9116 },
    { name: "KMI6", code: "KMI6", lat: 13.7278, lon: 100.7724 },
    { name: "STFD", code: "STFD", lat: 13.7356, lon: 100.6611 },
    { name: "RUT1", code: "RUT1", lat: 14.9889, lon: 102.1206 },
    { name: "CPN1", code: "CPN1", lat: 10.7247, lon: 99.3744 },
    { name: "NUO2", code: "NUO2", lat: 17.9383, lon: 102.6261 },
    { name: "ITC0", code: "ITC0", lat: 11.5705, lon: 104.8994 },
    { name: "HUEV", code: "HUEV", lat: 16.4155, lon: 107.5687 },
    { name: "KKU0", code: "KKU0", lat: 16.4721, lon: 102.8260 },

    // --- DPT Stations ---
    { name: "NKSW", code: "NKSW", lat: 15.690637, lon: 100.114112 },
    { name: "UTTD", code: "UTTD", lat: 17.630094, lon: 100.096343 },
    { name: "CHAN", code: "CHAN", lat: 12.610310, lon: 102.102411 },
    { name: "SPBR", code: "SPBR", lat: 14.518875, lon: 100.130580 },
    { name: "DPT9", code: "DPT9", lat: 13.756782, lon: 100.573200 },
    { name: "PJRK", code: "PJRK", lat: 11.811621, lon: 99.796348 },
    { name: "SRTN", code: "SRTN", lat: 9.132225, lon: 99.331361 },
    { name: "NKNY", code: "NKNY", lat: 14.212003, lon: 101.202211 },
    { name: "SOKA", code: "SOKA", lat: 7.206694, lon: 100.596121 },
    { name: "UDON", code: "UDON", lat: 17.412732, lon: 102.780704 },
    { name: "CNBR", code: "CNBR", lat: 13.406019, lon: 100.997652 },
    { name: "NKRM", code: "NKRM", lat: 14.992119, lon: 102.129470 },
    { name: "LPBR", code: "LPBR", lat: 14.800907, lon: 100.651246 },
    { name: "SISK", code: "SISK", lat: 15.116122, lon: 104.285676 }
];
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

// 4. Sidebar Logic
var sidebar = document.getElementById('sidebar');
var closeSidebarBtn = document.getElementById('close-sidebar');
var sidebarContent = document.getElementById('sidebar-content');

function openSidebar(s) {
    sidebarContent.innerHTML = `
        <h3>${s.name} (${s.code}) <span id="status-dot-${s.code}" class="status-dot"></span></h3>
        <p class="station-coords">Lat: ${s.lat.toFixed(4)}, Lon: ${s.lon.toFixed(4)}</p>
        <ul class="station-data-list">
            <li>
                <a href="#" onclick="toggleIonosphere(event)">1. Ionosphere &#9662;</a>
                <div id="ionosphere-content" class="accordion-content">
                    <br>
                     <img src="http://localhost:8000/ionospherebystation/${s.name}/latest.jpg" alt="${s.name} View" class="station-image" title="Click for Full image" onclick="openLightbox(this.src)" onerror="this.parentElement.style.display='none'">
                </div>
            </li>
        </ul>
    `;
    sidebar.classList.add('open');
    checkStationStatus(s.name, s.code);
}
function checkStationStatus(stationName, stationCode) {
    // 1. ดึง Element สำหรับ dot ใน Sidebar และ Navbar
    var dotSidebar = document.getElementById('status-dot-' + stationCode);
    var dotNav = document.getElementById('status-dot-nav-' + stationCode);

    // หา station object เพื่ออัปเดต marker icon บนแผนที่
    var station = stations.find(s => s.code === stationCode);

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
        }
    }

    // 2. เช็คสถานะจาก NTRIP endpoint
    var url = `http://localhost:8000/ntrip-status/${stationName}`;

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

// Function to toggle Ionosphere section
window.toggleIonosphere = function (e) {
    e.preventDefault();
    var content = document.getElementById('ionosphere-content');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
};

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

// 5. จัดการ Navbar และ Station List
var stationsBtn = document.getElementById('stations-btn');
var stationsList = document.getElementById('stations-list');

// สร้างลิสต์รายชื่อสถานี
stations.forEach(function (s) {
    var link = document.createElement('a');
    link.href = "#";
    // Add Dot Span with unique ID for Navbar
    link.innerHTML = `${s.name} (${s.code}) <span id="status-dot-nav-${s.code}" class="status-dot"></span>`;
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
    checkStationStatus(s.name, s.code);
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