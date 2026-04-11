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
        
     # ... (Schritt 2: Seite laden bleibt gleich)

        # 3. Metadaten extrahieren & Index-Check
        title = (soup.title.string or "Kein Titel")[:150].strip()
        meta_desc = soup.find("meta", attrs={"name": "description"})
        description = (meta_desc["content"][:250] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

        # NEU: Nur in den Index speichern, wenn es NICHT Wikipedia ist
        if "wikipedia.org" not in target_url:
            supabase.table("search_index").upsert(
                {"url": target_url, "title": title, "description": description},
                on_conflict='url'
            ).execute()
            print(f"Index Update: {title}")
        else:
            print("Wikipedia-Quelle erkannt: Scanne nur nach externen Links...")
# 4. Links sammeln, JEDEN Link zulassen, aber beim Speichern splitten
        links = soup.find_all('a', href=True)
        unique_links = {}
        
        for l in links:
            # 1. Den vollen Link bauen (auch mit /pfad/...)
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            
            parsed = urlparse(full)
            
            if parsed.scheme and parsed.netloc:
                # 2. DER SPLITTER: Wir nehmen nur das 'netloc' (z.B. srf.ch oder shop.abs.ch)
                # Wir werfen alles nach dem / weg.
                domain_only = f"{parsed.scheme}://{parsed.netloc}".lower()
                
                # 3. FILTER (nur gegen Müll und Wikis)
                is_wiki = "wiki" in domain_only
                if not is_wiki and len(domain_only) < 100:
                    unique_links[domain_only] = {"url": domain_only, "status": "todo"}
        
        new_urls = list(unique_links.values())
        
        if new_urls:
            # Wir speichern die ersten 40 gefundenen (gesplitteten) Domains
            print(f"Splitter hat {len(new_urls[:40])} Domains extrahiert.")
            supabase.table("crawl_queue").upsert(new_urls[:40], on_conflict='url').execute()
            
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
