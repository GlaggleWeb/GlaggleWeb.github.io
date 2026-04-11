import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Verbindung
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def get_current_size():
    # Ruft deine neu erstellte SQL-Funktion auf
    res = supabase.rpc('get_db_size_mb').execute()
    return res.data if res.data else 0

def crawl_and_save(target_url):
    # Erst prüfen: Haben wir noch Platz?
    current_size = get_current_size()
    print(f"Aktuelle DB Größe: {current_size:.2f} MB")

    if current_size >= 350:
        print("!!! LIMIT ERREICHT (350MB) !!! Crawler stoppt zur Sicherheit.")
        return False # Signal zum Abbrechen

    try:
        headers = {'User-Agent': 'GlaggleBot/1.0'}
        res = requests.get(target_url, timeout=10, headers=headers)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            t = soup.title.string if soup.title else "Kein Titel"
            meta = soup.find('meta', attrs={'name': 'description'})
            d = meta['content'] if meta else "Keine Beschreibung verfügbar."

            # Speichern
            supabase.table("search_index").upsert({
                "url": target_url,
                "title": t[:150],
                "description": d[:250]
            }).execute()
            print(f"Erfolg: {target_url}")
            return True
    except Exception as e:
        print(f"Fehler: {e}")
        return True

# Start-Liste
urls = ["https://wikipedia.org", "https://t3n.de", "https://glaggle.ch"]
for link in urls:
    if not crawl_and_save(link):
        break # Stoppt die ganze Schleife, wenn 400MB erreicht sind
