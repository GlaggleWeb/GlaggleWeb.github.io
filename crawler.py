import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import urljoin, urlparse

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY1")
supabase = create_client(url, key)

def crawl():
    # 1. Hol mir die nächste URL
    res = supabase.table("crawl_queue").select("url").eq("status", "todo").limit(1).execute()
    if not res.data: return
    
    target_url = res.data[0]['url']
    print(f"Crawl: {target_url}")
    
    try:
        headers = {'User-Agent': 'GlaggleBot/4.0'}
        r = requests.get(target_url, timeout=5, headers=headers)
        
        # WICHTIG: Sofort aus der Queue löschen
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()

        if r.status_code != 200: return

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 2. DER ROOT-CHECK: Wir speichern NUR, wenn es die Startseite ist
        # Das verhindert falsche Beschreibungen von Unterseiten
        parsed_target = urlparse(target_url)
        is_root = parsed_target.path == "" or parsed_target.path == "/"
        
        if is_root and "wiki" not in target_url.lower():
            title = (soup.title.string or "Kein Titel")[:100].strip()
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            description = (meta_desc["content"][:200] if meta_desc and meta_desc.get("content") else "Keine Beschreibung verfügbar")

            supabase.table("search_index").upsert(
                {"url": target_url, "title": title, "description": description},
                on_conflict='url'
            ).execute()

        # 3. Links sammeln, splitten und ALLES zulassen (.ch, .com, .net, etc.)
        links = soup.find_all('a', href=True)
        unique_domains = {}
        
        for l in links:
            full = urljoin(target_url, l['href']).split('#')[0].split('?')[0].rstrip('/')
            parsed = urlparse(full)
            
            if parsed.scheme and parsed.netloc:
                # SPLITTER: Schneidet alles nach der Domain weg
                # Macht aus: https://beispiel.com/pfad/seite -> https://beispiel.com
                domain_only = f"{parsed.scheme}://{parsed.netloc}".lower()
                
                # Wir filtern nur noch extremen Müll (Werbung/Wikis) aus
                if "wiki" not in domain_only and len(domain_only) < 70:
                    unique_domains[domain_only] = {"url": domain_only, "status": "todo"}
        
        if unique_domains:
            # Wir speichern die neuen Root-Domains in die Queue
            supabase.table("crawl_queue").upsert(list(unique_domains.values())[:60], on_conflict='url').execute()

    except Exception as e:
        print(f"Fehler: {e}")
        supabase.table("crawl_queue").delete().eq("url", target_url).execute()

# 100 Seiten pro Lauf
for i in range(200):
    crawl()
