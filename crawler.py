import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin, urlparse

# Verbindung zu Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")
supabase = create_client(url, key)

def crawl():
    # 1. Nächste freie URL holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    
    if not res.data:
        print("Warteschlange leer. Warte auf neuen Input...")
        return
    
    target_url = res.data[0]['url']
    print(f"\n--- Crawle jetzt: {target_url} ---")
    
    try:
        # 2. Webseite laden
        headers = {'User-Agent': 'GlaggleBot/1.5 (Domain-Splitter Pro)'}
        r = requests.get(target_url, timeout=10, headers=headers)
        
        if r.status_code != 200:
            # Bei Fehlern löschen, damit die Queue nicht verstopft
            supabase.table("crawl_queue").delete().eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Metadaten (Nur in den Index, wenn nicht Wikipedia)
        if "wiki" not in target_url:
            title = (soup.title.string or "Kein Titel")[:150].strip()
            meta_desc = soup.find("meta", attrs={"name": "description"})
            description = (meta_desc["content"][:250] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

            supabase.table("search_index").upsert(
                {"url": target_url, "title": title, "description": description},
                on_conflict='url'
            ).execute()
            print(f"Index Update: {title}")

        # 4. Links sammeln & SPLITTEN
        links = soup.find_all('a', href=True)
        unique_domains = {}
        
        for l in links:
            # Voller Link für die Analyse
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            parsed = urlparse(full)
            
            if parsed.scheme and parsed.netloc:
                # Hier passiert die Magie: Wir nehmen NUR scheme + netloc
                root_url = f"{parsed.scheme}://{parsed.netloc}".lower()
                
                # Filter: Kein Wiki im Namen, keine Werbung, keine ewig langen URLs
                if "wiki" not in root_url and "adservice" not in root_url and len(root_url) < 80:
                    unique_domains[root_url] = {"url": root_url, "status": "todo"}
        
        # 5. Neue Domains in die Warteschlange werfen
        new_urls = list(unique_domains.values())
        if new_urls:
            print(f"Gefundene neue Domains: {len(new_urls[:50])}")
            # Upsert ignoriert Domains, die schon in der Liste sind
            supabase.table("crawl_queue").upsert(new_urls[:50], on_conflict='url').execute()
            
        # 6. Aktuelle URL aus der Warteschlange löschen (Job erledigt)
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()
        print(f"ERFOLG: {target_url} verarbeitet.")

    except Exception as e:
        print(f"FEHLER bei {target_url}: {e}")
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()

# Verarbeitet 80 Seiten pro GitHub-Lauf
for i in range(80):
    crawl()
