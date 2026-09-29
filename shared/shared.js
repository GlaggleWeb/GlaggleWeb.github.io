/* =========================================================
   GLAGGLE SHARED LOADER
   ---------------------------------------------------------
   Einbinden (auf jeder Seite, am Ende von <body>):

   <script src="/shared/shared.js"
           data-features="navbar,design,voice"></script>

   Verfügbare Features:
     navbar       Navbar + Sidebar + Login-Bereich
     design       Theme, Musik, Hintergrund (hängt sich in die Sidebar)
     smart-mouse  Smart Cursor
     voice        Glaggle Assistant

   Pro Feature passiert in dieser Reihenfolge:
     Abhängigkeiten -> HTML einfügen (components/*.html) + CSS -> JS

   Abhängigkeiten werden automatisch aufgelöst.
   ========================================================= */
(function () {
    'use strict';

    if (window.Glaggle && window.Glaggle.ready) return; // nie doppelt laden

    // ---- Konfiguration -------------------------------------------------
    const script  = document.currentScript;
    const BASE    = script.src.replace(/[^/]*$/, '');          // Ordner von shared.js
    const VERSION = script.dataset.version || '1';             // bei Änderungen hochzählen (Cache-Busting)
    const wanted  = (script.dataset.features || 'navbar')
                      .split(',').map(s => s.trim()).filter(Boolean);

    // Jedes Feature:
    //   deps: welche Features vorher geladen werden müssen
    //   html: [Datei, Ziel-Selektor, Position] -> wird per fetch geholt und eingefügt (VOR dem JS)
    //   css / js: Dateien (relativ zu shared.js, oder absolut mit / bzw. https://)
    // Position = insertAdjacentHTML: 'afterbegin' | 'beforeend' | 'beforebegin' | 'afterend'
    const FEATURES = {
        core: {
            deps: [],
            html: [['components/core.html', 'body', 'afterbegin']],          // Preloader, Hintergrund, Back-to-Top
            css:  ['css/base.css'],
            js:   ['https://cdn.jsdelivr.net/npm/appwrite@13.0.1', 'js/core.js']
        },
        navbar: {
            deps: ['core'],
            html: [['components/navbar.html', 'body', 'beforeend']],         // Navbar, Sidebar, Overlay
            css:  ['css/navbar.css'],
            js:   ['/account/glaggle-avatar.js', 'js/auth.js']
        },
        design: {
            deps: ['navbar'],
            html: [['components/design-panel.html', '#sidebar-design-slot', 'beforeend']],
            css:  ['css/design.css'],
            js:   ['js/theme.js', 'js/music.js', 'js/background.js']
        },
        'smart-mouse': {
            deps: ['core'],
            html: [['components/smart-mouse.html', 'body', 'afterbegin']],
            css:  ['css/smart-mouse.css'],
            js:   ['js/smart-mouse.js']
        },
        voice: {
            deps: ['design', 'smart-mouse'],   // Voice ruft applyTheme, setBgMode, glaggleAudio, enableSmartMouse auf
            html: [['components/voice-assistant.html', 'body', 'beforeend']],
            css:  ['css/voice.css'],
            js:   ['js/voice-assistant.js']
        }
    };

    // ---- Hilfsfunktionen -----------------------------------------------
    const loaded = new Set();     // bereits geladene URLs
    const done   = new Set();     // bereits fertig geladene Features

    function resolve(path) {
        const abs = /^(https?:)?\/\//.test(path) || path.startsWith('/');
        const url = abs ? path : BASE + path;
        // Cache-Busting nur für eigene Dateien
        return (abs && !path.startsWith('/')) ? url
             : url + (url.includes('?') ? '&' : '?') + 'v=' + VERSION;
    }

    function loadCSS(path) {
        const url = resolve(path);
        if (loaded.has(url)) return Promise.resolve();
        loaded.add(url);
        return new Promise(res => {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = url;
            l.onload = l.onerror = () => res();   // CSS-Fehler sollen die Seite nicht blockieren
            document.head.appendChild(l);
        });
    }

    async function loadHTML([file, target, position]) {
        const url = resolve(file);
        if (loaded.has(url)) return;
        loaded.add(url);
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTML nicht gefunden: ' + url + ' (' + res.status + ')');
        const html = await res.text();
        const el = document.querySelector(target);
        if (!el) throw new Error('Ziel "' + target + '" existiert nicht für ' + file);
        el.insertAdjacentHTML(position || 'beforeend', html);
        // Hinweis: <script> innerhalb der HTML-Dateien wird NICHT ausgeführt -> Logik gehört in js/
    }

    function loadJS(path) {
        const url = resolve(path);
        if (loaded.has(url)) return Promise.resolve();
        loaded.add(url);
        return new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = url;
            s.async = false;                       // Reihenfolge beibehalten
            s.onload = () => res();
            s.onerror = () => rej(new Error('Konnte nicht laden: ' + url));
            document.body.appendChild(s);
        });
    }

    async function loadFeature(name) {
        if (done.has(name)) return;
        const f = FEATURES[name];
        if (!f) { console.warn('[Glaggle] Unbekanntes Feature:', name); return; }

        // 1. Abhängigkeiten zuerst (nacheinander, damit die Reihenfolge stimmt)
        for (const dep of f.deps) await loadFeature(dep);

        // 2. HTML einfügen (nacheinander) + CSS parallel, danach JS nacheinander
        const cssDone = Promise.all((f.css || []).map(loadCSS));
        for (const h of (f.html || [])) await loadHTML(h);
        await cssDone;
        for (const file of (f.js || [])) await loadJS(file);

        done.add(name);
        document.dispatchEvent(new CustomEvent('glaggle:feature', { detail: name }));
    }

    function domReady() {
        return document.readyState === 'loading'
            ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }))
            : Promise.resolve();
    }

    // ---- Start ---------------------------------------------------------
    const ready = (async () => {
        await domReady();
        await loadFeature('core');
        for (const name of wanted) {
            try { await loadFeature(name); }
            catch (err) { console.error('[Glaggle]', name, err); }
        }
        document.dispatchEvent(new CustomEvent('glaggle:ready', { detail: [...done] }));
        return [...done];
    })();

    // Öffentliche API: Glaggle.ready.then(...) oder Glaggle.has('voice')
    window.Glaggle = {
        ready,
        has: name => done.has(name),
        load: loadFeature            // Feature später nachladen: Glaggle.load('voice')
    };
})();
