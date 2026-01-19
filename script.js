

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
    { name: "CM01", code: "CMU1", lat: 18.8000, lon: 98.9500 },
    { name: "CADT", code: "CADT", lat: 11.6545, lon: 104.9116 },
    { name: "KMIT", code: "KMIT", lat: 13.7278, lon: 100.7724 },
    { name: "STFD", code: "STFD", lat: 13.7356, lon: 100.6611 },
    { name: "RUTI", code: "RUTI", lat: 14.9889, lon: 102.1206 },
    { name: "CPN1", code: "CPN1", lat: 10.7247, lon: 99.3744 },
    { name: "NUO2", code: "NUO2", lat: 17.9383, lon: 102.6261 },
    { name: "AER1", code: "AER1", lat: 13.6945, lon: 100.7608 },
    { name: "ITC0", code: "ITC0", lat: 11.5705, lon: 104.8994 },
    { name: "HUE0", code: "HUE0", lat: 16.4155, lon: 107.5687 },
    { name: "KKU0", code: "KKU0", lat: 16.4721, lon: 102.8260 }

];

var customIcon = L.icon({
    iconUrl: 'image/gnss-antenna-svgrepo-com (1).svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// 4. Sidebar Logic
var sidebar = document.getElementById('sidebar');
var closeSidebarBtn = document.getElementById('close-sidebar');
var sidebarContent = document.getElementById('sidebar-content');

function openSidebar(s) {
    sidebarContent.innerHTML = `
        <h3>${s.name} (${s.code})</h3>
        <p class="station-coords">Lat: ${s.lat.toFixed(4)}, Lon: ${s.lon.toFixed(4)}</p>
        <ul class="station-data-list">
            <li><a href="#">1. Heliosphere</a></li>
            <li><a href="#">2. Geospace</a></li>
            <li><a href="#">3. Ionosphere</a></li>
            <li><a href="#">4. Aerosol Optical Depth (AOD)</a></li>
        </ul>
    `;
    sidebar.classList.add('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

closeSidebarBtn.onclick = closeSidebar;


stations.forEach(function (s) {
    // Remove bindPopup and use click event
    var marker = L.marker([s.lat, s.lon], { icon: customIcon }).addTo(map)
        .bindTooltip(`<b>${s.name} (${s.code})</b>`)
        .on('click', function () {
            openSidebar(s);
            // Center map on marker if desired, but maybe keep it simple for now
            map.setView([s.lat, s.lon], 10);
        });

    s.marker = marker; // เก็บ marker ไว้ใน object เพื่อเรียกใช้ภายหลัง
});

// 5. จัดการ Navbar และ Station List
var stationsBtn = document.getElementById('stations-btn');
var stationsList = document.getElementById('stations-list');

// สร้างลิสต์รายชื่อสถานี
stations.forEach(function (s) {
    var link = document.createElement('a');
    link.href = "#";
    link.textContent = s.name + " (" + s.code + ")";
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

// Toggle การแสดงผล Dropdown
stationsBtn.onclick = function () {
    stationsList.classList.toggle('show');
};

// ปิด Dropdown เมื่อคลิกที่อื่น
window.onclick = function (event) {
    if (!event.target.matches('#stations-btn')) {
        if (stationsList.classList.contains('show')) {
            stationsList.classList.remove('show');
        }
    }
    // Also close sidebar if clicking on map? Maybe not requested but good UX.
    // For now, adhere to explicit close button or requirement. 
    // Actually typically clicking on map closes stuff, but let's stick to close button for now.
};