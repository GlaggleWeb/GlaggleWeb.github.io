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
