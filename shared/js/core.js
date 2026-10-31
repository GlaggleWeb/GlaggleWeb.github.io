const client = new Appwrite.Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject('69fb638a002b7d03d829');

    const account = new Appwrite.Account(client);

window.toggleMenu = function () {
    document.getElementById('sidebar')?.classList.toggle('active');
    document.getElementById('overlay')?.classList.toggle('active');
};

// 2. Groq API Key (Wird zwingend für den Voice Assistant benötigt!)
const p1 = "gsk_";
const p2 = "FAnwmg4IMqrAexyzdupqWGdyb";
const p3 = "3FYiivhNRW9aQu5VibY0j0eKQ5r";
function getGKey() { 
    return p1 + p2 + p3; 
}

// 3. Preloader ausblenden (WICHTIG: Sonst bleibt die Ladeanimation auf allen Unterseiten stehen!)
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('preloader-hidden');
        }, 100);
    }
});
  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
      window.addEventListener("scroll", () => {
          backToTopBtn.classList.toggle("show", window.scrollY > 300);
      }, { passive: true });
      backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

(function smartNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const HIDE_AFTER = 120;   // ab so vielen Pixeln darf die Navbar verschwinden
    const MIN_DELTA  = 8;     // minimale Scrollbewegung, damit Zittern ignoriert wird
    const IDLE_MS    = 2000;  // Inaktivität (ms), nach der sie wieder verschwindet

    let lastY = window.scrollY;
    let idleTimer = null;
    let ticking = false;

    const sidebarOpen = () =>
        document.getElementById('sidebar')?.classList.contains('active');

    const showNav = () => navbar.classList.remove('nav-hidden');
    const hideNav = () => {
        if (sidebarOpen()) return;          // nicht verstecken, solange das Menü offen ist
        navbar.classList.add('nav-hidden');
    };

    function update() {
        ticking = false;
        const y = Math.max(window.scrollY, 0);   // iOS-Overscroll abfangen
        const diff = y - lastY;
        if (Math.abs(diff) < MIN_DELTA) return;

        clearTimeout(idleTimer);

        if (y <= HIDE_AFTER) {
            showNav();                           // ganz oben immer sichtbar
        } else if (diff > 0) {
            hideNav();                           // runter: verstecken
        } else {
            showNav();                           // hoch: anzeigen
            idleTimer = setTimeout(hideNav, IDLE_MS);  // bei Inaktivität wieder weg
        }
        lastY = y;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    // Optional: Timer pausieren, solange die Maus/der Finger auf der Navbar ist
    navbar.addEventListener('mouseenter', () => clearTimeout(idleTimer));
    navbar.addEventListener('touchstart', () => clearTimeout(idleTimer), { passive: true });
})();
