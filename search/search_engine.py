import os
import json
import re
from urllib.parse import urljoin, urlparse
from collections import defaultdict
import requests
from bs4 import BeautifulSoup
import hashlib
from datetime import datetime

class SearchEngine:
    def __init__(self, index_file='index.json'):
        self.index_file = index_file
        self.index = defaultdict(lambda: {'urls': [], 'frequency': 0, 'score': 0})
        self.urls_data = {}
        self.crawled_urls = set()
        self.max_pages = 1000
        
    def load_index(self):
        """Lädt den bestehenden Index"""
        if os.path.exists(self.index_file):
            with open(self.index_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.index = defaultdict(lambda: {'urls': [], 'frequency': 0, 'score': 0}, data.get('index', {}))
                self.urls_data = data.get('urls', {})
                self.crawled_urls = set(data.get('crawled', []))
    
    def save_index(self):
        """Speichert den Index in eine JSON-Datei"""
        data = {
            'index': dict(self.index),
            'urls': self.urls_data,
            'crawled': list(self.crawled_urls),
            'timestamp': datetime.now().isoformat()
        }
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def normalize_word(self, word):
        """Normalisiert Wörter für besseres Indexing"""
        word = word.lower()
        word = re.sub(r'[^\w]', '', word)
        return word if len(word) > 2 else None
    
    def crawl_page(self, url, depth=0, max_depth=2):
        """Crawlt eine Website und indexiert den Inhalt"""
        if depth > max_depth or len(self.crawled_urls) >= self.max_pages:
            return
        
        if url in self.crawled_urls:
            return
        
        try:
            print(f"Crawling: {url} (Depth: {depth})")
            headers = {'User-Agent': 'GlaggleBot/1.0'}
            response = requests.get(url, timeout=10, headers=headers)
            response.encoding = 'utf-8'
            
            if response.status_code != 200:
                return
            
            self.crawled_urls.add(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Entfernt Script und Style Tags
            for tag in soup(['script', 'style']):
                tag.decompose()
            
            # Extrahiert Titel und Beschreibung
            title = soup.title.string if soup.title else "Keine Titel"
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            description = meta_desc['content'] if meta_desc else soup.get_text()[:150]
            
            # Extrahiert Text
            text = soup.get_text()
            words = text.split()
            
            # Indexing
            url_hash = hashlib.md5(url.encode()).hexdigest()
            self.urls_data[url_hash] = {
                'url': url,
                'title': title,
                'description': description[:200],
                'timestamp': datetime.now().isoformat()
            }
            
            word_freq = defaultdict(int)
            for word in words:
                normalized = self.normalize_word(word)
                if normalized:
                    word_freq[normalized] += 1
            
            # Fügt zum Index hinzu
            for word, freq in word_freq.items():
                if url_hash not in self.index[word]['urls']:
                    self.index[word]['urls'].append(url_hash)
                self.index[word]['frequency'] += freq
            
            # Findet Links für weiteres Crawling
            base_url = urlparse(url).netloc
            for link in soup.find_all('a', href=True):
                next_url = urljoin(url, link['href'])
                next_domain = urlparse(next_url).netloc
                
                # Crawlt nur interne Links
                if next_domain == base_url and next_url not in self.crawled_urls:
                    self.crawl_page(next_url, depth + 1, max_depth)
        
        except Exception as e:
            print(f"Fehler beim Crawlen von {url}: {e}")
    
    def search(self, query, limit=10):
        """Sucht nach Ergebnissen basierend auf der Abfrage"""
        query_words = [self.normalize_word(w) for w in query.split()]
        query_words = [w for w in query_words if w]
        
        results = defaultdict(int)
        
        for word in query_words:
            if word in self.index:
                for url_hash in self.index[word]['urls']:
                    results[url_hash] += self.index[word]['frequency']
        
        # Sortiert nach Relevanz
        sorted_results = sorted(results.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        search_results = []
        for url_hash, score in sorted_results:
            if url_hash in self.urls_data:
                result = self.urls_data[url_hash].copy()
                result['score'] = score
                result['hash'] = url_hash
                search_results.append(result)
        
        return search_results

# Initialisierung
engine = SearchEngine()

if __name__ == '__main__':
    # Beispiel: Crawlt Wikipedia
    engine.load_index()
    engine.crawl_page('https://en.wikipedia.org/wiki/Artificial_intelligence', max_depth=1)
    engine.save_index()
    
    # Sucht nach "machine learning"
    results = engine.search('machine learning')
    for result in results:
        print(f"\n{result['title']}")
        print(f"{result['description']}")
        print(f"{result['url']}")
