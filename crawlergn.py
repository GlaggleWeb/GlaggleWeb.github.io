import os
import json
import requests
from huggingface_hub import HfApi

# --- KONFIGURATION ---
DATASET_REPO_ID = "GlaggleWeb/glenerationwissen"  # <-- HIER ANPASSEN!
FILE_NAME = "wissen.txt"

def fetch_wiki_data():
    """Holt einen zufälligen Wikipedia-Artikel."""
    url = "https://de.wikipedia.org/api/rest_v1/page/random/summary"
    headers = {"User-Agent": "KI-WissensBot/1.0 (kontakt@deine-email.de)"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            title = data.get("title", "Unbekannt")
            extract = data.get("extract", "")
            # Wir formatieren den Text für die TXT-Datei
            return f"THEMA: {title}\nINHALT: {extract}\n\n--------------------------\n\n"
    except Exception as e:
        print(f"Fehler beim Abruf: {e}")
    return None

def upload_to_hf(file_name):
    """Lädt die lokale Datei zu Hugging Face hoch."""
    token = os.getenv("HF_TOKEN")
    if not token:
        print("Fehler: HF_TOKEN wurde nicht gefunden!")
        return

    api = HfApi()
    try:
        api.upload_file(
            path_or_fileobj=file_name,
            path_in_repo=file_name,
            repo_id=DATASET_REPO_ID,
            repo_type="dataset",
            token=token,
            commit_message="Automatisches Update der Wissensbasis"
        )
        print(f"Erfolg: {file_name} wurde auf Hugging Face aktualisiert.")
    except Exception as e:
        print(f"Upload fehlgeschlagen: {e}")

def main():
    print("Starte Datensammlung...")
    new_content = fetch_wiki_data()
    
    if new_content:
        # Datei lokal anhängen
        with open(FILE_NAME, "a", encoding="utf-8") as f:
            f.write(new_content)
        print("Neuer Eintrag lokal gespeichert.")
        
        # Zu Hugging Face hochladen
        upload_to_hf(FILE_NAME)
    else:
        print("Keine Daten erhalten.")

if __name__ == "__main__":
    main()
