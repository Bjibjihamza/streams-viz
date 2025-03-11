import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from mongodb import (
    get_latest_categories, 
    get_latest_streams, 
    get_categories_history,
    get_streams_history,
    serialize_mongo_document
)

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("TwitchAPI")

# Création de l'application FastAPI
app = FastAPI(
    title="API Twitch Scraper",
    description="API pour récupérer les données scrapées de Twitch",
    version="1.0.0"
)

# Configuration CORS pour permettre les requêtes depuis le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines en développement
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles de données
class Category(BaseModel):
    category: str
    viewers: int
    tags: str
    image_url: str
    timestamp: str
    created_at: datetime

class Stream(BaseModel):
    category: str
    title: str
    channel: str
    viewers: int
    tags: str
    timestamp: str
    created_at: datetime

class HistoryPoint(BaseModel):
    category: str
    timestamp: datetime
    viewers: int

# Routes API
@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API Twitch Scraper"}

@app.get("/api/categories", response_model=List[dict])
async def get_categories(limit: int = Query(20, ge=1, le=100)):
    """Récupère les catégories les plus récentes par nombre de spectateurs."""
    try:
        categories = get_latest_categories(limit=limit)
        return serialize_mongo_document(categories)  # 🔥 Appliquer la conversion
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/streams", response_model=List[dict])
async def get_streams(
    category: Optional[str] = None, 
    limit: int = Query(50, ge=1, le=200)
):
    """Récupère les streams les plus récents par nombre de spectateurs."""
    try:
        streams = get_latest_streams(category=category, limit=limit)
        return serialize_mongo_document(streams)  # 🔥 Convertir ObjectId en str
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des streams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories/history", response_model=List[dict])
async def get_history_categories(hours: int = Query(24, ge=1, le=168)):
    """Récupère l'historique des catégories sur une période donnée."""
    try:
        history = get_categories_history(hours=hours)
        # Transformer les données pour faciliter l'utilisation côté frontend
        formatted_history = []
        for point in history:
            formatted_history.append({
                "category": point["_id"]["category"],
                "hour": point["_id"]["hour"],
                "day": point["_id"]["day"],
                "month": point["_id"]["month"],
                "avg_viewers": point["avg_viewers"],
                "max_viewers": point["max_viewers"],
                "min_viewers": point["min_viewers"],
                "count": point["count"]
            })
        return formatted_history
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique des catégories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/streams/history", response_model=List[dict])
async def get_history_streams(
    category: Optional[str] = None,
    hours: int = Query(24, ge=1, le=168)
):
    """Récupère l'historique des streams sur une période donnée."""
    try:
        history = get_streams_history(category=category, hours=hours)
        # Transformer les données pour faciliter l'utilisation côté frontend
        formatted_history = []
        for point in history:
            formatted_history.append({
                "channel": point["_id"]["channel"],
                "hour": point["_id"]["hour"],
                "day": point["_id"]["day"],
                "month": point["_id"]["month"],
                "avg_viewers": point["avg_viewers"],
                "max_viewers": point["max_viewers"],
                "min_viewers": point["min_viewers"],
                "count": point["count"]
            })
        return formatted_history
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique des streams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics")
async def get_statistics():
    """Récupère des statistiques générales sur les données collectées."""
    try:
        # Obtenir les catégories les plus populaires
        top_categories = get_latest_categories(limit=10)
        
        # Calculer les statistiques de base
        total_viewers = sum(cat.get("viewers", 0) for cat in top_categories)
        
        # Obtenir les streams les plus populaires
        top_streams = get_latest_streams(limit=10)
        
        return {
            "top_categories": top_categories,
            "top_streams": top_streams,
            "total_viewers": total_viewers,
            "last_update": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Point d'entrée pour exécuter l'API
if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
