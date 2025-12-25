// ไม่ต้องใส่ <script> ครอบแล้ว เขียนโค้ดได้เลย

// 1. สร้างแผนที่
var map = L.map('map').setView([13.0, 101.5], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// 2. ดึงข้อมูลจังหวัด
var thaiProvincesUrl = 'https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json';

fetch(thaiProvincesUrl)
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: '#434c55ff',
                    weight: 0.2,
                    fillOpacity: 0.1
                };
            },
        }).addTo(map);
    });

// 3. ข้อมูลสถานี
var stations = [
    { name: "Chulalongkorn", code: "CUSV", lat: 13.7367, lon: 100.5331 },
    { name: "CM01", code: "CMU1", lat: 18.8000, lon: 98.9500 },
    { name: "CADT", code:"CADT", lat: 11.6545, lon: 104.9116},
    { name: "KMIT", code:"KMIT", lat: 13.7278, lon: 100.7724 }
];

stations.forEach(function(s) {
    L.marker([s.lat, s.lon]).addTo(map)
        .bindPopup(`<b>${s.name} (${s.code})</b>`);
});