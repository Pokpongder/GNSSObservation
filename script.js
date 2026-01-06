

// 1. สร้างแผนที่
var bounds = [[-90, -180], [90, 180]];

var map = L.map('map', {
    maxBounds: bounds,       // ห้ามลากออกนอกขอบเขต
    maxBoundsViscosity: 1.0, // ความหนืดที่ขอบ (1.0 = แข็ง, ลากออกไม่ได้เลย)
    minZoom: 2               // ห้าม Zoom out จนเล็กเกินไป (เห็นโลกหลายใบ)
}).setView([13.0, 101.5], 6);

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
    { name: "KMIT", code: "KMIT", lat: 13.7278, lon: 100.7724 }
];

stations.forEach(function (s) {
    // สร้างเนื้อหา Popup สำหรับแสดงรายการ
    var popupContent = `
        <div class="station-popup">
            <h3>${s.name} (${s.code})</h3>
            <ul class="station-data-list">
                <li><a href="#">1. Heliosphere</a></li>
                <li><a href="#">2. Geospace</a></li>
                <li><a href="#">3. Ionosphere</a></li>
                <li><a href="#">4. Aerosol Optical Depth (AOD)</a></li>
            </ul>
        </div>
    `;

    var marker = L.marker([s.lat, s.lon]).addTo(map)
        .bindTooltip(`<b>${s.name} (${s.code})</b>`)
        .bindPopup(popupContent, {
            className: 'square-popup'
        });

    s.marker = marker; // เก็บ marker ไว้ใน object เพื่อเรียกใช้ภายหลัง
});

// 4. จัดการ Navbar และ Station List
var stationsBtn = document.getElementById('stations-btn');
var stationsList = document.getElementById('stations-list');

// สร้างลิสต์รายชื่อสถานี
stations.forEach(function (s) {
    var link = document.createElement('a');
    link.href = "#";
    link.textContent = s.name + " (" + s.code + ")";
    link.onclick = function (e) {
        e.preventDefault(); // ป้องกันการดีดขึ้นบนสุดของหน้า

        // เลื่อนแผนที่ไปหาสถานี และเปิด Popup
        map.setView([s.lat, s.lon], 10);
        s.marker.openPopup();

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
};