import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin

# Verbindung zu Supabase
# Wir nutzen SUPABASE_URL und SUPABASE_KEY1 (dein neues Secret)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")

if not url or not key:
    raise ValueError("Fehler: SUPABASE_URL oder SUPABASE_KEY1 nicht gefunden. Prüfe deine GitHub Secrets!")

supabase = create_client(url, key)

def crawl():
    # 1. Nächste URL holen, die noch auf 'todo' steht
    try:
        res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
        if not res.data:
            print("Warteschlange leer.")
            return
        
        target_url = res.data[0]['url']
    except Exception as e:
        print(f"Fehler beim Abrufen der Queue: {e}")
        return
    
    try:
        # 2. Seite laden
        headers = {'User-Agent': 'GlaggleBot/1.0'}
        r = requests.get(target_url, timeout=10, headers=headers)
        
        if r.status_code != 200:
            print(f"Status {r.status_code} für {target_url}")
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 3. Daten im Such-Index speichern
        title = (soup.title.string or "Kein Titel")[:150].strip()
        # Kurze Beschreibung aus Meta-Tag holen, falls vorhanden
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        desc = (meta_desc['content'] if meta_desc else "")[:250].strip()

        supabase.table("search_index").upsert({
            "url": target_url, 
            "title": title,
            "description": desc
        }).execute()
        
        # 4. Neue Links auf der Seite finden
        links = soup.find_all('a', href=True)
        new_urls = []
        for l in links:
            # URL säubern (keine Anker #, keine Parameter ?)
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            
            # Nur echte Webseiten (http) und kein Wikipedia (um Endlosschleifen zu vermeiden)
            if full.startswith('http') and "wikipedia.org" not in full:
                new_urls.append({"url": full, "status": "todo"})
        
        # Max. 20 neue Links pro Seite speichern, um die DB nicht zu sprengen
        if new_urls:
            supabase.table("crawl_queue").upsert(new_urls[:20], on_conflict='url').execute()
            
        # 5. Aktuelle URL als erledigt markieren
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"Erfolg: {target_url}")

    except Exception as e:
        print(f"Fehler beim Crawlen von {target_url}: {e}")
        # Bei Fehler in der Tabelle vermerken
        try:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
        except:
            pass

# Der Bot verarbeitet pro GitHub-Action-Lauf 10 Seiten nacheinander
for _ in range(10):
    crawl()
