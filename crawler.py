import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin

# Verbindung zu Supabase
SUPA_URL = os.environ.get("SUPABASE_URL")
SUPA_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPA_URL, SUPA_KEY)

def crawl():
    # 1. Nächste URL holen
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    if not res.data:
        print("Warteschlange leer.")
        return
    
    target_url = res.data[0]['url']
    
    try:
        # 2. Seite laden
        headers = {'User-Agent': 'GlaggleBot/1.0'}
        r = requests.get(target_url, timeout=10, headers=headers)
        if r.status_code != 200:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Speichern
        title = (soup.title.string or "Kein Titel")[:150]
        supabase.table("search_index").upsert({"url": target_url, "title": title}).execute()
        
        # 4. Links finden
        links = soup.find_all('a', href=True)
        new_urls = []
        for l in links:
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            if full.startswith('http') and "wikipedia.org" not in full:
                new_urls.append({"url": full, "status": "todo"})
        
        if new_urls:
            supabase.table("crawl_queue").upsert(new_urls[:20], on_conflict='url').execute()
            
        # 5. Fertig markieren
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"Erfolg: {target_url}")

    except Exception as e:
        print(f"Fehler: {e}")
        supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()

# 10 mal ausführen
for _ in range(10):
    crawl()
