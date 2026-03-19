/**
 * ═══════════════════════════════════════════════════════════════
 *  GLOBAL BUCKET LIST — app.js
 *  Author: Global Bucket List Team
 *  Modules: MapManager · DreamStore · PinEngine · UIManager
 *           ModalManager · PulseEngine · CelestialBridge
 *  Firebase Firestore integration points marked with 🔥
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const CONFIG = {
  mapCenter:      [20, 0],
  mapZoom:        2.5,
  tileUrl:        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttr:       '©OpenStreetMap ©CARTO',
  celestialEvery: 30000,       // ms between Celestial Bridge draws
  pulseMin:       8400,
  pulseMax:       18700,
  pulseFluctMin:  -240,
  pulseFluctMax:  280,
  pulseTick:      2800,
  demoCount:      22,           // seed pins on first load
};

/* ─── Category → color map ─── */
const CATEGORY_COLORS = {
  Travel:    '#00f2ff',   // neon blue
  Career:    '#c084fc',   // purple
  Love:      '#ff4d6d',   // red
  Money:     '#fbbf24',   // gold
  Health:    '#4ade80',   // green
  Adventure: '#fb923c',   // orange
};

/* ─── Demo dreams for seeding ─── */
const DEMO_DREAMS = [
  { dream: 'Swim with whale sharks in the Maldives', category: 'Travel',    year: 2026, lat:  4.17,  lng:  73.51,  anon: true  },
  { dream: 'Build my first profitable startup',       category: 'Career',   year: 2027, lat: 37.77,  lng:-122.43,  anon: false },
  { dream: 'Watch the Northern Lights in Iceland',    category: 'Travel',   year: 2025, lat: 64.13,  lng: -21.93,  anon: true  },
  { dream: 'Fall in love on a Parisian rooftop',      category: 'Love',     year: 2026, lat: 48.86,  lng:   2.35,  anon: true  },
  { dream: 'Retire at 40 with financial freedom',     category: 'Money',    year: 2035, lat: 51.51,  lng:  -0.13,  anon: false },
  { dream: 'Hike the entire Appalachian Trail',       category: 'Adventure',year: 2028, lat: 41.02,  lng: -76.57,  anon: true  },
  { dream: 'Speak fluent Japanese',                   category: 'Career',   year: 2027, lat: 35.69,  lng: 139.69,  anon: false },
  { dream: 'See the cherry blossoms in Kyoto',        category: 'Travel',   year: 2025, lat: 35.01,  lng: 135.77,  anon: true  },
  { dream: 'Run a marathon in every continent',       category: 'Health',   year: 2030, lat:-33.87,  lng: 151.21,  anon: false },
  { dream: 'Write and publish my first novel',        category: 'Career',   year: 2026, lat: 40.71,  lng: -74.00,  anon: true  },
  { dream: 'Climb Kilimanjaro with my best friends',  category: 'Adventure',year: 2027, lat: -3.07,  lng:  37.35,  anon: false },
  { dream: 'Start a family in the Tuscan countryside',category: 'Love',     year: 2028, lat: 43.46,  lng:  11.06,  anon: true  },
  { dream: 'Invest in my first piece of real estate', category: 'Money',    year: 2026, lat: 25.20,  lng:  55.27,  anon: false },
  { dream: 'Witness a total solar eclipse in person', category: 'Travel',   year: 2026, lat: 39.92,  lng: 116.39,  anon: true  },
  { dream: 'Become a certified scuba diver',          category: 'Adventure',year: 2025, lat: -13.16, lng: -72.54,  anon: false },
  { dream: 'Donate 10% of my income every year',      category: 'Money',    year: 2025, lat: -26.20, lng:  28.04,  anon: true  },
  { dream: 'Learn to fly a small aircraft',           category: 'Adventure',year: 2029, lat: 55.75,  lng:  37.62,  anon: false },
  { dream: 'Heal my relationship with my parents',    category: 'Love',     year: 2025, lat: 28.61,  lng:  77.20,  anon: true  },
  { dream: 'Break a world record at something',       category: 'Career',   year: 2028, lat: -22.91, lng: -43.17,  anon: false },
  { dream: 'Meditate for 365 days in a row',          category: 'Health',   year: 2025, lat: 27.47,  lng:  89.64,  anon: true  },
  { dream: 'Road trip across Route 66',               category: 'Travel',   year: 2026, lat: 35.46,  lng:-105.94,  anon: false },
  { dream: 'Live abroad for at least one full year',  category: 'Travel',   year: 2027, lat:  1.35,  lng: 103.82,  anon: true  },
];


/* ═══════════════════════════════════════════════════════════════
   DREAM STORE  (replace with Firebase Firestore in production)
═══════════════════════════════════════════════════════════════ */
const DreamStore = (() => {
  let dreams = [];
  let listeners = [];

  function generateId() {
    return `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function add(dreamObj) {
    const entry = {
      id:        generateId(),
      dream:     dreamObj.dream,
      category:  dreamObj.category,
      year:      dreamObj.year || null,
      anon:      dreamObj.anon !== false,
      lat:       dreamObj.lat,
      lng:       dreamObj.lng,
      ts:        Date.now(),
    };
    dreams.unshift(entry);

    // 🔥 Firebase: db.collection('dreams').add(entry);

    listeners.forEach(fn => fn('add', entry));
    return entry;
  }

  function getAll()             { return [...dreams]; }
  function getById(id)          { return dreams.find(d => d.id === id); }
  function onUpdate(fn)         { listeners.push(fn); }

  return { add, getAll, getById, onUpdate };
})();


/* ═══════════════════════════════════════════════════════════════
   MAP MANAGER
═══════════════════════════════════════════════════════════════ */
const MapManager = (() => {
  let map;
  let celestialLayer;

  function init() {
    map = L.map('map', {
      center:          CONFIG.mapCenter,
      zoom:            CONFIG.mapZoom,
      minZoom:         2,
      maxZoom:         16,
      zoomControl:     true,
      attributionControl: false,
    });

    L.tileLayer(CONFIG.tileUrl, {
      attribution: CONFIG.tileAttr,
      subdomains:  'abcd',
      maxZoom:     19,
    }).addTo(map);

    // SVG overlay for Celestial Bridge lines
    celestialLayer = L.svg().addTo(map);

    return map;
  }

  function getMap()           { return map; }
  function getCelestialLayer(){ return celestialLayer; }

  return { init, getMap, getCelestialLayer };
})();


/* ═══════════════════════════════════════════════════════════════
   PIN ENGINE
═══════════════════════════════════════════════════════════════ */
const PinEngine = (() => {
  const markerMap = {};   // id → Leaflet marker

  function createIcon(category) {
    const color = CATEGORY_COLORS[category] || '#00f2ff';
    const html = `
      <div class="custom-pin" style="color:${color}">
        <div class="pin-ring" style="border-color:${color};color:${color}"></div>
        <div class="pin-ring pin-ring-2" style="border-color:${color};color:${color}"></div>
        <div class="pin-dot" style="background:${color}"></div>
      </div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize:  [30, 30],
      iconAnchor:[15, 15],
    });
  }

  function buildPopup(entry) {
    const color    = CATEGORY_COLORS[entry.category] || '#00f2ff';
    const yearHtml = entry.year
      ? `<span class="popup-year">⏳ ${entry.year}</span>`
      : '';
    const anonHtml = entry.anon
      ? `<span>👻 Anonymous</span>`
      : `<span>🌍 Dreamer</span>`;

    return `
      <div class="popup-inner">
        <div class="popup-category" style="color:${color}">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
            background:${color};margin-right:5px;vertical-align:middle;
            box-shadow:0 0 6px ${color}"></span>
          ${entry.category}
        </div>
        <div class="popup-dream">${escapeHtml(entry.dream)}</div>
        <div class="popup-meta">
          ${anonHtml}
          ${yearHtml}
        </div>
      </div>`;
  }

  function addPin(entry) {
    const map    = MapManager.getMap();
    const icon   = createIcon(entry.category);
    const marker = L.marker([entry.lat, entry.lng], { icon })
      .addTo(map)
      .bindPopup(buildPopup(entry), {
        maxWidth: 280,
        closeButton: true,
      });

    markerMap[entry.id] = marker;
    return marker;
  }

  function getAllMarkers() { return Object.values(markerMap); }
  function getEntries()   { return DreamStore.getAll(); }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { addPin, getAllMarkers, getEntries };
})();


/* ═══════════════════════════════════════════════════════════════
   CELESTIAL BRIDGE  — draws glowing SVG lines between random pins
═══════════════════════════════════════════════════════════════ */
const CelestialBridge = (() => {
  let activeLines = [];

  function draw() {
    const dreams  = DreamStore.getAll();
    if (dreams.length < 2) return;

    clearLines();

    // Pick two distinct random entries
    const a = dreams[Math.floor(Math.random() * dreams.length)];
    let b;
    do { b = dreams[Math.floor(Math.random() * dreams.length)]; } while (b.id === a.id);

    const map    = MapManager.getMap();
    const color  = '#00f2ff';
    const points = [L.latLng(a.lat, a.lng), L.latLng(b.lat, b.lng)];

    // Glow outer line
    const outer = L.polyline(points, {
      color,
      weight:  2,
      opacity: 0.25,
      dashArray: '8 6',
      className: 'celestial-outer',
    }).addTo(map);

    // Bright inner line
    const inner = L.polyline(points, {
      color,
      weight:  1,
      opacity: 0.7,
      className: 'celestial-inner',
    }).addTo(map);

    activeLines = [outer, inner];

    // Fade out after 8s
    setTimeout(() => {
      clearLines();
    }, 8000);
  }

  function clearLines() {
    const map = MapManager.getMap();
    activeLines.forEach(l => { try { map.removeLayer(l); } catch(e){} });
    activeLines = [];
  }

  function start() {
    setTimeout(() => {
      draw();
      setInterval(draw, CONFIG.celestialEvery);
    }, 5000);
  }

  return { start };
})();


/* ═══════════════════════════════════════════════════════════════
   PULSE ENGINE  — live 'Souls Dreaming Now' counter
═══════════════════════════════════════════════════════════════ */
const PulseEngine = (() => {
  let current = CONFIG.pulseMin + Math.floor(Math.random() * (CONFIG.pulseMax - CONFIG.pulseMin));
  const el     = document.getElementById('soulCount');

  function update() {
    const delta = CONFIG.pulseFluctMin
      + Math.floor(Math.random() * (CONFIG.pulseFluctMax - CONFIG.pulseFluctMin));
    current = Math.max(CONFIG.pulseMin, Math.min(CONFIG.pulseMax, current + delta));
    el.textContent = current.toLocaleString();
  }

  function start() {
    update();
    setInterval(update, CONFIG.pulseTick);
  }

  return { start };
})();


/* ═══════════════════════════════════════════════════════════════
   UI MANAGER  — sidebar feed + pin form
═══════════════════════════════════════════════════════════════ */
const UIManager = (() => {
  const feedList  = document.getElementById('feedList');
  const totalPins = document.getElementById('totalPins');

  function renderFeedItem(entry) {
    const color  = CATEGORY_COLORS[entry.category] || '#00f2ff';
    const yearEl = entry.year ? `<span class="feed-year">⏳ ${entry.year}</span>` : '';
    const anonEl = entry.anon ? `<span>👻 Anon</span>` : `<span>🌍 Dreamer</span>`;

    const item = document.createElement('div');
    item.className = 'feed-item';
    item.dataset.id = entry.id;
    item.innerHTML = `
      <div>
        <span class="feed-category-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>
        <span class="feed-cat-label" style="color:${color}">${entry.category}</span>
      </div>
      <div class="feed-dream">${escapeHtml(entry.dream)}</div>
      <div class="feed-meta">
        ${anonEl}
        ${yearEl}
      </div>`;

    feedList.prepend(item);
    updateCount();
  }

  function updateCount() {
    const n = DreamStore.getAll().length;
    totalPins.textContent = `${n} dream${n !== 1 ? 's' : ''}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Character counter for textarea
  const dreamText  = document.getElementById('dreamText');
  const charUsed   = document.getElementById('charUsed');
  dreamText.addEventListener('input', () => {
    charUsed.textContent = dreamText.value.length;
  });

  // Sidebar toggle (mobile)
  const sidebar       = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  return { renderFeedItem, updateCount };
})();


/* ═══════════════════════════════════════════════════════════════
   MODAL MANAGER
═══════════════════════════════════════════════════════════════ */
const ModalManager = (() => {
  const overlay   = document.getElementById('modalOverlay');
  const closeBtn  = document.getElementById('modalClose');
  const launchBtn = document.getElementById('launchDreamBtn');
  const chips     = document.querySelectorAll('#interestChips .chip');

  let pendingData = null;   // dream data waiting for modal completion

  // Interest chip toggle
  chips.forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  function open(data) {
    pendingData = data;
    overlay.classList.add('active');
    document.getElementById('userAge').value = '';
    chips.forEach(c => c.classList.remove('active'));
  }

  function close() {
    overlay.classList.remove('active');
    pendingData = null;
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  launchBtn.addEventListener('click', () => {
    if (!pendingData) return;

    const age = parseInt(document.getElementById('userAge').value) || null;
    const interests = [...chips]
      .filter(c => c.classList.contains('active'))
      .map(c => c.dataset.val);

    // 🔥 Firebase: optionally attach age/interests to dream entry
    const enriched = { ...pendingData, age, interests };

    // Add to store and render
    const entry = DreamStore.add(enriched);
    PinEngine.addPin(entry);
    UIManager.renderFeedItem(entry);

    // Fly to pin
    MapManager.getMap().flyTo([entry.lat, entry.lng], 5, { animate: true, duration: 1.4 });

    showToast('🌍 Your dream is pinned to the world!');
    close();
  });

  return { open, close };
})();


/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
function showToast(msg, duration = 3500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}


/* ═══════════════════════════════════════════════════════════════
   PIN IT BUTTON — collect dream + open modal
═══════════════════════════════════════════════════════════════ */
document.getElementById('pinItBtn').addEventListener('click', () => {
  const dreamText  = document.getElementById('dreamText').value.trim();
  const category   = document.getElementById('categorySelect').value;
  const year       = parseInt(document.getElementById('goalYear').value) || null;
  const anon       = document.getElementById('anonymousToggle').checked;

  if (!dreamText) {
    showToast('✏️ Please write your dream first!');
    document.getElementById('dreamText').focus();
    return;
  }

  // Get a random geo position on land (demo fallback)
  const { lat, lng } = getRandomCoords();

  ModalManager.open({ dream: dreamText, category, year, anon, lat, lng });
});


/* ═══════════════════════════════════════════════════════════════
   RANDOM COORDINATES  (demo — replace with geolocation or user pick)
═══════════════════════════════════════════════════════════════ */
function getRandomCoords() {
  const LAND_COORDS = [
    { lat:  48.86, lng:   2.35 },  // Paris
    { lat:  51.51, lng:  -0.13 },  // London
    { lat:  40.71, lng: -74.00 },  // New York
    { lat:  35.69, lng: 139.69 },  // Tokyo
    { lat: -33.87, lng: 151.21 },  // Sydney
    { lat:  28.61, lng:  77.20 },  // Delhi
    { lat: -23.55, lng: -46.63 },  // São Paulo
    { lat:  55.75, lng:  37.62 },  // Moscow
    { lat:  30.04, lng:  31.24 },  // Cairo
    { lat:  -1.29, lng:  36.82 },  // Nairobi
    { lat:  19.43, lng: -99.13 },  // Mexico City
    { lat:  37.77, lng:-122.43 },  // San Francisco
    { lat:  1.35,  lng: 103.82 },  // Singapore
    { lat: 52.37,  lng:   4.90 },  // Amsterdam
    { lat: 41.01,  lng:  28.97 },  // Istanbul
    { lat: 64.13,  lng: -21.93 },  // Reykjavik
    { lat: -13.16, lng: -72.54 },  // Machu Picchu
    { lat:  25.20, lng:  55.27 },  // Dubai
    { lat: -26.20, lng:  28.04 },  // Johannesburg
    { lat:  43.70, lng: -79.42 },  // Toronto
  ];
  // Add slight jitter so pins don't stack exactly
  const base = LAND_COORDS[Math.floor(Math.random() * LAND_COORDS.length)];
  return {
    lat: base.lat + (Math.random() - 0.5) * 3,
    lng: base.lng + (Math.random() - 0.5) * 3,
  };
}


/* ═══════════════════════════════════════════════════════════════
   SEED DEMO PINS
═══════════════════════════════════════════════════════════════ */
function seedDemoPins() {
  DEMO_DREAMS.forEach((d, i) => {
    setTimeout(() => {
      const entry = DreamStore.add(d);
      PinEngine.addPin(entry);
      UIManager.renderFeedItem(entry);
    }, i * 80);  // staggered for visual effect
  });
}


/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  MapManager.init();
  PulseEngine.start();
  CelestialBridge.start();
  seedDemoPins();

  // 🔥 Firebase: Replace seedDemoPins() with:
  //   db.collection('dreams').orderBy('ts','desc').limit(50)
  //     .onSnapshot(snapshot => {
  //       snapshot.docChanges().forEach(change => {
  //         if (change.type === 'added') {
  //           const entry = { id: change.doc.id, ...change.doc.data() };
  //           PinEngine.addPin(entry);
  //           UIManager.renderFeedItem(entry);
  //         }
  //       });
  //     });
});
/**
 * ═══════════════════════════════════════════════════════════════
 *  GLOBAL BUCKET LIST — app.js
 *  Author: Global Bucket List Team
 *  Modules: MapManager · DreamStore · PinEngine · UIManager
 *           ModalManager · PulseEngine · CelestialBridge
 *  Firebase Firestore integration points marked with 🔥
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */
const CONFIG = {
  mapCenter:      [20, 0],
  mapZoom:        2.5,
  tileUrl:        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttr:       '©OpenStreetMap ©CARTO',
  celestialEvery: 30000,       // ms between Celestial Bridge draws
  pulseMin:       8400,
  pulseMax:       18700,
  pulseFluctMin:  -240,
  pulseFluctMax:  280,
  pulseTick:      2800,
  demoCount:      22,           // seed pins on first load
};

/* ─── Category → color map ─── */
const CATEGORY_COLORS = {
  Travel:    '#00f2ff',   // neon blue
  Career:    '#c084fc',   // purple
  Love:      '#ff4d6d',   // red
  Money:     '#fbbf24',   // gold
  Health:    '#4ade80',   // green
  Adventure: '#fb923c',   // orange
};

/* ─── Demo dreams for seeding ─── */
const DEMO_DREAMS = [
  { dream: 'Swim with whale sharks in the Maldives', category: 'Travel',    year: 2026, lat:  4.17,  lng:  73.51,  anon: true  },
  { dream: 'Build my first profitable startup',       category: 'Career',   year: 2027, lat: 37.77,  lng:-122.43,  anon: false },
  { dream: 'Watch the Northern Lights in Iceland',    category: 'Travel',   year: 2025, lat: 64.13,  lng: -21.93,  anon: true  },
  { dream: 'Fall in love on a Parisian rooftop',      category: 'Love',     year: 2026, lat: 48.86,  lng:   2.35,  anon: true  },
  { dream: 'Retire at 40 with financial freedom',     category: 'Money',    year: 2035, lat: 51.51,  lng:  -0.13,  anon: false },
  { dream: 'Hike the entire Appalachian Trail',       category: 'Adventure',year: 2028, lat: 41.02,  lng: -76.57,  anon: true  },
  { dream: 'Speak fluent Japanese',                   category: 'Career',   year: 2027, lat: 35.69,  lng: 139.69,  anon: false },
  { dream: 'See the cherry blossoms in Kyoto',        category: 'Travel',   year: 2025, lat: 35.01,  lng: 135.77,  anon: true  },
  { dream: 'Run a marathon in every continent',       category: 'Health',   year: 2030, lat:-33.87,  lng: 151.21,  anon: false },
  { dream: 'Write and publish my first novel',        category: 'Career',   year: 2026, lat: 40.71,  lng: -74.00,  anon: true  },
  { dream: 'Climb Kilimanjaro with my best friends',  category: 'Adventure',year: 2027, lat: -3.07,  lng:  37.35,  anon: false },
  { dream: 'Start a family in the Tuscan countryside',category: 'Love',     year: 2028, lat: 43.46,  lng:  11.06,  anon: true  },
  { dream: 'Invest in my first piece of real estate', category: 'Money',    year: 2026, lat: 25.20,  lng:  55.27,  anon: false },
  { dream: 'Witness a total solar eclipse in person', category: 'Travel',   year: 2026, lat: 39.92,  lng: 116.39,  anon: true  },
  { dream: 'Become a certified scuba diver',          category: 'Adventure',year: 2025, lat: -13.16, lng: -72.54,  anon: false },
  { dream: 'Donate 10% of my income every year',      category: 'Money',    year: 2025, lat: -26.20, lng:  28.04,  anon: true  },
  { dream: 'Learn to fly a small aircraft',           category: 'Adventure',year: 2029, lat: 55.75,  lng:  37.62,  anon: false },
  { dream: 'Heal my relationship with my parents',    category: 'Love',     year: 2025, lat: 28.61,  lng:  77.20,  anon: true  },
  { dream: 'Break a world record at something',       category: 'Career',   year: 2028, lat: -22.91, lng: -43.17,  anon: false },
  { dream: 'Meditate for 365 days in a row',          category: 'Health',   year: 2025, lat: 27.47,  lng:  89.64,  anon: true  },
  { dream: 'Road trip across Route 66',               category: 'Travel',   year: 2026, lat: 35.46,  lng:-105.94,  anon: false },
  { dream: 'Live abroad for at least one full year',  category: 'Travel',   year: 2027, lat:  1.35,  lng: 103.82,  anon: true  },
];


/* ═══════════════════════════════════════════════════════════════
   DREAM STORE  (replace with Firebase Firestore in production)
═══════════════════════════════════════════════════════════════ */
const DreamStore = (() => {
  let dreams = [];
  let listeners = [];

  function generateId() {
    return `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function add(dreamObj) {
    const entry = {
      id:        generateId(),
      dream:     dreamObj.dream,
      category:  dreamObj.category,
      year:      dreamObj.year || null,
      anon:      dreamObj.anon !== false,
      lat:       dreamObj.lat,
      lng:       dreamObj.lng,
      ts:        Date.now(),
    };
    dreams.unshift(entry);

    // 🔥 Firebase: db.collection('dreams').add(entry);

    listeners.forEach(fn => fn('add', entry));
    return entry;
  }

  function getAll()             { return [...dreams]; }
  function getById(id)          { return dreams.find(d => d.id === id); }
  function onUpdate(fn)         { listeners.push(fn); }

  return { add, getAll, getById, onUpdate };
})();


/* ═══════════════════════════════════════════════════════════════
   MAP MANAGER
═══════════════════════════════════════════════════════════════ */
const MapManager = (() => {
  let map;
  let celestialLayer;

  function init() {
    map = L.map('map', {
      center:          CONFIG.mapCenter,
      zoom:            CONFIG.mapZoom,
      minZoom:         2,
      maxZoom:         16,
      zoomControl:     true,
      attributionControl: false,
    });

    L.tileLayer(CONFIG.tileUrl, {
      attribution: CONFIG.tileAttr,
      subdomains:  'abcd',
      maxZoom:     19,
    }).addTo(map);

    // SVG overlay for Celestial Bridge lines
    celestialLayer = L.svg().addTo(map);

    return map;
  }

  function getMap()           { return map; }
  function getCelestialLayer(){ return celestialLayer; }

  return { init, getMap, getCelestialLayer };
})();


/* ═══════════════════════════════════════════════════════════════
   PIN ENGINE
═══════════════════════════════════════════════════════════════ */
const PinEngine = (() => {
  const markerMap = {};   // id → Leaflet marker

  function createIcon(category) {
    const color = CATEGORY_COLORS[category] || '#00f2ff';
    const html = `
      <div class="custom-pin" style="color:${color}">
        <div class="pin-ring" style="border-color:${color};color:${color}"></div>
        <div class="pin-ring pin-ring-2" style="border-color:${color};color:${color}"></div>
        <div class="pin-dot" style="background:${color}"></div>
      </div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize:  [30, 30],
      iconAnchor:[15, 15],
    });
  }

  function buildPopup(entry) {
    const color    = CATEGORY_COLORS[entry.category] || '#00f2ff';
    const yearHtml = entry.year
      ? `<span class="popup-year">⏳ ${entry.year}</span>`
      : '';
    const anonHtml = entry.anon
      ? `<span>👻 Anonymous</span>`
      : `<span>🌍 Dreamer</span>`;

    return `
      <div class="popup-inner">
        <div class="popup-category" style="color:${color}">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
            background:${color};margin-right:5px;vertical-align:middle;
            box-shadow:0 0 6px ${color}"></span>
          ${entry.category}
        </div>
        <div class="popup-dream">${escapeHtml(entry.dream)}</div>
        <div class="popup-meta">
          ${anonHtml}
          ${yearHtml}
        </div>
      </div>`;
  }

  function addPin(entry) {
    const map    = MapManager.getMap();
    const icon   = createIcon(entry.category);
    const marker = L.marker([entry.lat, entry.lng], { icon })
      .addTo(map)
      .bindPopup(buildPopup(entry), {
        maxWidth: 280,
        closeButton: true,
      });

    markerMap[entry.id] = marker;
    return marker;
  }

  function getAllMarkers() { return Object.values(markerMap); }
  function getEntries()   { return DreamStore.getAll(); }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { addPin, getAllMarkers, getEntries };
})();


/* ═══════════════════════════════════════════════════════════════
   CELESTIAL BRIDGE  — draws glowing SVG lines between random pins
═══════════════════════════════════════════════════════════════ */
const CelestialBridge = (() => {
  let activeLines = [];

  function draw() {
    const dreams  = DreamStore.getAll();
    if (dreams.length < 2) return;

    clearLines();

    // Pick two distinct random entries
    const a = dreams[Math.floor(Math.random() * dreams.length)];
    let b;
    do { b = dreams[Math.floor(Math.random() * dreams.length)]; } while (b.id === a.id);

    const map    = MapManager.getMap();
    const color  = '#00f2ff';
    const points = [L.latLng(a.lat, a.lng), L.latLng(b.lat, b.lng)];

    // Glow outer line
    const outer = L.polyline(points, {
      color,
      weight:  2,
      opacity: 0.25,
      dashArray: '8 6',
      className: 'celestial-outer',
    }).addTo(map);

    // Bright inner line
    const inner = L.polyline(points, {
      color,
      weight:  1,
      opacity: 0.7,
      className: 'celestial-inner',
    }).addTo(map);

    activeLines = [outer, inner];

    // Fade out after 8s
    setTimeout(() => {
      clearLines();
    }, 8000);
  }

  function clearLines() {
    const map = MapManager.getMap();
    activeLines.forEach(l => { try { map.removeLayer(l); } catch(e){} });
    activeLines = [];
  }

  function start() {
    setTimeout(() => {
      draw();
      setInterval(draw, CONFIG.celestialEvery);
    }, 5000);
  }

  return { start };
})();


/* ═══════════════════════════════════════════════════════════════
   PULSE ENGINE  — live 'Souls Dreaming Now' counter
═══════════════════════════════════════════════════════════════ */
const PulseEngine = (() => {
  let current = CONFIG.pulseMin + Math.floor(Math.random() * (CONFIG.pulseMax - CONFIG.pulseMin));
  const el     = document.getElementById('soulCount');

  function update() {
    const delta = CONFIG.pulseFluctMin
      + Math.floor(Math.random() * (CONFIG.pulseFluctMax - CONFIG.pulseFluctMin));
    current = Math.max(CONFIG.pulseMin, Math.min(CONFIG.pulseMax, current + delta));
    el.textContent = current.toLocaleString();
  }

  function start() {
    update();
    setInterval(update, CONFIG.pulseTick);
  }

  return { start };
})();


/* ═══════════════════════════════════════════════════════════════
   UI MANAGER  — sidebar feed + pin form
═══════════════════════════════════════════════════════════════ */
const UIManager = (() => {
  const feedList  = document.getElementById('feedList');
  const totalPins = document.getElementById('totalPins');

  function renderFeedItem(entry) {
    const color  = CATEGORY_COLORS[entry.category] || '#00f2ff';
    const yearEl = entry.year ? `<span class="feed-year">⏳ ${entry.year}</span>` : '';
    const anonEl = entry.anon ? `<span>👻 Anon</span>` : `<span>🌍 Dreamer</span>`;

    const item = document.createElement('div');
    item.className = 'feed-item';
    item.dataset.id = entry.id;
    item.innerHTML = `
      <div>
        <span class="feed-category-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>
        <span class="feed-cat-label" style="color:${color}">${entry.category}</span>
      </div>
      <div class="feed-dream">${escapeHtml(entry.dream)}</div>
      <div class="feed-meta">
        ${anonEl}
        ${yearEl}
      </div>`;

    feedList.prepend(item);
    updateCount();
  }

  function updateCount() {
    const n = DreamStore.getAll().length;
    totalPins.textContent = `${n} dream${n !== 1 ? 's' : ''}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Character counter for textarea
  const dreamText  = document.getElementById('dreamText');
  const charUsed   = document.getElementById('charUsed');
  dreamText.addEventListener('input', () => {
    charUsed.textContent = dreamText.value.length;
  });

  // Sidebar toggle (mobile)
  const sidebar       = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  return { renderFeedItem, updateCount };
})();


/* ═══════════════════════════════════════════════════════════════
   MODAL MANAGER
═══════════════════════════════════════════════════════════════ */
const ModalManager = (() => {
  const overlay   = document.getElementById('modalOverlay');
  const closeBtn  = document.getElementById('modalClose');
  const launchBtn = document.getElementById('launchDreamBtn');
  const chips     = document.querySelectorAll('#interestChips .chip');

  let pendingData = null;   // dream data waiting for modal completion

  // Interest chip toggle
  chips.forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  function open(data) {
    pendingData = data;
    overlay.classList.add('active');
    document.getElementById('userAge').value = '';
    chips.forEach(c => c.classList.remove('active'));
  }

  function close() {
    overlay.classList.remove('active');
    pendingData = null;
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  launchBtn.addEventListener('click', () => {
    if (!pendingData) return;

    const age = parseInt(document.getElementById('userAge').value) || null;
    const interests = [...chips]
      .filter(c => c.classList.contains('active'))
      .map(c => c.dataset.val);

    // 🔥 Firebase: optionally attach age/interests to dream entry
    const enriched = { ...pendingData, age, interests };

    // Add to store and render
    const entry = DreamStore.add(enriched);
    PinEngine.addPin(entry);
    UIManager.renderFeedItem(entry);

    // Fly to pin
    MapManager.getMap().flyTo([entry.lat, entry.lng], 5, { animate: true, duration: 1.4 });

    showToast('🌍 Your dream is pinned to the world!');
    close();
  });

  return { open, close };
})();


/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
function showToast(msg, duration = 3500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}


/* ═══════════════════════════════════════════════════════════════
   PIN IT BUTTON — collect dream + open modal
═══════════════════════════════════════════════════════════════ */
document.getElementById('pinItBtn').addEventListener('click', () => {
  const dreamText  = document.getElementById('dreamText').value.trim();
  const category   = document.getElementById('categorySelect').value;
  const year       = parseInt(document.getElementById('goalYear').value) || null;
  const anon       = document.getElementById('anonymousToggle').checked;

  if (!dreamText) {
    showToast('✏️ Please write your dream first!');
    document.getElementById('dreamText').focus();
    return;
  }

  // Get a random geo position on land (demo fallback)
  const { lat, lng } = getRandomCoords();

  ModalManager.open({ dream: dreamText, category, year, anon, lat, lng });
});


/* ═══════════════════════════════════════════════════════════════
   RANDOM COORDINATES  (demo — replace with geolocation or user pick)
═══════════════════════════════════════════════════════════════ */
function getRandomCoords() {
  const LAND_COORDS = [
    { lat:  48.86, lng:   2.35 },  // Paris
    { lat:  51.51, lng:  -0.13 },  // London
    { lat:  40.71, lng: -74.00 },  // New York
    { lat:  35.69, lng: 139.69 },  // Tokyo
    { lat: -33.87, lng: 151.21 },  // Sydney
    { lat:  28.61, lng:  77.20 },  // Delhi
    { lat: -23.55, lng: -46.63 },  // São Paulo
    { lat:  55.75, lng:  37.62 },  // Moscow
    { lat:  30.04, lng:  31.24 },  // Cairo
    { lat:  -1.29, lng:  36.82 },  // Nairobi
    { lat:  19.43, lng: -99.13 },  // Mexico City
    { lat:  37.77, lng:-122.43 },  // San Francisco
    { lat:  1.35,  lng: 103.82 },  // Singapore
    { lat: 52.37,  lng:   4.90 },  // Amsterdam
    { lat: 41.01,  lng:  28.97 },  // Istanbul
    { lat: 64.13,  lng: -21.93 },  // Reykjavik
    { lat: -13.16, lng: -72.54 },  // Machu Picchu
    { lat:  25.20, lng:  55.27 },  // Dubai
    { lat: -26.20, lng:  28.04 },  // Johannesburg
    { lat:  43.70, lng: -79.42 },  // Toronto
  ];
  // Add slight jitter so pins don't stack exactly
  const base = LAND_COORDS[Math.floor(Math.random() * LAND_COORDS.length)];
  return {
    lat: base.lat + (Math.random() - 0.5) * 3,
    lng: base.lng + (Math.random() - 0.5) * 3,
  };
}


/* ═══════════════════════════════════════════════════════════════
   SEED DEMO PINS
═══════════════════════════════════════════════════════════════ */
function seedDemoPins() {
  DEMO_DREAMS.forEach((d, i) => {
    setTimeout(() => {
      const entry = DreamStore.add(d);
      PinEngine.addPin(entry);
      UIManager.renderFeedItem(entry);
    }, i * 80);  // staggered for visual effect
  });
}


/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  MapManager.init();
  PulseEngine.start();
  CelestialBridge.start();
  seedDemoPins();

  // 🔥 Firebase: Replace seedDemoPins() with:
  //   db.collection('dreams').orderBy('ts','desc').limit(50)
  //     .onSnapshot(snapshot => {
  //       snapshot.docChanges().forEach(change => {
  //         if (change.type === 'added') {
  //           const entry = { id: change.doc.id, ...change.doc.data() };
  //           PinEngine.addPin(entry);
  //           UIManager.renderFeedItem(entry);
  //         }
  //       });
  //     });
});
