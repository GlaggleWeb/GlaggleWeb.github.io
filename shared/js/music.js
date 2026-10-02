// ===== MUSIK KOMPLETT ===== 
let glaggleAudio = null; // falls noch nicht definiert, sonst diese Zeile weglassen

// NEU (fix):
document.getElementById('music-select').addEventListener('change', function() {
    if (glaggleAudio) { glaggleAudio.pause(); glaggleAudio = null; }
    const ctrl = document.getElementById('music-controls');
    if (!this.value) { ctrl.style.display = 'none'; localStorage.removeItem('glaggle-music'); return; }
    ctrl.style.display = 'flex';
    const volume = document.getElementById('music-vol').value;
    localStorage.setItem('glaggle-music', JSON.stringify({ url: this.value, volume: parseInt(volume) }));
    glaggleAudio = new Audio(this.value);
    glaggleAudio.loop = true;
    glaggleAudio.volume = volume / 100;
    glaggleAudio.play().catch(() => {});
});

document.getElementById('music-vol').addEventListener('input', function() {
    document.getElementById('vol-label').textContent = this.value + '%'
    if (glaggleAudio) glaggleAudio.volume = this.value / 100;
    const saved = localStorage.getItem('glaggle-music');
    if (saved) {
        const d = JSON.parse(saved);
        d.volume = parseInt(this.value);
        localStorage.setItem('glaggle-music', JSON.stringify(d));
    }
});

function restoreMusic() {
    const saved = localStorage.getItem('glaggle-music');
    if (!saved) return;
    try {
        const { url, volume } = JSON.parse(saved);
        const sel = document.getElementById('music-select');
        const vol = document.getElementById('music-vol');   // ✅ NEU
        const lbl = document.getElementById('vol-label');
        const ctrl = document.getElementById('music-controls');
        if (!sel || !url) return;
        sel.value = url;
        if (vol) vol.value = volume;                        // ✅ jetzt definiert
        if (lbl) lbl.textContent = volume + '%';
        if (ctrl) ctrl.style.display = 'flex';
        glaggleAudio = new Audio(url);
        glaggleAudio.loop = true;
        glaggleAudio.volume = volume / 100;
        glaggleAudio.play().catch(() => {});
    } catch(e) {}
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreMusic);
} else {
    restoreMusic();
}
function handleMusicChange(sel) {
  if (glaggleAudio) { glaggleAudio.pause(); glaggleAudio = null; }
  const ctrl = document.getElementById('music-controls');
  if (!sel.value) { ctrl.style.display = 'none'; return; }
  ctrl.style.display = 'flex';
  glaggleAudio = new Audio(sel.value);
  glaggleAudio.loop = true;
  glaggleAudio.volume = document.getElementById('music-vol').value / 100;
  glaggleAudio.play().catch(() => {});
}
document.getElementById('music-vol').oninput = function() {
  document.getElementById('vol-label').textContent = this.value + '%';
  if (glaggleAudio) glaggleAudio.volume = this.value / 100;
};

// HIER: fadeVolume nach draußen gezogen, damit duckMusic() darauf zugreifen kann!
function fadeVolume(target) {
    if (typeof glaggleAudio === 'undefined' || !glaggleAudio) return;
    const steps = 25;
    const diff = (target - glaggleAudio.volume) / steps;
    let i = 0;
    const fade = setInterval(() => {
        i++;
        if (typeof glaggleAudio === 'undefined' || !glaggleAudio) { clearInterval(fade); return; }
        glaggleAudio.volume = Math.max(0, Math.min(1, glaggleAudio.volume + diff));
        if (i >= steps) {
            glaggleAudio.volume = target;
            clearInterval(fade);
        }
    }, 25);
}

function duckMusic(duck = true) {
    if (typeof glaggleAudio === 'undefined' || !glaggleAudio || glaggleAudio.paused) return;

    const volEl = document.getElementById('music-vol');
    const currentVol = volEl ? parseFloat(volEl.value) / 100 : 0.4;
    if (currentVol <= 0) return;

    if (duck) {
        preDuckVolume = glaggleAudio.volume;
        fadeVolume(Math.min(0.06, currentVol * 0.15));
    } else {
        if (preDuckVolume === null) return; // NEU: nichts zu tun, wenn nie geduckt wurde
        fadeVolume(preDuckVolume);
        preDuckVolume = null;
    }
}

// HIER: Autoplay-Lösung für das Neuladen der Seite
function tryAutoplayMusic() {
    // Falls deine Musik-Logik einen State speichert (z. B. im LocalStorage oder einer Checkbox)
    // Ersetze 'true' ggf. mit deiner eigenen Abfrage, ob Musik laufen SOLLTE
    const musicShouldPlay = true; 

    if (musicShouldPlay && typeof glaggleAudio !== 'undefined' && glaggleAudio) {
        const playPromise = glaggleAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Autoplay erfolgreich gestartet!");
            }).catch(error => {
                console.log("Browser blockiert Autoplay. Warte auf ersten Klick des Nutzers...");
                
                // Sobald der Nutzer das erste Mal klickt, spielen wir die Musik ab
                const startOnInteraction = () => {
                    glaggleAudio.play().then(() => {
                        document.removeEventListener('click', startOnInteraction);
                    }).catch(e => console.error("Klick-Play fehlgeschlagen:", e));
                };
                document.addEventListener('click', startOnInteraction);
            });
        }
    }
}

function playWhenAllowed(audio) {
    audio.play().catch(() => {
        const events = ['pointerdown', 'keydown', 'touchstart'];
        const start = () => {
            events.forEach(e => document.removeEventListener(e, start));
            if (glaggleAudio === audio) audio.play().catch(() => {});
        };
        events.forEach(e => document.addEventListener(e, start, { passive: true }));
    });
}
