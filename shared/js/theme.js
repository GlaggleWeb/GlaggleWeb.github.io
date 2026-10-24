/* ===== GLAGGLE UNIFIED THEME SYSTEM ===== */
const THEMES = {
  hell:     {navbar:'#ffffff',navText:'#000000',search:'rgba(255,255,255,0.9)',searchBorder:'#ffffff',overlay:'rgba(0,0,0,0.4)',isDark:false,accent:'#70C4F7',sidebar:'#ffffff',sidebarText:'#000000', searchText:'#000000', pageBg:'#f4f4f4'},
  dunkel:   {navbar:'#1a1a1a',navText:'#ffffff',search:'rgba(40,40,40,0.9)',searchBorder:'#555',overlay:'rgba(0,0,0,0.65)',isDark:true,accent:'#70C4F7',sidebar:'#1a1a1a',sidebarText:'#ffffff', searchText:'#ffffff', pageBg:'#121212'},
  hellblau: {navbar:'#cfe8fb',navText:'#0b3a5c',search:'rgba(255,255,255,0.95)',searchBorder:'#70C4F7',overlay:'rgba(200,230,255,0.25)',isDark:false,accent:'#70C4F7',sidebar:'#e3f2fd',sidebarText:'#0b3a5c', searchText:'#0b3a5c', pageBg:'#eaf6ff'},
  blau:     {navbar:'#1a3a5c',navText:'#ffffff',search:'rgba(200,230,255,0.92)',searchBorder:'#2980b9',overlay:'rgba(0,30,70,0.5)',isDark:true,accent:'#2980b9',sidebar:'#1a3a5c',sidebarText:'#ffffff', searchText:'#0b2a45', pageBg:'#0f2338'},
  grün:     {navbar:'#1a3a2a',navText:'#ffffff',search:'rgba(200,255,220,0.92)',searchBorder:'#27ae60',overlay:'rgba(0,50,20,0.5)',isDark:true,accent:'#27ae60',sidebar:'#1a3a2a',sidebarText:'#ffffff', searchText:'#0b3a1e', pageBg:'#0f2a1d'},
  rot:      {navbar:'#3a1a1a',navText:'#ffffff',search:'rgba(255,210,210,0.92)',searchBorder:'#e74c3c',overlay:'rgba(60,0,0,0.5)',isDark:true,accent:'#e74c3c',sidebar:'#3a1a1a',sidebarText:'#ffffff', searchText:'#4a0f0f', pageBg:'#2a1010'},
  gelb:     {navbar:'#3a3000',navText:'#ffffff',search:'rgba(255,248,200,0.95)',searchBorder:'#f1c40f',overlay:'rgba(40,30,0,0.45)',isDark:true,accent:'#f1c40f',sidebar:'#3a3000',sidebarText:'#ffffff', searchText:'#3a3000', pageBg:'#2a2400'},
  violett:  {navbar:'#2a1040',navText:'#ffffff',search:'rgba(230,210,255,0.92)',searchBorder:'#8e44ad',overlay:'rgba(30,0,60,0.5)',isDark:true,accent:'#8e44ad',sidebar:'#2a1040',sidebarText:'#ffffff', searchText:'#2a1040', pageBg:'#1e0b30'}
};

function applyThemeData(t) {
  // Navbar
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.style.setProperty('background-color', t.navbar, 'important');
    navbar.style.setProperty('box-shadow', '0 2px 10px rgba(0,0,0,0.15)', 'important');
  }
  // Hamburger Linien
  document.querySelectorAll('.hamburger span').forEach(s => s.style.setProperty('background-color', t.navText, 'important'));
  // Sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.style.setProperty('background-color', t.sidebar, 'important');
    sidebar.style.setProperty('color', t.sidebarText, 'important');
  }
  document.querySelectorAll('.sidebar-link, .close-btn, .sidebar-category summary').forEach(el => {
    el.style.setProperty('color', t.sidebarText, 'important');
  });
  // Suchfeld
  const dynSb = document.getElementById('dyn-searchbar') || (() => {
    const s = document.createElement('style'); s.id = 'dyn-searchbar';
    document.head.appendChild(s); return s;
  })();
  dynSb.textContent = `
  .search-bar-container{background:${t.search}!important;border-color:${t.searchBorder}!important;}
  #glaggleQuery{color:${t.searchText || '#000'}!important;caret-color:${t.searchText || '#000'}!important;}
  #glaggleQuery::placeholder{color:${t.searchText || '#000'}!important;opacity:.6;}
`;
  // Seitenhintergrund
const dynPg = document.getElementById('dyn-pagebg') || (() => {
  const s = document.createElement('style'); s.id = 'dyn-pagebg';
  document.head.appendChild(s); return s;
})();
dynPg.textContent = `body{background-color:${t.pageBg || '#ffffff'}!important;}`;
  // Overlay
const bgMode = localStorage.getItem('glaggle-bg-mode') || 'auto';
const overlayColor = (bgMode === 'none' || bgMode === 'theme') ? 'rgba(0,0,0,0)' : t.overlay;
dynOv.textContent = `body::before{background:${overlayColor}!important;}`;
  // Preview Bar
  const bar = document.getElementById('design-preview-bar');
  if (bar) bar.style.background = `linear-gradient(90deg,${t.navbar} 33%,${t.accent} 33% 66%,${t.sidebar} 66%)`;
  // Speichern
  localStorage.setItem('glaggle-theme', JSON.stringify(t));

  // 🎨 Wenn Theme-Hintergrund aktiv ist, Farbe sofort anpassen
if (localStorage.getItem('glaggle-bg-mode') === 'theme') {
    applyThemeBackground(t.accent);
}
}

function applyTheme(name, btn) {
  const t = THEMES[name];
  if (!t) return;
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyThemeData(t);
  localStorage.setItem('glaggle-theme-name', name);
}


/* ===== RESET ===== */
function resetDesignFull() {
  ['glaggle-theme','glaggle-theme-name','glaggle-bg-mode','glaggle-bg-fixed'].forEach(k => localStorage.removeItem(k));
  ['dyn-overlay','dyn-searchbar','dyn-pagebg'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  applyTheme('hell', document.querySelector('[data-t="hell"]'));
  if (glaggleAudio) { glaggleAudio.pause(); glaggleAudio = null; }
  document.getElementById('music-select').value = '';
  document.getElementById('music-controls').style.display = 'none';
  setBgMode('auto');  // Setzt auch die Button-Optik korrekt zurück
}
function restoreTheme() {
      let savedName = localStorage.getItem('glaggle-theme-name');
  let savedData = localStorage.getItem('glaggle-theme');
  if (savedName === 'custom') {
      savedName = 'hell';
      savedData = null;
      localStorage.setItem('glaggle-theme-name', 'hell');
      localStorage.removeItem('glaggle-theme');
  }
    if (savedData) {
        try {
            applyThemeData(JSON.parse(savedData));
        } catch(e) {}
    } else if (savedName && THEMES[savedName]) {
        applyThemeData(THEMES[savedName]);
    }

    if (savedName) {
        document.querySelectorAll('#theme-grid .t-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`#theme-grid [data-t="${savedName}"]`);
        if (btn) btn.classList.add('active');
    }
}

// Auf DOMContentLoaded warten, damit Navbar sicher existiert
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreTheme);
} else {
    restoreTheme(); // DOM bereits fertig
}

// Erweitert um das Umschalten der Kontrast-Klasse
function setOverlay(color, isDark = false) {
    const style = document.getElementById('dynamic-overlay') || (() => {
        const s = document.createElement('style');
        s.id = 'dynamic-overlay';
        document.head.appendChild(s);
        return s;
    })();
    style.textContent = `body::before { background: ${color} !important; }`;
    localStorage.setItem('glaggle-overlay', JSON.stringify({color, isDark}));
    
    // Klasse hinzufügen/entfernen um Text/Icons hell zu machen
    if(isDark) {
        document.body.classList.add('dark-theme-active');
    } else {
        document.body.classList.remove('dark-theme-active');
    }
}

function setNavbar(bg, textColor, isDark = false) {
    const navbar = document.querySelector('.navbar');
    if(navbar) navbar.style.setProperty('background-color', bg, 'important');
    
    document.querySelectorAll('.hamburger span').forEach(s => s.style.backgroundColor = textColor);
    localStorage.setItem('glaggle-navbar', JSON.stringify({bg, textColor, isDark}));
    
    if(isDark) {
        document.body.classList.add('dark-theme-active');
    } else if(!localStorage.getItem('glaggle-overlay')?.includes('"isDark":true')) {
        document.body.classList.remove('dark-theme-active');
    }
}

function setSearchbar(bg, borderColor) {
    const style = document.getElementById('dynamic-searchbar') || (() => {
        const s = document.createElement('style');
        s.id = 'dynamic-searchbar';
        document.head.appendChild(s);
        return s;
    })();
    style.textContent = `.search-bar-container { background: ${bg} !important; border-color: ${borderColor} !important; }`;
    localStorage.setItem('glaggle-searchbar', JSON.stringify({bg, borderColor}));
}

function resetDesign() {
    ['glaggle-overlay','glaggle-navbar','glaggle-searchbar','glaggle-bg-mode','glaggle-bg-fixed'].forEach(k => localStorage.removeItem(k));
    ['dynamic-overlay','dynamic-searchbar'].forEach(id => document.getElementById(id)?.remove());
    document.body.classList.remove('dark-theme-active');
    setNavbar('#ffffff', '#000000', false);
    
    document.querySelectorAll('#spotlight-grid button').forEach(b => b.style.borderColor = 'transparent');
    document.getElementById('spotlight-grid').style.opacity = '0.5';
    document.getElementById('spotlight-grid').style.pointerEvents = 'none';
    document.getElementById('bg-btn-auto').style.border = '2px solid #70C4F7';
    document.getElementById('custom-upload-zone').style.display = 'none';
    startBgRotation();
}
