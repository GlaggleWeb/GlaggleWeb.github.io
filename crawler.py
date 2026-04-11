import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin

# Verbindung zu Supabase initialisieren
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")
supabase = create_client(url, key)

def crawl():
    # 1. Nächste freie URL aus der Warteschlange holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    
    if not res.data:
        print("Warteschlange leer. Nichts zu tun.")
        return
    
    target_url = res.data[0]['url']
    print(f"--- Crawle jetzt: {target_url} ---")
    
    try:
        # 2. Webseite laden
        headers = {'User-Agent': 'GlaggleBot/1.2 (Pro Version)'}
        r = requests.get(target_url, timeout=10, headers=headers)
        
        if r.status_code != 200:
            print(f"Status Code {r.status_code}. Breche ab.")
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Metadaten extrahieren
        title = (soup.title.string or "Kein Titel")[:150].strip()
        
        meta_desc = soup.find("meta", attrs={"name": "description"})
        description = (meta_desc["content"][:250] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

        # In den Such-Index speichern (Überschreiben falls vorhanden)
        supabase.table("search_index").upsert(
            {"url": target_url, "title": title, "description": description},
            on_conflict='url'
        ).execute()
        print(f"Index Update: {title}")

        # 4. Links sammeln und Duplikate filtern
        links = soup.find_all('a', href=True)
        unique_links = {} # Dictionary verhindert Duplikate in der Liste
        
        for l in links:
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            
            # Filter: Nur HTTP, kein Wikipedia (zu groß), max 255 Zeichen
            if full.startswith('http') and "wikipedia.org" not in full and len(full) < 255:
                unique_links[full] = {"url": full, "status": "todo"}
        
        # Umwandeln in Liste für Supabase
        new_urls = list(unique_links.values())
        
        if new_urls:
            # Upsert in die Warteschlange (ignoriert Links, die schon drin sind)
            print(f"Speichere {len(new_urls[:40])} neue Links...")
            supabase.table("crawl_queue").upsert(new_urls[:40], on_conflict='url').execute()
            
        # 5. Erfolgreich abschließen
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"DONE: {target_url} erfolgreich verarbeitet.")

    except Exception as e:
        print(f"FEHLER bei {target_url}: {e}")
        # Bei Fehler auf 'error' setzen, damit der Crawler nicht hängen bleibt
        supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()

# Führt 20 Webseiten hintereinander aus
for i in range(20):
    print(f"\nDurchlauf {i+1}/20")
    crawl()
