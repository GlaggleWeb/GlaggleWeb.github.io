let recognition = null;
let isListening = false;
let voiceOpen = false;
let preDuckVolume = null;
let lastVoiceReply = "";
let voiceHistory = [];
let currentVoiceLang = localStorage.getItem('glaggle-voice-lang') || 'de-DE';
let voiceSpeed = parseFloat(localStorage.getItem('glaggle-voice-speed') || '0.82');
let voiceGender = localStorage.getItem('glaggle-voice-gender') || 'auto';

function unlockSpeechSynthesis() {
    if (!window.speechSynthesis) return;
    // Ein winziger, fast unhörbarer Dummy-Satz "entsperrt" die Engine
    // für alle folgenden speak()-Aufrufe in dieser Seiten-Session,
    // auch außerhalb eines direkten Gesture-Kontexts.
    const unlock = new SpeechSynthesisUtterance(' ');
    unlock.volume = 0;
    window.speechSynthesis.speak(unlock);
}

function submitVoiceText(e) {
    e.preventDefault();
    unlockSpeechSynthesis(); // Antwort soll auch vorgelesen werden können

    const input = document.getElementById('voice-text-input');
    const text = input.value.trim();
    if (!text) return;

    // Falls gerade Mikrofon läuft: stoppen
    if (isListening) stopListening();

    // Transcript-Box wie bei Sprache anzeigen
    const transcript = document.getElementById('voice-transcript');
    transcript.style.display = 'block';
    transcript.innerText = '⌨️ ' + text;

    input.value = '';
    askGroqVoice(text);
}

function getVoiceSystemPrompt() {
    const langMap = {
        'de-DE': 'Antworte im "reply"-Feld immer auf Deutsch.',
        'en-US': 'Always reply in English in the "reply" field.',
        'fr-FR': 'Réponds toujours en français dans le champ "reply".',
        'es-ES': 'Responde siempre en español en el campo "reply".'
    };
    const langInstruction = langMap[currentVoiceLang] || langMap['de-DE'];
    
    return `Du bist Glaggle Assistant, der Sprachassistent von Glaggle AI.
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, ohne Markdown, ohne Einleitung:

{
  "action": "<eine der erlaubten Aktionen>",
  "params": { ... je nach Aktion ... },
  "reply": "<kurze natürliche Antwort, max. 2 Sätze>"
}

${langInstruction}

ERLAUBTE AKTIONEN:
1. "timer" — params: {"minutes": <Zahl>}
2. "search" — params: {"query": "<Suchbegriff>"}
3. "calculator" — params: {"expression": "<Ausdruck>"}
4. "wetter" — params: {"city": "<Stadt oder leer>"}
5. "open_app" — params: {"app": "<glame|gamecenter|glagini|designstudio|codemaker|avideo|aimage|quizai>"}
6. "theme" — params: {"theme": "<hell|dunkel|blau|grün|rot|gelb|violett>"}
7. "music" — params: {"state": "<an|aus>"}
8. "scroll_top"
9. "open_chat"
10. "smart_mouse" — params: {"state": "<an|aus>"}
11. "open_menu"
12. "image_search" — params: {"query": "<Suchbegriff>"}
13. "wiki_search" — params: {"query": "<Suchbegriff>"}
14. "background_random"
15. "background_off"
16. "volume" — params: {"direction": "<hoch|runter>"}
17. "repeat"
18. "help"
19. "login"
20. "register"
21. "close_assistant"
22. "clipboard" — params: {"target": "search" | "response"}
23. "language" — params: {"lang": "<de|en|fr|es>"}
24. "none"`;
}

function toggleVoiceAssistant() {
    unlockSpeechSynthesis(); // NEU: ganz am Anfang, noch im User-Gesture
    const popup = document.getElementById('voice-popup');
    voiceOpen = !voiceOpen;
    popup.style.display = voiceOpen ? 'block' : 'none';

    if (voiceOpen) {
    if (!localStorage.getItem('glaggle_voice_features_seen')) {
        localStorage.setItem('glaggle_voice_features_seen', 'true');
        setTimeout(openVoiceFeaturesPopup, 350);
    } else {
        setTimeout(startListening, 400);
    }
} else {
        stopListening();
    }
}

function closeVoiceAssistant() {
    document.getElementById('voice-popup').style.display = 'none';
    voiceOpen = false;
    stopListening();
}

function startListening() {
    unlockSpeechSynthesis(); // entsperrt speechSynthesis noch im User-Gesture

    if (isListening) { stopListening(); return; }
    duckMusic(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setVoiceStatus('❌ Dein Browser unterstützt keine Spracheingabe');
        return;
    }

    if (!window.isSecureContext) {
        setVoiceStatus('❌ Spracheingabe benötigt HTTPS');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = currentVoiceLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        setVoiceStatus('🎙️ Ich höre zu...');
        document.getElementById('voice-wave').classList.add('active');
        document.getElementById('voice-mic-btn').classList.add('listening');
        document.getElementById('voice-btn').classList.add('listening');
        document.getElementById('voice-transcript').style.display = 'block';
        document.getElementById('voice-transcript').innerText = '...';
    };

    recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
            .map(r => r[0].transcript).join('');
        document.getElementById('voice-transcript').innerText = '🗣️ ' + transcript;

        if (e.results[e.results.length - 1].isFinal) {
            stopListening();
            askGroqVoice(transcript);
        }
    };

    recognition.onerror = (e) => {
        stopListening();
        const msgMap = {
            'not-allowed': '❌ Mikrofonzugriff verweigert — bitte in den Einstellungen erlauben',
            'service-not-allowed': '❌ Spracherkennung auf diesem Gerät nicht verfügbar',
            'no-speech': '⚠️ Keine Sprache erkannt — versuch es nochmal',
            'network': '❌ Keine Internetverbindung für Spracherkennung'
        };
        setVoiceStatus(msgMap[e.error] || ('❌ Fehler: ' + e.error));
    };

    recognition.onend = () => {
        if (isListening) stopListening();
    };

    try {
        recognition.start();
    } catch (err) {
        setVoiceStatus('❌ Spracherkennung konnte nicht gestartet werden');
    }
}

function stopListening() {
    isListening = false;
    if (recognition) { recognition.stop(); recognition = null; }
    document.getElementById('voice-wave').classList.remove('active');
    document.getElementById('voice-mic-btn').classList.remove('listening');
    document.getElementById('voice-btn').classList.remove('listening');
}

const VOICE_ACTIONS_SYSTEM_PROMPT = `
Du bist Glaggle Assistant, der Sprachassistent von Glaggle AI.
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, ohne Markdown, ohne Einleitung, ohne Erklärung:

{
  "action": "<eine der erlaubten Aktionen>",
  "params": { ... je nach Aktion ... },
  "reply": "<kurze, natürliche gesprochene Antwort auf Deutsch (wenn der Nutzer dich anders anspricht dann antworte auch so), max. 2 Sätze, wie Siri/Google Assistant>"
}

ERLAUBTE AKTIONEN:
1. "timer" — Nutzer will einen Timer/Wecker stellen. params: {"minutes": <Zahl>}
2. "search" — Nutzer will im Web/auf Glaggle suchen ("suche nach...", "google mal...", "finde mir..."). params: {"query": "<Suchbegriff>"}
3. "calculator" — Nutzer will etwas berechnen. params: {"expression": "<math. Ausdruck z.B. 5*12+3>"}
4. "wetter" — Nutzer fragt nach dem Wetter. Extrahiere die Stadt aus dem Satz falls genannt ("in Zürich", "in Bern" usw). params: {"city": "<Stadtname oder leer wenn keine Stadt genannt>"}
5. "open_app" — Nutzer will eine Glaggle-App öffnen. params: {"app": "<glame|gamecenter|glagini|designstudio|codemaker|avideo|aimage|quizai>"}
6. "theme" — Nutzer will das Farbschema wechseln. params: {"theme": "<hell|dunkel|blau|grün|rot|gelb|violett>"}
7. "music" — Nutzer will Hintergrundmusik an/aus machen. params: {"state": "<an|aus>"}
8. "scroll_top" — Nutzer will nach oben scrollen / neu anfangen.
9. "open_chat" — Nutzer will im Chat weiter mit Glaggle AI sprechen/tippen.
10. "smart_mouse" — Nutzer will den Smart-Mouse-Cursor an/ausschalten. params: {"state": "<an|aus>"}
11. "open_menu" — Nutzer will das Seitenmenü öffnen.
12. "none" — Nichts davon passt, einfach normal inhaltlich antworten (Wissen, Smalltalk).
12. "image_search" — Nutzer will Bilder suchen ("zeig mir Bilder von...", "suche Bilder..."). params: {"query": "<Suchbegriff>"}
13. "wiki_search" — Nutzer will explizit auf Wikipedia nachschlagen ("was sagt Wikipedia über...", "wikipedia..."). params: {"query": "<Suchbegriff>"}
14. "background_random" — Nutzer will den Hintergrund ändern/ein neues Bild ("anderer Hintergrund", "wechsle das Bild").
15. "background_off" — Nutzer will den Hintergrund ausschalten/entfernen.
16. "volume" — Nutzer will die Musiklautstärke ändern. params: {"direction": "<hoch|runter>"}
17. "repeat" — Nutzer will die letzte Antwort nochmal hören ("wiederhole das", "was hast du gesagt").
18. "help" — Nutzer will eine Kurzanleitung/Hilfe zu Glaggle ("wie funktioniert das hier", "hilfe").
19. "login" — Nutzer will sich einloggen.
20. "register" — Nutzer will sich registrieren/ein Konto erstellen.
21. "close_assistant" — Nutzer will den Assistenten schliessen ("schliesse dich", "tschüss", "das wars").
22. "none" — Nichts davon passt, einfach normal inhaltlich antworten (Wissen, Smalltalk).
22. "clipboard" — Nutzer will etwas kopieren ("kopiere den Suchbegriff", "kopiere die letzte Antwort"). params: {"target": "search" | "response"}
23. "language" — Nutzer will Sprache wechseln ("speak english", "wechsle auf Englisch"). params: {"lang": "de" | "en" | "fr" | "es"}
24. "none" — Nichts davon passt, einfach normal inhaltlich antworten.

Erkenne Absichten auch bei lockerer Umgangssprache. Bei "none" trotzdem inhaltlich in "reply" antworten.
`;

async function askGroqVoice(text) {
    setVoiceStatus('✨ Glaggle denkt nach...');
    const responseBox = document.getElementById('voice-response');
    responseBox.style.display = 'block';
    responseBox.innerText = '...';

    // Kontext aus den letzten 3 Exchanges zusammenbauen
    const historyContext = voiceHistory.length > 0
        ? `[Bisheriges Gespräch: ${voiceHistory.map(h => 
            `${h.role === 'user' ? 'Nutzer' : 'Assistent'}: "${h.content}"`
          ).join(' → ')}]\n\nAktuelle Anfrage: `
        : '';

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + getGKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages: [
                    { role: "system", content: getVoiceSystemPrompt() },
                    { role: "user", content: historyContext + text }
                ],
                temperature: 0.2,
                max_tokens: 300
            })
        });

        const data = await res.json();
        const raw = data.choices[0].message.content;

        let parsed;
        try {
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}") + 1;
            parsed = JSON.parse(raw.substring(start, end));
        } catch (e) {
            parsed = { action: "none", params: {}, reply: raw };
        }

        const reply = parsed.reply || "Alles klar!";
        lastVoiceReply = reply;

        // Kontext-Gedächtnis: max. 6 Einträge (3 Exchanges)
        voiceHistory.push({ role: "user", content: text });
        voiceHistory.push({ role: "assistant", content: reply });
        if (voiceHistory.length > 6) voiceHistory = voiceHistory.slice(-6);

        responseBox.innerText = reply;
        setVoiceStatus('✅ Fertig — tippe erneut zum Sprechen');
        speakResponse(reply);
        executeVoiceAction(parsed.action, parsed.params || {});

    } catch(e) {
        responseBox.innerText = 'Fehler beim Verbinden mit Glaggle AI.';
        setVoiceStatus('❌ Verbindungsfehler');
    }
}
function scrollToWidget(delay = 300) {
    setTimeout(() => {
        const firstEntry = document.querySelector('#glaggleResults .glaggle-entry');
        if (firstEntry) firstEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, delay);
}

// --- HILFSFUNKTIONEN FÜR CROSS-TAB ACTIONS ---

// Prüft, ob wir uns auf der Hauptseite (Suchseite) befinden
function isGlaggleHome() {
    // Der glaggleResults Container existiert nur auf der index.html
    return document.getElementById('glaggleResults') !== null;
}

// Baut die URL für den neuen Tab
function buildRemoteUrl(action, params) {
    let url = "https://glaggle.ch/?glaggle_auto=1&action=" + action;
    if (action === 'timer') url += "&minutes=" + (params.minutes || 5);
    if (action === 'search') url += "&q=" + encodeURIComponent(params.query || "");
    if (action === 'wetter') url += "&city=" + encodeURIComponent(params.city || "");
    if (action === 'calculator') url += "&expr=" + encodeURIComponent(params.expression || "");
    return url;
}

// Das Bestätigungs-Popup
function showPermissionDialog(actionLabel, onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'glaggle-permission-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
        z-index: 20000; display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.2s ease-out;
    `;
    
    const box = document.createElement('div');
    box.style.cssText = `
        background: #1a1a1a; border: 1px solid #70C4F7; border-radius: 25px;
        padding: 25px; width: min(350px, 90vw); text-align: center; color: white;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5); font-family: 'Arial Rounded MT Bold';
    `;
    box.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 10px;">🚀</div>
        <h3 style="margin: 0 0 15px 0; color: #70C4F7; font-size: 1.1rem;">Aktion auf Hauptseite</h3>
        <p style="margin: 0 0 25px 0; color: #ccc; line-height: 1.5; font-size: 0.95rem;">
            Darf Glaggle Assistant <strong style="color: white;">${actionLabel}</strong> auf der Hauptseite <strong>Glaggle.ch</strong> öffnen?
        </p>
        <div style="display: flex; gap: 10px;">
            <button id="perm-no" style="flex: 1; padding: 12px; background: #333; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">Abbrechen</button>
            <button id="perm-yes" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #70C4F7, #2E94D1); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(112,196,247,0.3);">Ja, öffnen</button>
        </div>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('perm-no').onclick = () => overlay.remove();
    document.getElementById('perm-yes').onclick = () => {
        overlay.remove();
        onConfirm();
    };
}

// --- DIE NEUE EXECUTE FUNKTION ---

function executeVoiceAction(action, params) {
    const isHome = isGlaggleHome();

    // Helper für Remote-Actions (wenn wir NICHT zuhause sind)
    const tryRemote = (actionName, urlAction, urlParams) => {
        if (isHome) return false; // Wir sind zuhause -> mach es lokal (unten im switch)
        
        showPermissionDialog(actionName, () => {
            const url = buildRemoteUrl(urlAction, params);
            window.open(url, '_blank');
            speakResponse("Ich öffne " + actionName + " auf der Hauptseite für dich.");
            closeVoiceAssistant();
        });
        return true; // Wir haben uns darum gekümmert
    };

    switch (action) {
        case "timer": {
            if (tryRemote("den Timer", "timer", params)) return;
            // Lokale Logik (nur auf Home)
            if (typeof renderTimerWidget === 'function') {
                const minutes = parseFloat(params.minutes) || 5;
                renderTimerWidget(minutes);
                scrollToWidget();
            }
            break;
        }
        case "search": {
            if (tryRemote("die Suche", "search", params)) return;
            const query = params.query || "";
            if (!query) break;
            closeVoiceAssistant();
            document.getElementById('glaggleQuery').value = query;
            if (typeof glaggleSearch === 'function') glaggleSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        }
        case "calculator": {
            if (tryRemote("den Rechner", "calculator", params)) return;
            if (typeof renderCalculatorWidget === 'function') {
                const expr = (params.expression || "").replace(/x/gi, '*');
                renderCalculatorWidget(expr);
                scrollToWidget();
            }
            break;
        }
        case "wetter": {
            if (tryRemote("das Wetter", "wetter", params)) return;
            if (typeof fetchRealWeather === 'function') {
                fetchRealWeather(params.city || "");
                scrollToWidget(800);
            }
            break;
        }

        case "open_app": {
            const apps = {
                glame: "https://glame.glaggle.ch/",
                gamecenter: "https://glaggle.ch/gamecenter",
                glagini: "https://glaggle.ch/glagini",
                designstudio: "https://glaggle.ch/designstudio",
                codemaker: "https://glaggle.ch/codemaker",
                avideo: "https://glaggle.ch/avideo",
                aimage: "https://glaggle.ch/aimage/",
                quizai: "https://glaggle.ch/quizai"
            
            };
            const url = apps[(params.app || "").toLowerCase()];
            if (url) window.open(url, "_blank");
            break;
        }

        case "theme": {
            const themeName = (params.theme || "").toLowerCase();
            if (typeof THEMES !== 'undefined' && THEMES[themeName]) {
                const btn = document.querySelector(`#theme-grid [data-t="${themeName}"]`);
                applyTheme(themeName, btn);
            }
            break;
        }

        case "music": {
            const sel = document.getElementById('music-select');
            if (!sel) break;
            if ((params.state || "").toLowerCase() === "aus") {
                sel.value = "";
                handleMusicChange(sel);
            } else {
                if (!sel.value && sel.options.length > 1) sel.selectedIndex = 1;
                handleMusicChange(sel);
            }
            break;
        }

        case "scroll_top":
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;

        case "open_chat": {
            const lastAiText = document.getElementById('ai-text-full')?.innerText
                              || document.getElementById('ai-text')?.innerText
                              || "";
            openAiChat(lastAiText);
            break;
        }

        case "smart_mouse":
            if ((params.state || "").toLowerCase() === "aus") {
                disableSmartMouse();
            } else {
                enableSmartMouse();
            }
            break;

        case "open_menu":
            toggleMenu();
            break;

        case "image_search": {
            const query = params.query || "";
            if (!query) break;
            closeVoiceAssistant();
            document.getElementById('glaggleQuery').value = query;
            glaggleSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                document.getElementById('nav-img')?.click();
            }, 1500);
            break;
        }

        case "wiki_search": {
            const query = params.query || "";
            if (!query) break;
            closeVoiceAssistant();
            document.getElementById('glaggleQuery').value = query;
            glaggleSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                document.getElementById('nav-wiki')?.click();
            }, 1500);
            break;
        }

        case "background_random": {
            const randomIndex = Math.floor(Math.random() * spotlightImages.length);
            stopBgRotation();
            setBackgroundImage(spotlightImages[randomIndex]);
            localStorage.setItem('glaggle-bg-mode', 'fixed');
            localStorage.setItem('glaggle-bg-fixed', randomIndex);
            break;
        }

        // WETTER (ersetzt den alten case "wetter")
        case "wetter": {
            const city = params.city || "";
            fetchRealWeather(city);
            scrollToWidget(800);
            break;
        }

        case "clipboard": {
            const target = (params.target || "search").toLowerCase();
            let textToCopy = target === "response"
                ? lastVoiceReply
                : (document.getElementById('glaggleQuery')?.value || "");

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).catch(() => {
                    // Fallback für ältere Browser
                    const ta = document.createElement('textarea');
                    ta.value = textToCopy;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                });
            }
            break;
        }

        case "language": {
            const langMap = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' };
            const lang = (params.lang || 'de').toLowerCase();
            currentVoiceLang = langMap[lang] || 'de-DE';
            localStorage.setItem('glaggle-voice-lang', currentVoiceLang);
            // UI updaten
            restoreVoiceSettings();
            break;
        }

        case "background_off":
            setBgMode('none');
            break;

        case "volume": {
            const volSlider = document.getElementById('music-vol');
            if (!volSlider) break;
            let current = parseInt(volSlider.value) || 0;
            const step = 20;
            current = (params.direction || "").toLowerCase() === "runter"
                ? Math.max(0, current - step)
                : Math.min(100, current + step);
            volSlider.value = current;
            volSlider.dispatchEvent(new Event('input'));
            break;
        }

        case "repeat":
            if (lastVoiceReply) {
                document.getElementById('voice-response').innerText = lastVoiceReply;
                document.getElementById('voice-response').style.display = 'block';
                speakResponse(lastVoiceReply);
            }
            break;

        case "help": {
            const overlay = document.getElementById('glaggle-welcome-overlay');
            currentWelcomeSlide = 1;
            showSlide(1);
            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.add('show'), 50);
            closeVoiceAssistant();
            break;
        }

        case "login":
            window.location.href = "login/index.html";
            break;

        case "register":
            window.location.href = "account/index.html";
            break;

        case "close_assistant":
            closeVoiceAssistant();
            break;

        case "none":
        default:
            break;
    }
}

function openVoiceFeaturesPopup() {
    let overlay = document.getElementById('voice-features-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'voice-features-overlay';
        overlay.style.cssText = `
            display:flex; position:fixed; inset:0;
            background:rgba(0,0,0,0.65);
            backdrop-filter:blur(6px);
            z-index:9500;
            align-items:center; justify-content:center;
            opacity:0; transition:opacity 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="
                background: rgba(20,20,30,0.96);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(112,196,247,0.3);
                border-radius: 24px;
                width: min(400px, 90vw);
                max-height: 80vh;
                overflow-y:auto;
                padding: 28px 24px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                color:#eee;
                text-align:left;
            ">
                <div style="text-align:center; margin-bottom:16px;">
                    <span style="font-size:2.2rem;">✨</span>
                    <h2 style="color:#70C4F7; font-size:1.3rem; margin-top:8px;">Was kann Glaggle Assistant?</h2>
                </div>
                <ul style="list-style:none; display:flex; flex-direction:column; gap:12px; padding:0; margin:0 0 20px 0;">
                    <li style="display:flex; gap:10px;"><span>⏱️</span><span>Timer stellen — "Stell einen Timer auf 5 Minuten"</span></li>
                    <li style="display:flex; gap:10px;"><span>🔍</span><span>Suchen — "Suche nach ..."</span></li>
                    <li style="display:flex; gap:10px;"><span>☁️</span><span>Wetter — "Wie ist das Wetter in Zürich"</span></li>
                    <li style="display:flex; gap:10px;"><span>🧮</span><span>Rechnen — "Was ist 24 mal 7"</span></li>
                    <li style="display:flex; gap:10px;"><span>🎵</span><span>Musik steuern — "Mach die Musik an"</span></li>
                    <li style="display:flex; gap:10px;"><span>🎨</span><span>Design wechseln — "Wechsle zu dunklem Theme"</span></li>
                    <li style="display:flex; gap:10px;"><span>🖼️</span><span>Bilder / Wikipedia — "Zeig mir Bilder von ..."</span></li>
                    <li style="display:flex; gap:10px;">♾️<span></span><span>Und viel mehr...</span></li>
                </ul>
                <button id="voice-features-close-btn" style="
                    width:100%; background: linear-gradient(135deg, #70C4F7, #2E94D1);
                    color:white; border:none; border-radius:50px;
                    padding:12px; font-weight:bold; font-size:0.95rem;
                    cursor:pointer; box-shadow:0 5px 20px rgba(112,196,247,0.3);
                ">Los geht's!</button>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#voice-features-close-btn').onclick = closeVoiceFeaturesPopup;
        overlay.onclick = (e) => { if (e.target === overlay) closeVoiceFeaturesPopup(); };
    }
    overlay.style.display = 'flex';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

function closeVoiceFeaturesPopup() {
    const overlay = document.getElementById('voice-features-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        startListening(); // danach direkt zuhören, wie ursprünglich geplant
    }, 300);
}

/* ===== SCHNELLBEFEHLE (Chips) ===== */
function triggerChip(command) {
    document.getElementById('voice-transcript').style.display = 'block';
    document.getElementById('voice-transcript').innerText = '🗣️ ' + command;
    document.getElementById('voice-response').style.display = 'block';
    document.getElementById('voice-response').innerText = '...';
    askGroqVoice(command);
}

function focusSearchFromVoice() {
    closeVoiceAssistant();
    const input = document.getElementById('glaggleQuery');
    if (input) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => input.focus(), 400);
    }
}

/* ===== STIMME EINSTELLEN ===== */
function setVoiceSetting(type, val, btn) {
    if (type === 'speed') {
        voiceSpeed = parseFloat(val);
        localStorage.setItem('glaggle-voice-speed', val);
    } else if (type === 'gender') {
        voiceGender = val;
        localStorage.setItem('glaggle-voice-gender', val);
    } else if (type === 'lang') {
        currentVoiceLang = val;
        localStorage.setItem('glaggle-voice-lang', val);
    }
    // Aktiven Button markieren
    document.querySelectorAll(`.voice-setting-btn[data-type="${type}"]`).forEach(b => {
        b.style.background = 'none';
        b.style.borderColor = 'rgba(112,196,247,0.25)';
        b.style.color = '#888';
    });
    btn.style.background = 'rgba(112,196,247,0.2)';
    btn.style.borderColor = '#70C4F7';
    btn.style.color = '#70C4F7';
}

function restoreVoiceSettings() {
    [
        ['speed', voiceSpeed.toString()],
        ['gender', voiceGender],
        ['lang', currentVoiceLang]
    ].forEach(([type, val]) => {
        const btn = document.querySelector(`.voice-setting-btn[data-type="${type}"][data-val="${val}"]`);
        if (btn) setVoiceSetting(type, val, btn);
    });
}

// Beim Start wiederherstellen
window.addEventListener('DOMContentLoaded', () => setTimeout(restoreVoiceSettings, 200));

function speakResponse(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = currentVoiceLang;
    utter.rate = voiceSpeed;
    utter.pitch = 0.6;
    utter.volume = 1;

    function chooseVoice() {
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = currentVoiceLang.split('-')[0];
        let chosen = null;

        if (voiceGender === 'male') {
            chosen = voices.find(v => v.lang.startsWith(langPrefix) &&
                (v.name.toLowerCase().includes('male') ||
                 ['Stefan','Markus','Yannick','Thomas','Daniel'].some(n => v.name.includes(n))));
        } else if (voiceGender === 'female') {
            chosen = voices.find(v => v.lang.startsWith(langPrefix) &&
                (v.name.toLowerCase().includes('female') ||
                 ['Anna','Petra','Sabrina','Sarah','Monika','Katja'].some(n => v.name.includes(n))));
        }

        // Fallback: beliebige Stimme in der richtigen Sprache
        if (!chosen) {
            chosen = voices.find(v => v.lang.startsWith(langPrefix));
        }
        if (chosen) utter.voice = chosen;

        utter.onstart = () => setVoiceStatus('🔊 Glaggle spricht...');
        utter.onend = () => {
            setVoiceStatus('Tippe auf das Mikrofon zum Sprechen');
            duckMusic(false);
        };
        utter.onerror = () => duckMusic(false);

        window.speechSynthesis.speak(utter);
    }

    if (window.speechSynthesis.getVoices().length > 0) {
        chooseVoice();
    } else {
        window.speechSynthesis.onvoiceschanged = chooseVoice;
    }
}

function setVoiceStatus(msg) {
    document.getElementById('voice-status').innerText = msg;
}

// Führt den Autoplay-Versuch aus, sobald die Seite geladen ist
window.addEventListener('DOMContentLoaded', () => {
    // Kurze Verzögerung, um sicherzugehen, dass dein 'glaggleAudio'-Objekt bereits existiert
    setTimeout(tryAutoplayMusic, 500); 
});

document.getElementById('voice-text-input').addEventListener('focus', () => {
    if (isListening) stopListening();
});
