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
