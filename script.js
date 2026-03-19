// 1. Initialize the Map
const map = L.map('map').setView([20, 0], 2); // ලෝකය මැදට පෙනෙන විදිහට [20, 0] දැම්මා

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 2. Modal පාලනය කරන Function එක
function showModal() {
    const dream = document.getElementById('dream-input').value;
    if (dream.trim() === "") {
        alert("ඔයාගේ හීනය මුලින්ම ලියන්න! ✨");
        return;
    }
    document.getElementById('user-modal').classList.remove('hidden');
}

// 3. පින් එක ඇඩ් කරන සහ Modal එක වහන ප්‍රධාන Function එක
function closeModal() {
    const dream = document.getElementById('dream-input').value;
    const category = document.getElementById('category').value;

    // --- පින් එක මැප් එකට ඇඩ් කරන කොටස ---
    // දැනට අපි ලෝකයේ අහඹු තැනකට (Random Location) පින් එකක් දාමු 
    // පස්සේ අපිට පුළුවන් යූසර් ඉන්න තැනටම (Live Location) මේක ගන්න.
    const lat = (Math.random() * 120) - 60; 
    const lng = (Math.random() * 360) - 180;

    // ලස්සන Custom Icon එකක් (Neon Dot එකක් වගේ)
    const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div class="pin-glow"></div>`,
        iconSize: [20, 20]
    });

    // මැප් එකට Marker එක ඇඩ් කරනවා
    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    
    // පින් එක උඩ Click කරාම හීනය පේන්න හදමු
    marker.bindPopup(`<b>Dream:</b> ${dream}<br><b>Category:</b> ${category}`).openPopup();

    // UI එක Reset කරනවා
    document.getElementById('dream-input').value = "";
    document.getElementById('user-modal').classList.add('hidden');
}

// Event Listeners
document.getElementById('pin-btn').addEventListener('click', showModal);
document.getElementById('finish-btn').addEventListener('click', closeModal);
