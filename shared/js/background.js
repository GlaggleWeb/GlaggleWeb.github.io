
const spotlightImages = [
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_nbuiju",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_cljpxj",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_dgzyiw.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_w4sqni.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_qljo0d.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_jcetoc.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_ahnzth.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_h4yutr.png",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_rlyfgz.png",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_wvjbqf.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_ethrh9.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_mzwf9r.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_jzcflm.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_vehyus.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_yojntw.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_gqsslr.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_kfrajj.jpg",
    "https://res.cloudinary.com/dcvdvvbnj/image/upload/image_akjjqf.jpg"
];

let bgInterval = null;
let currentIndex = Math.floor(Math.random() * spotlightImages.length);

function buildSpotlightGrid() {
    const grid = document.getElementById('spotlight-grid');

    if (!grid || grid.children.length > 0) return;

    spotlightImages.forEach((url, i) => {

        const btn = document.createElement('button');

        btn.style.cssText = `
            width: 100%;
            aspect-ratio: 16/9;
            border-radius: 8px;
            border: 2px solid transparent;
            background-image: url('${url}');
            background-size: cover;
            background-position: center;
            cursor: pointer;
            transition: border-color 0.2s, transform 0.2s;
            padding: 0;
            overflow: hidden;
        `;

        btn.title = `Bild ${i + 1}`;
        btn.dataset.index = i;

        btn.onclick = () => {
            setBgMode('fixed', i);
        };

        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.05)';
        };

        btn.onmouseout = () => {
            btn.style.transform = 'scale(1)';
        };

        grid.appendChild(btn);
    });

    // Bereits gespeichertes Bild markieren
    const savedMode = localStorage.getItem('glaggle-bg-mode');
    const savedIndex = parseInt(
        localStorage.getItem('glaggle-bg-fixed')
    );

    if (savedMode === 'fixed' && !isNaN(savedIndex)) {
        const activeBtn = grid.querySelector(
            `button[data-index="${savedIndex}"]`
        );

        if (activeBtn) {
            activeBtn.style.borderColor = '#70C4F7';
        }
    }
}


const origToggleMenu = window.toggleMenu;
window.toggleMenu = function() {
    if(typeof origToggleMenu === "function") origToggleMenu();
    setTimeout(buildSpotlightGrid, 100);
};

function setBgMode(mode, fixedIndex = null) {

    // Alle Modus-Buttons zurücksetzen
    ['auto', 'theme', 'none', 'fixed'].forEach(id => {
        const btn = document.getElementById('bg-btn-' + id);
        if (btn) btn.classList.remove('active');
    });

    const grid = document.getElementById('spotlight-grid');

    // Standard: Bilder deaktivieren
    if (grid) {
        grid.style.opacity = '0.5';
        grid.style.pointerEvents = 'none';
    }

    // Bildauswahl zurücksetzen
    document.querySelectorAll('#spotlight-grid button').forEach(b => {
        b.style.borderColor = 'transparent';
    });


    // =========================
    // AUTOMATISCH
    // =========================
    if (mode === 'auto') {

        document.getElementById('bg-btn-auto')?.classList.add('active');

        localStorage.removeItem('glaggle-bg-mode');
        localStorage.removeItem('glaggle-bg-fixed');

        startBgRotation();
        return;
    }


    // =========================
    // THEME-FARBE
    // =========================
    if (mode === 'theme') {

        document.getElementById('bg-btn-theme')?.classList.add('active');

        stopBgRotation();

        const savedTheme = localStorage.getItem('glaggle-theme');

        let accent = '#70C4F7';

        if (savedTheme) {
            try {
                accent = JSON.parse(savedTheme).accent || accent;
            } catch(e) {}
        }

        applyThemeBackground(accent);

        localStorage.setItem('glaggle-bg-mode', 'theme');
        localStorage.removeItem('glaggle-bg-fixed');

        return;
    }


    // =========================
    // KEIN BILD
    // =========================
    if (mode === 'none') {

        document.getElementById('bg-btn-none')?.classList.add('active');

        stopBgRotation();

        const bgLayer = document.getElementById('background-layer');

        if (bgLayer) {
            bgLayer.style.opacity = '0';

            setTimeout(() => {
                bgLayer.style.backgroundImage = 'none';
                bgLayer.style.opacity = '1';
            }, 500);
        }

        localStorage.setItem('glaggle-bg-mode', 'none');
        localStorage.removeItem('glaggle-bg-fixed');

        return;
    }


    // =========================
    // BILDAUSWAHL ÖFFNEN
    // =========================
    if (mode === 'fixed-select') {

        document.getElementById('bg-btn-fixed')?.classList.add('active');

        // Bilder anklickbar machen
        if (grid) {
            grid.style.opacity = '1';
            grid.style.pointerEvents = 'auto';
        }

        // Grid erst aufbauen
        buildSpotlightGrid();

        return;
    }


    // =========================
    // FESTES BILD
    // =========================
    if (mode === 'fixed' && fixedIndex !== null) {

        document.getElementById('bg-btn-fixed')?.classList.add('active');

        if (grid) {
            grid.style.opacity = '1';
            grid.style.pointerEvents = 'auto';
        }

        const activeBtn = document.querySelector(
            `#spotlight-grid button[data-index="${fixedIndex}"]`
        );

        if (activeBtn) {
            activeBtn.style.borderColor = '#70C4F7';
        }

        stopBgRotation();

        setBackgroundImage(spotlightImages[fixedIndex]);

        localStorage.setItem('glaggle-bg-mode', 'fixed');
        localStorage.setItem('glaggle-bg-fixed', fixedIndex);

        return;
    }
}


// Erzeugt einen schönen Farbverlauf aus der Theme-Akzentfarbe
function applyThemeBackground(accent) {
    const bgLayer = document.getElementById('background-layer');
    if (!bgLayer) return;
    bgLayer.style.opacity = '0';
    setTimeout(() => {
        const darker = shadeColor(accent, -40);
        bgLayer.style.backgroundImage = `linear-gradient(135deg, ${accent}, ${darker})`;
        bgLayer.style.opacity = '1';
    }, 500);
}

// Hilfsfunktion: Farbe abdunkeln/aufhellen
function shadeColor(hex, percent) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    let R = parseInt(hex.substring(1,3),16);
    let G = parseInt(hex.substring(3,5),16);
    let B = parseInt(hex.substring(5,7),16);
    R = Math.max(0, Math.min(255, Math.round(R * (100 + percent) / 100)));
    G = Math.max(0, Math.min(255, Math.round(G * (100 + percent) / 100)));
    B = Math.max(0, Math.min(255, Math.round(B * (100 + percent) / 100)));
    return "#" + R.toString(16).padStart(2,'0')
               + G.toString(16).padStart(2,'0')
               + B.toString(16).padStart(2,'0');
}

function loadCustomBg(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        stopBgRotation();
        setBackgroundImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

function setBackgroundImage(url) {
    const bgLayer = document.getElementById('background-layer');
    if(!bgLayer) return;
    bgLayer.style.opacity = '0';
    setTimeout(() => {
        bgLayer.style.backgroundImage = `url('${url}')`;
        bgLayer.style.opacity = '1';
    }, 500);
}

function startBgRotation() {
    stopBgRotation();
    const bgLayer = document.getElementById('background-layer');
    if(!bgLayer) return;
    bgLayer.style.backgroundImage = `url('${spotlightImages[currentIndex]}')`;
    bgLayer.style.opacity = '1';
    bgInterval = setInterval(() => {
        bgLayer.style.opacity = '0';
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % spotlightImages.length;
            bgLayer.style.backgroundImage = `url('${spotlightImages[currentIndex]}')`;
            bgLayer.style.opacity = '1';
        }, 1000);
    }, 15000);
}

function stopBgRotation() {
    if (bgInterval) {
        clearInterval(bgInterval);
        bgInterval = null;
    }
}

  (function restoreBackgroundSettings() {
      const mode = localStorage.getItem('glaggle-bg-mode');
      if (!mode || mode === 'auto') return setBgMode('auto');
      if (mode === 'theme' || mode === 'none') return setBgMode(mode);
      if (mode === 'fixed') {
          const idx = parseInt(localStorage.getItem('glaggle-bg-fixed') || '0');
          if (idx >= 0 && idx < spotlightImages.length) {
              buildSpotlightGrid();
              return setBgMode('fixed', idx);
          }
          setBgMode('auto');
      }
  })();
