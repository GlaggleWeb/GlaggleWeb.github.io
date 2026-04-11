import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin

# Verbindung zu Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def get_db_size():
    # Prüft die Größe, damit wir unter 400MB bleiben
    res = supabase.rpc('get_db_size_mb').execute()
    return res.data if res.data else 0

def get_next_url():
    # Holt die nächste URL, die noch auf 'todo' steht
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    return res.data[0]['url'] if res.data else None

def crawl(target_url):
    # Notbremse bei 400MB
    if get_db_size() > 400:
        print("Limit erreicht. Stoppe Crawler.")
        return False

    try:
        res = requests.get(target_url, timeout=5, headers={'User-Agent': 'GlaggleBot/1.0'})
        if res.status_code != 200:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return True
        
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # 1. Daten für die Suchmaschine speichern
        title = (soup.title.string or "Kein Titel")[:150]
        meta = soup.find('meta', attrs={'name': 'description'})
        desc = (meta['content'] if meta else "Keine Beschreibung.")[:250]
        
        supabase.table("search_index").upsert({
            "url": target_url, 
            "title": title, 
            "description": desc
        }).execute()
        
        # 2. Neue Links finden
        links = soup.find_all('a', href=True)
        new_urls = []
        for l in links:
            full_url = urljoin(target_url, l['href']).split('#')[0].rstrip('/')
            
            # WICHTIG: Prüfen, dass es kein Wikipedia ist
            if full_url.startswith('http') and "wikipedia.org" not in full_url:
                new_urls.append({"url": full_url, "status": "todo"})
        
        # Neue Links in die Queue (max 30 pro Seite, um DB zu schonen)
        if new_urls:
            supabase.table("crawl_queue").upsert(new_urls[:30], on_conflict='url').execute()

        # 3. Als erledigt markieren
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"Erfolgreich gecrawlt: {target_url}")
        return True

    except Exception as e:
        print(f"Fehler bei {target_url}: {e}")
        supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
        return True

# Der Bot arbeitet pro GitHub-Lauf 10 Seiten ab
for _ in range(10):
    next_url = get_next_url()
    if next_url:
        if not crawl(next_url):
            break
    else:
        print("Keine URLs mehr in der Warteschlange!")
        break
