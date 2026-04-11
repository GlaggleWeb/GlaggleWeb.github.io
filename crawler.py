import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin

# Verbindung zu Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")
supabase = create_client(url, key)

def crawl():
    # 1. Nächste URL holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    if not res.data:
        print("Warteschlange leer.")
        return
    
    target_url = res.data[0]['url']
    print(f"Crawle jetzt: {target_url}")
    
    try:
        # 2. Seite laden
        headers = {'User-Agent': 'GlaggleBot/1.1'}
        r = requests.get(target_url, timeout=10, headers=headers)
        if r.status_code != 200:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Titel und Description extrahieren
        title = (soup.title.string or "Kein Titel")[:150].strip()
        
        # Description suchen (meta name="description")
        meta_desc = soup.find("meta", attrs={"name": "description"})
        description = (meta_desc["content"][:250] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

        # In den Index speichern (Upsert überschreibt, falls URL schon da)
        supabase.table("search_index").upsert({
            "url": target_url, 
            "title": title, 
            "description": description
        }).execute()
        
        # 4. Neue Links finden
        links = soup.find_all('a', href=True)
        new_urls = []
        for l in links:
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            # Filter: Nur http, kein Wikipedia, keine extrem langen URLs
            if full.startswith('http') and "wikipedia.org" not in full and len(full) < 255:
                new_urls.append({"url": full, "status": "todo"})
        
        # Neue URLs speichern (die Datenbank ignoriert Duplikate durch den Unique Constraint)
        if new_urls:
            # Wir nehmen die ersten 30 Links der Seite
            supabase.table("crawl_queue").upsert(new_urls[:30], on_conflict='url').execute()
            
        # 5. Fertig markieren
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"Erfolg: {target_url} indiziert.")

    except Exception as e:
        print(f"Fehler bei {target_url}: {e}")
        supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()

# Erhöhen wir die Schlagzahl: 20 Seiten pro Durchlauf
for _ in range(20):
    crawl()
