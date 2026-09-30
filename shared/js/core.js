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
        }, 500);
    }
});
    
async function checkLogin() {
    try {
        const user = await account.get();
        console.log("Login erfolgreich erkannt:", user.name);

        const loggedInDiv = document.getElementById('user-logged-in');
        const loggedOutDiv = document.getElementById('user-logged-out');
        const nameDisplay = document.getElementById('user-name-display');

        if (loggedInDiv && loggedOutDiv) {
            loggedInDiv.style.setProperty('display', 'block', 'important');
            loggedOutDiv.style.setProperty('display', 'none', 'important');
            if (nameDisplay) nameDisplay.innerText = user.name;
        }

        // Avatar aus dem localStorage anzeigen (kein Netzwerkzugriff).
        // Ist dort nichts, wird lokal ein Standard-Avatar aus dem Namen erzeugt.
        const avatarSvg = GlaggleAvatar.getAvatar(user.name);

        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) {
            GlaggleAvatar.render(navAvatar, avatarSvg);
            navAvatar.style.setProperty('display', 'block', 'important');
        }
        GlaggleAvatar.render(document.getElementById('sidebar-avatar'), avatarSvg);

    } catch (error) {
        console.log("Nicht eingeloggt oder Fehler:", error.message);
        const loggedInDiv = document.getElementById('user-logged-in');
        const loggedOutDiv = document.getElementById('user-logged-out');
        const navAvatar = document.getElementById('nav-avatar');

        if (loggedInDiv && loggedOutDiv) {
            loggedInDiv.style.setProperty('display', 'none', 'important');
            loggedOutDiv.style.setProperty('display', 'block', 'important');
        }
        if (navAvatar) navAvatar.style.setProperty('display', 'none', 'important');
    }
}

// Ruf die Funktion erst auf, wenn das HTML GANZ fertig geladen ist
window.addEventListener('load', () => {
    setTimeout(checkLogin, 500); // 500ms Puffer, damit die Sidebar sicher da ist
});

async function logout() {
    try {
        await account.deleteSession('current');
        GlaggleAvatar.clearCached();   // Avatar-Cache leeren (wichtig auf geteilten Geräten)
        location.reload();
    } catch (error) {
        alert("Fehler beim Abmelden");
    }
}

// Beim Start ausführen
checkLogin();

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
