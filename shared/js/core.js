const client = new Appwrite.Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject('69fb638a002b7d03d829');

    const account = new Appwrite.Account(client);

// 1. Sidebar Toggle (Wird vom Hamburger-Icon und Overlay gebraucht)
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

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

// 1. Überwachen, wie weit gescrollt wurde
window.addEventListener("scroll", () => {
  // Zeigt den Button an, wenn mehr als 300px nach unten gescrollt wurde
  if (window.scrollY > 300) {
    backToTopBtn.classList.add("show");
  } else {
    backToTopBtn.classList.remove("show");
  }
});

// 2. Klick-Event: Smooth nach oben scrollen
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth" // Sorgt für das weiche Scrollen
  });
});
