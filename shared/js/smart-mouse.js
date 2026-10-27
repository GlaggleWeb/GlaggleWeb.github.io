/* ===== GLAGGLE SMART MOUSE SYSTEM ===== */
let smartMouseActive = false; 
const smartCursor = document.getElementById('glaggle-smart-cursor');

/* ===== FIX: Cursor immer frisch suchen ===== */
function getSmartCursor() {
    return document.getElementById('glaggle-smart-cursor');
}

// Überschreibe enableSmartMouse mit sicherer Version
function enableSmartMouse() {
    const cursor = getSmartCursor();
    if (!cursor) return; // Element existiert noch nicht -> abbrechen

    smartMouseActive = true;
    document.body.classList.add('smart-mouse-active');
    cursor.style.display = 'block';
    cursor.style.opacity = '1';                 // WICHTIG: Sichtbar erzwingen
    cursor.classList.remove('cursor-hover', 'cursor-click'); // Klebrige Klassen lösen

    smartCursorStyleAccent();
    localStorage.setItem('glaggle-smart-mouse', 'true');
    updateSmartMouseToggleUI();
}

function smartCursorStyleAccent() {
    const name = localStorage.getItem('glaggle-theme-name') || 'hell';
    const t = (typeof THEMES !== 'undefined' && THEMES[name]) || null;
    const c = getSmartCursor();
    if (c && t && t.accent) c.style.background = t.accent;
}

function disableSmartMouse() {
    const cursor = getSmartCursor();
    smartMouseActive = false;
    document.body.classList.remove('smart-mouse-active');
    if (cursor) cursor.style.display = 'none';
    document.querySelectorAll('.smart-hover').forEach(el => el.classList.remove('smart-hover'));
    localStorage.setItem('glaggle-smart-mouse', 'false');
    updateSmartMouseToggleUI();
}

/* ===== FIX: Reset bei bfcache / Seitenwechsel ===== */
window.addEventListener('pageshow', function (event) {
    // pageshow feuert auch, wenn die Seite aus dem Cache geholt wird (persisted=true)
    if (!smartMouseActive) return;
    const cursor = getSmartCursor();
    if (!cursor) return;

    cursor.style.display = 'block';
    cursor.style.opacity = '1';
    cursor.classList.remove('cursor-hover', 'cursor-click');
    document.querySelectorAll('.smart-hover').forEach(el => el.classList.remove('smart-hover'));
});

// Zusätzlich: Wenn der Tab wieder sichtbar wird (z.B. nach Tab-Wechsel)
document.addEventListener('visibilitychange', function () {
    if (!smartMouseActive || document.hidden) return;
    const cursor = getSmartCursor();
    if (cursor) {
        cursor.style.opacity = '1';
        cursor.classList.remove('cursor-hover', 'cursor-click');
    }
});

function updateSmartMouseToggleUI() {
    const toggleBtn = document.getElementById('smart-mouse-toggle');
    if (!toggleBtn) return;
    if (smartMouseActive) {
        toggleBtn.style.background = '#70C4F7';
        toggleBtn.style.color = '#fff';
        toggleBtn.textContent = '✓ Glaggle Smart Mouse aktiv';
    } else {
        toggleBtn.style.background = 'none';
        toggleBtn.style.color = 'inherit';
        toggleBtn.textContent = 'Glaggle Smart Mouse aktivieren';
    }
}

// Maus bewegen: Cursor folgt
document.addEventListener('mousemove', (e) => {
    if (!smartMouseActive) return;
    const c = getSmartCursor();
    if (!c) return;
    c.style.left = e.clientX + 'px';
    c.style.top = e.clientY + 'px';
});

// Maus verlässt Fenster: Cursor verstecken
document.addEventListener('mouseleave', () => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    smartCursor.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    smartCursor.style.opacity = '1';
});

// Klick-Animation
document.addEventListener('mousedown', () => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    smartCursor.classList.add('cursor-click');
});
document.addEventListener('mouseup', () => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    smartCursor.classList.remove('cursor-click');
});

// Hover-Logik: welche Elemente reagieren
const SMART_HOVER_SELECTORS = [
    'a', 'button', 'input[type="submit"]',
    '.web-button', '.nav-button', '.sidebar-link',
    '.glaggle-entry', '.t-btn', '.hamburger',
    '#backToTop', '.search-bar-container',
    '.quick-btn', '.welcome-btn', '.push-close-btn',
    '[onclick]', 'summary', '.close-btn',
    '.search-icon-btn', '.ai-magic-btn'
].join(', ');

// Hover-Logik: Cursor verschwindet komplett über klickbaren Elementen
document.addEventListener('mouseover', (e) => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    const target = e.target.closest(SMART_HOVER_SELECTORS);
    if (target) {
        target.classList.add('smart-hover');

        // NEU: nur eckige bzw. randlose Elemente bekommen den Modern-Look
        const cs = getComputedStyle(target);
        if (parseFloat(cs.borderTopLeftRadius) === 0) target.classList.add('smart-round');
        if (parseFloat(cs.paddingLeft) < 4)          target.classList.add('smart-pad');

        smartCursor.classList.add('cursor-hover');
        smartCursor.style.opacity = '0';
    }
});

document.addEventListener('mouseout', (e) => {
    const smartCursor = getSmartCursor();
if (!smartCursor) return;
    if (!smartMouseActive) return;
    const target = e.target.closest(SMART_HOVER_SELECTORS);
    if (target) {
        target.classList.remove('smart-hover', 'smart-round', 'smart-pad');   // NEU: alle drei
        smartCursor.classList.remove('cursor-hover');
        smartCursor.style.opacity = '1';
    }
});

// Beim Seitenstart: gespeicherten Zustand wiederherstellen
(function restoreSmartMouse() {
    if (localStorage.getItem('glaggle-smart-mouse') === 'true') {
        enableSmartMouse();
    }
})();

function toggleSmartMouse() {
    if (smartMouseActive) {
        disableSmartMouse();
    } else {
        enableSmartMouse();
    }
}
/* ===== ENDE GLAGGLE SMART MOUSE SYSTEM ===== */
