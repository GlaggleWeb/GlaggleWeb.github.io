from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from search_engine import SearchEngine
import os

app = Flask(__name__)
CORS(app)

engine = SearchEngine()

@app.before_request
def load_engine():
    """Lädt den Index beim Start"""
    if not hasattr(app, 'engine_loaded'):
        engine.load_index()
        app.engine_loaded = True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search', methods=['GET', 'POST'])
def search():
    query = request.args.get('q', '').strip() or request.json.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify({'error': 'Suchbegriff zu kurz', 'results': []})
    
    results = engine.search(query, limit=20)
    return jsonify({'query': query, 'results': results, 'count': len(results)})

@app.route('/api/index', methods=['POST'])
def start_crawling():
    """Startet das Crawling einer Website"""
    data = request.json
    url = data.get('url', '').strip()
    max_depth = data.get('depth', 2)
    
    if not url:
        return jsonify({'error': 'URL erforderlich'}), 400
    
    try:
        engine.crawl_page(url, max_depth=max_depth)
        engine.save_index()
        return jsonify({'success': True, 'message': f'Indexiert: {len(engine.crawled_urls)} Seiten'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats')
def stats():
    """Zeigt Statistiken des Index"""
    return jsonify({
        'indexed_urls': len(engine.urls_data),
        'indexed_words': len(engine.index),
        'crawled_urls': len(engine.crawled_urls)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
