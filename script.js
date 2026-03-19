// 1. Initialize the Leaflet Map
// coordinates [0, 0] is the center of the world, zoom level 2
const map = L.map('map').setView([0, 0], 2);

// 2. Add Dark Theme to the Map (OpenStreetMap with Dark Style)
// You can use a different provider if you prefer a different look.
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// 3. Simple Interaction: Log when map is clicked (we can use this to add pins later)
map.on('click', function(e) {
    console.log("Map Clicked at: " + e.latlng);
});

// 4. Modal Functions
function showModal() {
    document.getElementById('user-modal').classList.remove('hidden');
}

function closeModal() {
    const dream = document.getElementById('dream-input').value;
    if (dream.trim() === "") {
        alert("Please share your dream first!");
        document.getElementById('user-modal').classList.add('hidden');
        return;
    }

    // This is where Firebase will go later to save data!
    console.log("Saving Dream:", dream);
    console.log("Age:", document.getElementById('user-age').value);

    // Show a success message
    alert("Dream Pinned! Future Updates will show this globally.");
    
    // Clear input and close modal
    document.getElementById('dream-input').value = "";
    document.getElementById('user-modal').classList.add('hidden');
}

// 5. Event Listeners for buttons
document.getElementById('pin-btn').addEventListener('click', showModal);
document.getElementById('finish-btn').addEventListener('click', closeModal);

// Optional: Close modal if clicking outside the modal content
window.onclick = function(event) {
    const modal = document.getElementById('user-modal');
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
}
