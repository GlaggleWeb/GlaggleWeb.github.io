/* ==========================================================================
   Glaggle Avatar-Modul
   --------------------------------------------------------------------------
   - Generiert SVG-Avatare über Groq (openai/gpt-oss-120b)
   - Bereinigt das SVG (kein Script, keine Event-Handler, keine externen Links)
   - Speichert den Avatar in localStorage (Cache) + Appwrite (Quelle der Wahrheit)
   - Beim Login: Appwrite -> localStorage. Danach nur noch localStorage.

   Einbinden (nach dem Appwrite-SDK):
     <script src="../glaggle-avatar.js"></script>

   Benötigt globale Variablen der Seite:  databases, DB_ID, COLL_ID
   ========================================================================== */

const GlaggleAvatar = (() => {

    // ---------------------------------------------------------------------
    // 1) API-KEY-OBFUSKATION (3 Teile)
    // ---------------------------------------------------------------------
    // WICHTIG: Ein Key im Browser ist NIE wirklich geheim. Das Aufteilen
    // schützt nur vor simplen Bots, die nach "gsk_..." greppen. Jeder
    // Mensch mit DevTools (Netzwerk-Tab) sieht den Key beim Request.
    // -> In Groq unbedingt Budget-/Rate-Limits setzen oder später über
    //    eine Appwrite Function als Proxy laufen lassen.
    //
    // So trägst du deinen Key ein:
    //   Key:  gsk_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
    //   Teil A: die ersten ~12 Zeichen
    //   Teil B: die mittleren ~12 Zeichen
    //   Teil C: der Rest
    // Die Teile werden hier als Base64 abgelegt und in falscher Reihenfolge
    // gespeichert, damit man sie nicht einfach zusammenkopieren kann.
    //
    // Hilfe zum Kodieren: in der Browser-Konsole  btoa("gsk_AbCdEfGhIj")
const _p = {
    k2: "TWhrZkJPV0dkeWIzRlllbWVTZw==",
    k3: "eEF5MVNFa0NQNjhPbTNWbk5maA==",
    k1: "Z3NrXzEwaGI0UE1sMzFpenFh"
};
    // Reihenfolge des Zusammensetzens (nicht 1-2-3 im Code sichtbar):
    const _order = ["k1", "k2", "k3"];

    function _assembleKey() {
        // Jeder Teil wird einzeln dekodiert und erst beim Aufruf zusammengesetzt.
        // Der fertige Key liegt nie als Variable/String im globalen Scope.
        return _order.map(k => atob(_p[k])).join("");
    }

    const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    const GROQ_MODEL = "openai/gpt-oss-120b";

    // ---------------------------------------------------------------------
    // 2) localStorage
    // ---------------------------------------------------------------------
    const LS_KEY = "glaggle_avatar";

    // Fallback, falls localStorage blockiert ist (z.B. Inkognito in Safari)
    let _memoryCache = null;

    function getCached() {
        try {
            return localStorage.getItem(LS_KEY) || _memoryCache;
        } catch (e) {
            return _memoryCache;
        }
    }

    function setCached(svg) {
        _memoryCache = svg;
        try { localStorage.setItem(LS_KEY, svg); } catch (e) { /* voll/blockiert */ }
    }

    function clearCached() {
        _memoryCache = null;
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
    }

    // ---------------------------------------------------------------------
    // 3) SVG-Sanitizing (SEHR wichtig)
    // ---------------------------------------------------------------------
    // Die KI liefert Markup, das wir später per innerHTML anzeigen und das
    // in Appwrite liegt (wo es theoretisch auch manipuliert werden könnte).
    // Deshalb: parsen, nur erlaubte Tags/Attribute behalten, Rest verwerfen.
    const ALLOWED_TAGS = new Set([
        "svg", "g", "defs", "path", "circle", "ellipse", "rect", "line",
        "polyline", "polygon", "linearGradient", "radialGradient", "stop",
        "clipPath", "mask", "title", "desc"
    ]);

    const ALLOWED_ATTRS = new Set([
        "viewBox", "xmlns", "width", "height", "x", "y", "x1", "y1", "x2", "y2",
        "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "stroke",
        "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity",
        "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule",
        "transform", "id", "offset", "stop-color", "stop-opacity",
        "gradientUnits", "gradientTransform", "clip-path", "mask",
        "class", "role", "aria-label"
    ]);

    // Werte, die nach Angriff aussehen (javascript:, externe URLs, usw.)
    function _isUnsafeValue(v) {
        const s = String(v).trim().toLowerCase();
        if (s.includes("javascript:")) return true;
        if (s.includes("data:")) return true;
        if (s.includes("expression(")) return true;
        // url(#id) ist erlaubt (interne Gradients), url(http...) nicht
        if (s.includes("url(") && !/url\(\s*['"]?#[\w\-]+['"]?\s*\)/.test(s)) return true;
        return false;
    }

    function sanitizeSvg(raw) {
        if (typeof raw !== "string") return null;

        // Markdown-Codeblöcke entfernen, falls das Modell sie mitliefert
        let text = raw.replace(/```(?:svg|xml|html)?/gi, "").trim();

        // Nur den <svg>...</svg>-Block herausziehen
        const start = text.search(/<svg[\s>]/i);
        const end = text.toLowerCase().lastIndexOf("</svg>");
        if (start === -1 || end === -1 || end < start) return null;
        text = text.slice(start, end + 6);

        // Größenbremse: Avatare sollen klein bleiben (Appwrite-Textfeld!)
        if (text.length > 20000) return null;

        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        if (doc.querySelector("parsererror")) return null;

        const root = doc.documentElement;
        if (!root || root.nodeName.toLowerCase() !== "svg") return null;

        function clean(node) {
            // Kinder rückwärts durchgehen, weil wir beim Iterieren löschen
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                const child = node.childNodes[i];

                if (child.nodeType === 1) { // Element
                    const tag = child.localName;
                    if (!ALLOWED_TAGS.has(tag)) {
                        node.removeChild(child);
                        continue;
                    }
                    // Attribute filtern (Kopie, weil wir löschen)
                    Array.from(child.attributes).forEach(attr => {
                        const name = attr.name;
                        const lower = name.toLowerCase();
                        const okName = ALLOWED_ATTRS.has(name) || ALLOWED_ATTRS.has(lower);
                        if (!okName || lower.startsWith("on") || _isUnsafeValue(attr.value)) {
                            child.removeAttribute(name);
                        }
                    });
                    clean(child);
                } else if (child.nodeType === 3) {
                    // Textknoten nur in <title>/<desc> sinnvoll -> sonst entfernen
                    const parent = node.localName;
                    if (parent !== "title" && parent !== "desc") node.removeChild(child);
                } else {
                    // Kommentare, CDATA, Processing Instructions -> weg
                    node.removeChild(child);
                }
            }
        }

        // Wurzel-Attribute ebenfalls filtern
        Array.from(root.attributes).forEach(attr => {
            const lower = attr.name.toLowerCase();
            const ok = ALLOWED_ATTRS.has(attr.name) || ALLOWED_ATTRS.has(lower);
            if (!ok || lower.startsWith("on") || _isUnsafeValue(attr.value)) {
                root.removeAttribute(attr.name);
            }
        });

        clean(root);

        // Pflichtattribute sicherstellen, damit das SVG skaliert
        if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 100 100");
        root.removeAttribute("width");
        root.removeAttribute("height");

        // Muss noch sichtbaren Inhalt haben
        if (root.querySelectorAll("path,circle,ellipse,rect,line,polyline,polygon").length === 0) {
            return null;
        }

        return new XMLSerializer().serializeToString(root);
    }

    // ---------------------------------------------------------------------
    // 4) Fallback-Avatar (ohne KI, deterministisch aus dem Namen)
    // ---------------------------------------------------------------------
    // Wird beim ERSTEN Account-Erstellen verwendet, damit sofort ein Avatar
    // existiert (kostet keinen API-Call). Der User kann später einen
    // KI-Avatar erzeugen.
    function _hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function generateDefaultAvatar(seed) {
        const h = _hash(String(seed || "glaggle"));
        const hue1 = h % 360;
        const hue2 = (hue1 + 40 + (h >> 8) % 80) % 360;
        const eyeShift = (h >> 4) % 5;         // 0..4
        const mouth = (h >> 12) % 3;           // 0..2
        const initial = (String(seed || "G").trim()[0] || "G").toUpperCase();

        const mouthPath = [
            "M 36 64 Q 50 76 64 64",           // Lächeln
            "M 38 66 Q 50 70 62 66",           // sanft
            "M 40 68 L 60 68"                  // neutral
        ][mouth];

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
            `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="hsl(${hue1},75%,65%)"/>` +
            `<stop offset="1" stop-color="hsl(${hue2},70%,55%)"/>` +
            `</linearGradient></defs>` +
            `<circle cx="50" cy="50" r="50" fill="url(#bg)"/>` +
            `<circle cx="${34 + eyeShift}" cy="42" r="5" fill="#ffffff"/>` +
            `<circle cx="${66 - eyeShift}" cy="42" r="5" fill="#ffffff"/>` +
            `<circle cx="${34 + eyeShift}" cy="43" r="2.4" fill="#222222"/>` +
            `<circle cx="${66 - eyeShift}" cy="43" r="2.4" fill="#222222"/>` +
            `<path d="${mouthPath}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>` +
            `<title>Avatar ${initial}</title></svg>`;
    }

    // ---------------------------------------------------------------------
    // 5) KI-Generierung über Groq
    // ---------------------------------------------------------------------
    const SYSTEM_PROMPT =
        "Du bist ein SVG-Avatar-Generator für die Plattform Glaggle. " +
        "Antworte AUSSCHLIESSLICH mit einem einzigen gültigen SVG-Element, ohne Erklärung, " +
        "ohne Markdown, ohne Codeblock. Regeln: " +
        "1) Beginne mit <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"> und ende mit </svg>. " +
        "2) Der Avatar soll ein rundes, freundliches Profilbild sein (Hintergrund als Kreis mit r=50 um 50,50). " +
        "3) Erlaubte Elemente: circle, ellipse, rect, path, line, polyline, polygon, g, defs, linearGradient, radialGradient, stop. " +
        "4) Verboten: script, style, image, foreignObject, text, a, use, Animationen, Event-Handler, externe URLs. " +
        "5) Nutze nur flache Formen und Farbverläufe, maximal ca. 40 Elemente, unter 6000 Zeichen. " +
        "6) Keine Texte oder Buchstaben im Bild. " +
        "7) Setze die Beschreibung des Nutzers kreativ um, bleibe aber jugendfrei und freundlich.";

    async function generateWithAI(description, { signal } = {}) {
        const desc = String(description || "").trim().slice(0, 300);
        if (desc.length < 3) throw new Error("Bitte beschreibe deinen Avatar etwas genauer.");

        const res = await fetch(GROQ_URL, {
            method: "POST",
            signal,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + _assembleKey()
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                temperature: 0.8,
                max_tokens: 4000,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: "Erstelle diesen Avatar: " + desc }
                ]
            })
        });

        if (res.status === 429) throw new Error("Zu viele Anfragen. Bitte warte kurz und versuche es erneut.");
        if (res.status === 401) throw new Error("API-Key ungültig. Bitte den Betreiber informieren.");
        if (!res.ok) throw new Error("KI-Dienst nicht erreichbar (Status " + res.status + ").");

        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content || "";
        const clean = sanitizeSvg(raw);
        if (!clean) throw new Error("Die KI hat kein gültiges SVG geliefert. Bitte versuche es mit einer anderen Beschreibung.");
        return clean;
    }

    // ---------------------------------------------------------------------
    // 6) Appwrite-Sync
    // ---------------------------------------------------------------------
    // Speichert den Avatar im Dokument des Users (Attribut "avatar", Text).
    // Achtung: In Appwrite muss die Größe des Attributs zur SVG-Länge passen
    // (siehe Hinweis in der Antwort). Wir begrenzen sanitizeSvg auf 20000 Zeichen.
    async function saveToAppwrite(docId, svg) {
        if (!docId) throw new Error("Kein Profil-Dokument gefunden.");
        await databases.updateDocument(DB_ID, COLL_ID, docId, { avatar: svg });
    }

    // Kompletter Ablauf "speichern": sanitizen -> Appwrite -> localStorage.
    // Erst NACH erfolgreichem Appwrite-Upload wird der Cache überschrieben,
    // sonst könnte der lokale Stand vom Server abweichen.
    async function saveAvatar(docId, svg) {
        const clean = sanitizeSvg(svg);
        if (!clean) throw new Error("Ungültiges SVG.");
        await saveToAppwrite(docId, clean);
        setCached(clean);
        return clean;
    }

    // Beim Login: Avatar aus Appwrite in den Cache laden.
    // Gibt es (noch) keinen, wird ein Standard-Avatar erzeugt und hochgeladen.
    async function syncOnLogin(userDoc, fallbackSeed) {
        let svg = userDoc && userDoc.avatar ? sanitizeSvg(userDoc.avatar) : null;

        if (!svg) {
            svg = generateDefaultAvatar(fallbackSeed || (userDoc && userDoc.userName) || "glaggle");
            if (userDoc && userDoc.$id) {
                try { await saveToAppwrite(userDoc.$id, svg); }
                catch (e) { console.warn("Standard-Avatar konnte nicht hochgeladen werden:", e); }
            }
        }
        setCached(svg);
        return svg;
    }

    // Lokal lesen, ohne Netzwerk. Optional Fallback erzeugen.
    function getAvatar(fallbackSeed) {
        const cached = getCached();
        if (cached) return cached;
        return fallbackSeed ? generateDefaultAvatar(fallbackSeed) : null;
    }

    // Avatar in ein Element rendern (nur sanitisiertes SVG!)
    function render(el, svg) {
        if (!el) return;
        const clean = sanitizeSvg(svg);
        el.innerHTML = clean || "";
    }

    return {
        generateWithAI, generateDefaultAvatar, sanitizeSvg,
        saveAvatar, syncOnLogin, getAvatar, setCached, getCached, clearCached, render
    };
})();
