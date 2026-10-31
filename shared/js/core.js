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
    const HIDE_AFTER = 120;   // ab so vielen Pixeln darf die Navbar verschwinden
    const MIN_DELTA  = 8;     // Zittern ignorieren
    const IDLE_MS    = 2000;  // Inaktivität, nach der sie wieder verschwindet

    let lastY = window.scrollY;
    let idleTimer = null;
    let ticking = false;

    const getNav = () => document.querySelector('.navbar');
    const sidebarOpen = () =>
        document.getElementById('sidebar')?.classList.contains('active');

    const showNav = () => getNav()?.classList.remove('nav-hidden');
    const hideNav = () => {
        if (sidebarOpen()) return;
        getNav()?.classList.add('nav-hidden');
    };

    function update() {
        ticking = false;
        const y = Math.max(window.scrollY || document.documentElement.scrollTop || 0, 0);
        const diff = y - lastY;
        if (Math.abs(diff) < MIN_DELTA) return;

        clearTimeout(idleTimer);

        if (y <= HIDE_AFTER) {
            showNav();
        } else if (diff > 0) {
            hideNav();
        } else {
            showNav();
            idleTimer = setTimeout(hideNav, IDLE_MS);
        }
        lastY = y;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    document.addEventListener('mouseover', e => {
        if (e.target.closest?.('.navbar')) clearTimeout(idleTimer);
    });
})();
