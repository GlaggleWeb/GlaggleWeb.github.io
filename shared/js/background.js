
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

const stripExt = u => u.replace(/\.(jpe?g|png|webp)$/i, '');
const cld = (u, t) => stripExt(u).replace('/image/upload/', `/image/upload/${t}/`);
const thumbUrl = u => cld(u, 'w_400,q_auto,f_auto');
const bgUrl    = u => cld(u, 'w_1920,q_auto,f_auto');

let bgInterval = null;
let currentIndex = Math.floor(Math.random() * spotlightImages.length);
function buildSpotlightGrid() {
    const grid = document.getElementById('spotlight-grid');
    if (!grid || grid.children.length > 0) return;

    const savedIndex = localStorage.getItem('glaggle-bg-mode') === 'fixed'
        ? parseInt(localStorage.getItem('glaggle-bg-fixed'))
        : -1;

    spotlightImages.forEach((url, i) => {
        const btn = document.createElement('button');
        btn.dataset.index = i;
        btn.title = `Bild ${i + 1}`;
        btn.style.cssText = `
            width: 100%;
            aspect-ratio: 16/9;
            border-radius: 8px;
            border: 2px solid ${i === savedIndex ? '#70C4F7' : 'transparent'};
            background: rgba(128,128,128,0.2);
            cursor: pointer;
            transition: border-color 0.2s, transform 0.2s;
            padding: 0;
            overflow: hidden;
        `;

        const img = document.createElement('img');
        img.src = thumbUrl(url);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        btn.appendChild(img);

        btn.onclick = () => setBgMode('fixed', i);
        btn.onmouseover = () => { btn.style.transform = 'scale(1.05)'; };
        btn.onmouseout  = () => { btn.style.transform = 'scale(1)'; };

        grid.appendChild(btn);
    });
}


function refreshThemeOverlay() {
    const n = localStorage.getItem('glaggle-theme-name') || 'hell';
    if (THEMES[n]) applyThemeData(THEMES[n]);
}

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
    localStorage.setItem('glaggle-bg-mode', 'auto');
    localStorage.removeItem('glaggle-bg-fixed');
    startBgRotation();
    refreshThemeOverlay();
    return;
}


    // =========================
    // THEME-FARBE
    // =========================
if (mode === 'theme') {
    document.getElementById('bg-btn-theme')?.classList.add('active');
    stopBgRotation();
    localStorage.setItem('glaggle-bg-mode', 'theme');
    localStorage.removeItem('glaggle-bg-fixed');
    refreshThemeOverlay();
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
refreshThemeOverlay();   // NEU
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

       localStorage.setItem('glaggle-bg-mode', 'fixed');
localStorage.setItem('glaggle-bg-fixed', fixedIndex);
refreshThemeOverlay();   // NEU
return;
    
    }
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
    if (!bgLayer) return;
    bgLayer.style.backgroundImage = `url('${bgUrl(spotlightImages[currentIndex])}')`;
    bgLayer.style.opacity = '1';

    bgInterval = setInterval(() => {
        const next = (currentIndex + 1) % spotlightImages.length;
        const img = new Image();
        img.onload = () => {
            bgLayer.style.opacity = '0';
            setTimeout(() => {
                currentIndex = next;
                bgLayer.style.backgroundImage = `url('${bgUrl(spotlightImages[next])}')`;
                bgLayer.style.opacity = '1';
            }, 1000);
        };
        img.src = bgUrl(spotlightImages[next]);
    }, 15000);
}

function stopBgRotation() {
    if (bgInterval) {
        clearInterval(bgInterval);
        bgInterval = null;
    }
}

(function restoreBackgroundSettings() {
    const mode = localStorage.getItem('glaggle-bg-mode') || 'theme';
    if (mode === 'fixed') {
        const idx = parseInt(localStorage.getItem('glaggle-bg-fixed') || '0');
        if (idx >= 0 && idx < spotlightImages.length) return setBgMode('fixed', idx);
        return setBgMode('theme');
    }
    setBgMode(mode);
})();
