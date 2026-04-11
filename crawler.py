import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin, urlparse

# Verbindung zu Supabase initialisieren
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")
supabase = create_client(url, key)

def crawl():
    # 1. Nächste freie URL aus der Warteschlange holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    
    if not res.data:
        print("Warteschlange leer.")
        return
    
    target_url = res.data[0]['url']
    print(f"\n--- Crawle jetzt: {target_url} ---")
    
    try:
        # 2. Webseite laden
        headers = {'User-Agent': 'GlaggleBot/1.3 (Root-Only Pro)'}
        r = requests.get(target_url, timeout=10, headers=headers)
        
        if r.status_code != 200:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Metadaten extrahieren
        title = (soup.title.string or "Kein Titel")[:150].strip()
        meta_desc = soup.find("meta", attrs={"name": "description"})
        description = (meta_desc["content"][:250] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

        # In den Such-Index speichern
        supabase.table("search_index").upsert(
            {"url": target_url, "title": title, "description": description},
            on_conflict='url'
        ).execute()

        # 4. Links sammeln und EXTREM filtern (Nur Root-URLs)
        links = soup.find_all('a', href=True)
        unique_links = {}
        
        for l in links:
            # URL normalisieren und aufräumen
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            
            # Parsen, um den Pfad zu prüfen
            parsed = urlparse(full)
            # path ist "/" oder leer bei Root-Domains (z.B. https://google.de)
            path = parsed.path.strip("/")
            
            # FILTER: 
            # 1. Muss mit http starten
            # 2. Pfad muss leer sein (kein einziger Schrägstrich nach der Domain)
            # 3. Kein Wikipedia
            if full.startswith('http') and not path and "wikipedia.org" not in full:
                unique_links[full] = {"url": full, "status": "todo"}
        
        new_urls = list(unique_links.values())
        
        if new_urls:
            print(f"Gefundene Root-Domains: {len(new_urls[:20])}")
            supabase.table("crawl_queue").upsert(new_urls[:20], on_conflict='url').execute()
            
        # 5. Erfolgreich abschließen
        # 5. Aus der Warteschlange LÖSCHEN statt auf 'done' setzen
        # Das hält deine To-Do-Liste extrem sauber!
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()
        print(f"ERFOLG: {target_url} indiziert und aus Queue entfernt.")
        
    except Exception as e:
        print(f"FEHLER: {e}")
        supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()

# Durchlauf-Schleife
for i in range(80):
    crawl()
