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
    # 1. Nächste URL aus der Warteschlange holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    
    if not res.data:
        print("Warteschlange leer.")
        return
    
    target_url = res.data[0]['url']
    print(f"\n--- Versuche: {target_url} ---")
    
    try:
        # 2. Seite laden (mit Timeout, damit er nicht hängen bleibt)
        headers = {'User-Agent': 'GlaggleBot/2.0 (Domain-Only)'}
        r = requests.get(target_url, timeout=5, headers=headers)
        
        # Unabhängig vom Erfolg: Wir löschen die URL aus der Queue, 
        # damit sie den Weg für den nächsten Versuch nicht blockiert.
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()

        if r.status_code != 200:
            print(f"Status {r.status_code} - Überspringe.")
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Indexierung (Nur wenn kein Wiki im Link ist)
        if "wiki" not in target_url.lower():
            title = (soup.title.string or "Kein Titel")[:100].strip()
            meta_desc = soup.find("meta", attrs={"name": "description"})
            description = (meta_desc["content"][:200] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

            supabase.table("search_index").upsert(
                {"url": target_url, "title": title, "description": description},
                on_conflict='url'
            ).execute()
            print(f"Index Update: {title}")

        # 4. Links sammeln & ZERSCHNEIDEN (Splitter)
        links = soup.find_all('a', href=True)
        unique_domains = {}
        
        for l in links:
            # Baue vollen Link
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            parsed = urlparse(full)
            
            if parsed.scheme and parsed.netloc:
                # DER CUTTER: Mache aus abs.ch/xyz -> https://abs.ch
                domain_only = f"{parsed.scheme}://{parsed.netloc}".lower()
                
                # FILTER: Kein Wiki, kein Schrott, Länge ok
                if "wiki" not in domain_only and len(domain_only) < 70:
                    unique_domains[domain_only] = {"url": domain_only, "status": "todo"}
        
        # 5. Neue Domains zurück in die Queue (Massen-Upsert)
        new_list = list(unique_domains.values())
        if new_list:
            print(f"Gefunden: {len(new_list[:50])} neue Domains.")
            supabase.table("crawl_queue").upsert(new_list[:50], on_conflict='url').execute()

    except Exception as e:
        print(f"Fehler: {e}")
        # Auch bei Crash: URL aus Queue entfernen
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()

# Erhöhe auf 100 Durchläufe pro Start
for i in range(100):
    crawl()
