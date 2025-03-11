import os
import pandas as pd
import time
from datetime import datetime
import schedule
import logging
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from mongodb import save_categories_to_db, save_streams_to_db

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("TwitchScraper")

# Chemins pour le stockage des données
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# URLs Twitch
DIRECTORY_URL = "https://www.twitch.tv/directory?sort=VIEWER_COUNT"
BASE_URL = "https://www.twitch.tv/directory/category/{category}?sort=VIEWER_COUNT"

# Configuration WebDriver
def get_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# Fonctions auxiliaires
def convert_viewers_count(viewers_text):
    """Convertit le nombre de spectateurs du format Twitch en entier."""
    if not viewers_text:
        return 0
        
    viewers_text = viewers_text.replace(" viewers", "").replace(",", "").strip()
    
    if "K" in viewers_text:
        return int(float(viewers_text.replace("K", "")) * 1000)
    
    if "." in viewers_text:
        return int(float(viewers_text) * 1000)
    
    return int(viewers_text) if viewers_text.isdigit() else 0

def scroll_to_load_more(driver, max_scrolls=10):
    """Défile pour charger plus de contenu."""
    last_height = driver.execute_script("return document.body.scrollHeight")
    
    for i in range(max_scrolls):
        logger.info(f"Scroll {i+1}/{max_scrolls}")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)
        
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

def scrape_twitch_categories():
    """Scrape les catégories Twitch et les enregistre dans la base de données."""
    logger.info("Démarrage du scraping des catégories Twitch")
    driver = get_driver()
    
    try:
        driver.get(DIRECTORY_URL)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//div[contains(@class, "game-card")]'))
        )
        
        # Défiler pour charger plus de catégories
        scroll_to_load_more(driver, max_scrolls=8)
        
        # Scraper les catégories
        category_elements = driver.find_elements(By.XPATH, '//div[contains(@class, "game-card")]')
        logger.info(f"Trouvé {len(category_elements)} catégories")
        
        categories_data = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for category_element in category_elements:
            try:
                category_name_element = category_element.find_elements(By.XPATH, './/h2')
                category_name = category_name_element[0].text.strip() if category_name_element else "Unknown"
                
                viewers_element = category_element.find_elements(By.XPATH, './/p')
                viewers_count = convert_viewers_count(viewers_element[0].text) if viewers_element else 0
                
                tag_elements = category_element.find_elements(By.XPATH, './/button[contains(@class, "tw-tag")]//span')
                tags = ", ".join([tag.text.strip() for tag in tag_elements if tag.text.strip()]) if tag_elements else "No Tags"
                
                image_element = category_element.find_elements(By.XPATH, './/img')
                image_url = image_element[0].get_attribute("src") if image_element else "No Image"
                
                if category_name != "Unknown" and viewers_count > 0:
                    category_data = {
                        "timestamp": timestamp,
                        "category": category_name,
                        "viewers": viewers_count,
                        "tags": tags,
                        "image_url": image_url
                    }
                    categories_data.append(category_data)
            
            except Exception as e:
                logger.error(f"Erreur lors du scraping de la catégorie: {e}")
        
        # Enregistrer dans MongoDB
        if categories_data:
            save_categories_to_db(categories_data)
            logger.info(f"Scraping des catégories terminé. {len(categories_data)} catégories scrapées.")
            
            # Retourner les noms des catégories pour le scraping des streamers
            return [item["category"] for item in categories_data]
        
        return []
    
    except Exception as e:
        logger.error(f"Erreur lors du scraping des catégories: {e}")
        return []
    
    finally:
        driver.quit()

def scrape_twitch_streams(categories):
    """Scrape les streamers pour chaque catégorie."""
    if not categories:
        logger.warning("Aucune catégorie à scraper pour les streamers")
        return
    
    logger.info(f"Démarrage du scraping des streamers pour {len(categories)} catégories")
    driver = get_driver()
    all_streams = []
    
    try:
        for category in categories[:20]:  # Limiter à 20 catégories pour éviter de surcharger
            category_url = BASE_URL.format(category=category.lower().replace(' ', '-'))
            logger.info(f"Scraping des streamers pour {category}")
            
            driver.get(category_url)
            time.sleep(3)
            
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, '//h3[contains(@class, "CoreText")]'))
                )
                
                # Scroll pour charger plus de streamers
                scroll_to_load_more(driver, max_scrolls=3)
                
                # Scraper les streamers
                streamers = driver.find_elements(By.XPATH, '//h3[contains(@class, "CoreText")]')
                streamer_titles = [s.text for s in streamers if s.text.strip()]
                
                channels = driver.find_elements(By.XPATH, '//div[contains(@class, "Layout-sc-1xcs6mc-0 bQImNn")]')
                channel_names = [c.text for c in channels if c.text.strip()]
                
                viewers = driver.find_elements(By.XPATH, '//div[contains(@class, "ScMediaCardStatWrapper")]')
                viewers_counts = [convert_viewers_count(v.text) for v in viewers if v.text.strip()]
                
                tags = driver.find_elements(By.XPATH, '//button[contains(@class, "ScTag")]')
                tags_list = [t.text for t in tags if t.text.strip()]
                
                # Assurer la longueur minimale
                min_length = min(len(streamer_titles), len(channel_names), len(viewers_counts))
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                # Structurer les données
                for i in range(min_length):
                    if i < len(tags_list):
                        tag = tags_list[i]
                    else:
                        tag = "No Tags"
                    
                    stream_data = {
                        "timestamp": timestamp,
                        "category": category,
                        "title": streamer_titles[i],
                        "channel": channel_names[i],
                        "viewers": viewers_counts[i],
                        "tags": tag
                    }
                    all_streams.append(stream_data)
                
                logger.info(f"Données scrapées pour {category}: {len(all_streams)} streamers")
            
            except Exception as e:
                logger.error(f"Erreur lors du scraping de {category}: {e}")
        
        # Enregistrer dans MongoDB
        if all_streams:
            save_streams_to_db(all_streams)
            logger.info(f"Scraping des streamers terminé. {len(all_streams)} streamers scrapés.")
    
    except Exception as e:
        logger.error(f"Erreur lors du scraping des streamers: {e}")
    
    finally:
        driver.quit()

def run_scraper():
    """Exécute le processus complet de scraping."""
    logger.info("Démarrage du cycle de scraping")
    categories = scrape_twitch_categories()
    if categories:
        scrape_twitch_streams(categories)
    logger.info("Cycle de scraping terminé")

# Fonction pour démarrer le planificateur
def start_scheduler(interval_minutes=1):
    """Démarre le planificateur pour exécuter le scraper à intervalles réguliers."""
    logger.info(f"Démarrage du planificateur - Intervalle: {interval_minutes} minutes")
    
    # Exécuter une fois au démarrage
    run_scraper()
    
    # Planifier les exécutions régulières
    schedule.every(interval_minutes).minutes.do(run_scraper)
    
    # Boucle de planification
    while True:
        try:
            schedule.run_pending()
            time.sleep(30)  # Vérifier toutes les 30 secondes
        except Exception as e:
            logger.error(f"Erreur dans la boucle de planification: {e}")
            time.sleep(60)  # Attendre 1 minute en cas d'erreur

if __name__ == "__main__":
    # Démarrer le scraper avec des exécutions toutes les 15 minutes
    start_scheduler(1)
