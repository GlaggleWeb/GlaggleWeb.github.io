import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin
import sys

# Verbindung zu Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")

print(f"DEBUG: Versuche Verbindung mit URL: {url[:15]}...")

try:
    supabase = create_client(url, key)
    print("DEBUG: Supabase-Client erfolgreich erstellt.")
except Exception as e:
    print(f"KRITISCHER FEHLER beim Client-Setup: {e}")
    sys.exit(1)

def crawl():
    # 1. URL holen
    try:
        res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
        if not res.data:
            print("INFO: Warteschlange leer.")
            return
        target_url = res.data[0]['url']
        print(f"START: Verarbeite URL: {target_url}")
    except Exception as e:
        print(f"FEHLER beim Abrufen der Warteschlange: {e}")
        return
    
    try:
        # 2. Seite laden
        headers = {'User-Agent': 'GlaggleBot/1.0'}
        r = requests.get(target_url, timeout=10, headers=headers)
        
        if r.status_code != 200:
            print(f"WARNUNG: Status {r.status_code} für {target_url}")
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
            return

        soup = BeautifulSoup(r.text, 'html.parser')
        title = (soup.title.string or "Kein Titel")[:150].strip()
        
        # 3. In search_index speichern
        print(f"DEBUG: Versuche in search_index zu schreiben: {title}")
        try:
            # Wir speichern hier nur URL und Titel, um Fehler durch fehlende Spalten zu minimieren
            supabase.table("search_index").upsert({"url": target_url, "title": title}).execute()
            print("ERFOLG: In search_index gespeichert.")
        except Exception as e:
            print(f"FEHLER beim Schreiben in search_index (Check deine Spalten!): {e}")
            # Wir machen trotzdem weiter mit den Links
        
        # 4. Links finden
        links = soup.find_all('a', href=True)
        new_urls = []
        for l in links:
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            if full.startswith('http') and "wikipedia.org" not in full:
                new_urls.append({"url": full, "status": "todo"})
        
        if new_urls:
            print(f"DEBUG: Versuche {len(new_urls[:20])} neue Links zu speichern...")
            try:
                supabase.table("crawl_queue").upsert(new_urls[:20], on_conflict='url').execute()
                print("ERFOLG: Neue Links in Warteschlange ergänzt.")
            except Exception as e:
                print(f"FEHLER beim Speichern neuer Links: {e}")
            
        # 5. Status auf 'done' setzen
        print(f"DEBUG: Markiere {target_url} als 'done'...")
        supabase.table("crawl_queue").update({"status": "done"}).eq("url", target_url).execute()
        print(f"KOMPLETT-ERFOLG: {target_url} ist fertig.")

    except Exception as e:
        print(f"HAUPT-FEHLER bei {target_url}: {e}")
        # Letzter Rettungsversuch: Status auf Error setzen
        try:
            supabase.table("crawl_queue").update({"status": "error"}).eq("url", target_url).execute()
        except Exception as e2:
            print(f"DOPPELTER FEHLER: Konnte Status nicht mal auf 'error' setzen: {e2}")

# 10 mal ausführen
for i in range(10):
    print(f"\n--- Durchlauf {i+1} ---")
    crawl()
