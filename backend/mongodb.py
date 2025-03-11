import pymongo
from datetime import datetime
import logging

from bson import ObjectId

def serialize_mongo_document(document):
    """Convertit un document MongoDB en dictionnaire sérialisable par FastAPI."""
    if isinstance(document, list):
        return [serialize_mongo_document(doc) for doc in document]
    
    if isinstance(document, dict):
        document = document.copy()  # Éviter de modifier l'original
        if "_id" in document and isinstance(document["_id"], ObjectId):
            document["_id"] = str(document["_id"])  # Convertir ObjectId en string
        return document

    return document


# Configuration du logging
logger = logging.getLogger("MongoDB")

# Configuration de la connexion MongoDB
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "twitch_data"
CATEGORIES_COLLECTION = "categories"
STREAMS_COLLECTION = "streams"

# Initialisation du client MongoDB
try:
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    categories_collection = db[CATEGORIES_COLLECTION]
    streams_collection = db[STREAMS_COLLECTION]
    
    # Création d'index pour les performances
    categories_collection.create_index([("category", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    streams_collection.create_index([("category", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    streams_collection.create_index([("channel", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    
    logger.info("Connexion à MongoDB établie avec succès")
except Exception as e:
    logger.error(f"Erreur de connexion à MongoDB: {e}")
    raise

def save_categories_to_db(categories_data):
    """Enregistre les données des catégories dans MongoDB."""
    try:
        if not categories_data:
            logger.warning("Aucune donnée de catégories à sauvegarder")
            return
        
        # Ajouter une date de création pour faciliter les requêtes
        for data in categories_data:
            data["created_at"] = datetime.now()
        
        # Insérer les données
        result = categories_collection.insert_many(categories_data)
        logger.info(f"{len(result.inserted_ids)} catégories enregistrées dans MongoDB")
        return result.inserted_ids
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement des catégories: {e}")
        return None

def save_streams_to_db(streams_data):
    """Enregistre les données des streamers dans MongoDB."""
    try:
        if not streams_data:
            logger.warning("Aucune donnée de streamers à sauvegarder")
            return
        
        # Ajouter une date de création pour faciliter les requêtes
        for data in streams_data:
            data["created_at"] = datetime.now()
        
        # Insérer les données
        result = streams_collection.insert_many(streams_data)
        logger.info(f"{len(result.inserted_ids)} streamers enregistrés dans MongoDB")
        return result.inserted_ids
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement des streamers: {e}")
        return None

def get_latest_categories(limit=100):
    """Récupère les dernières catégories de la base de données."""
    try:
        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$category",
                "doc": {"$first": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$doc"}},
            {"$sort": {"viewers": -1}},
            {"$limit": limit}
        ]
        
        results = list(categories_collection.aggregate(pipeline))
        return serialize_mongo_document(results)  # 🔥 Appliquer la conversion
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories: {e}")
        return []

def get_latest_streams(category=None, limit=100):
    """Récupère les derniers streams de la base de données."""
    try:
        query = {"category": category} if category else {}

        if category:
            results = list(streams_collection.find(query).sort("viewers", -1).limit(limit))
        else:
            # Si aucune catégorie n'est spécifiée, récupérer les derniers streams toutes catégories confondues
            pipeline = [
                {"$sort": {"created_at": -1}},
                {"$group": {
                    "_id": "$channel",
                    "doc": {"$first": "$$ROOT"}
                }},
                {"$replaceRoot": {"newRoot": "$doc"}},
                {"$sort": {"viewers": -1}},
                {"$limit": limit}
            ]
            results = list(streams_collection.aggregate(pipeline))

        return serialize_mongo_document(results)  # 🔥 Convertir ObjectId en str
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des streams: {e}")
        return []

def get_categories_history(hours=24):
    """Récupère l'historique des catégories sur une période donnée."""
    try:
        # Calculer la date limite
        limit_date = datetime.now()
        limit_date = limit_date.replace(hour=limit_date.hour - hours)
        
        # Requête pour obtenir l'historique
        pipeline = [
            {"$match": {"created_at": {"$gt": limit_date}}},
            {"$group": {
                "_id": {
                    "category": "$category",
                    "hour": {"$hour": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "avg_viewers": {"$avg": "$viewers"},
                "max_viewers": {"$max": "$viewers"},
                "min_viewers": {"$min": "$viewers"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.month": 1, "_id.day": 1, "_id.hour": 1}}
        ]
        
        results = list(categories_collection.aggregate(pipeline))
        logger.info(f"Récupéré {len(results)} points de données historiques pour les catégories")
        return results
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique des catégories: {e}")
        return []

def get_streams_history(category=None, hours=24):
    """Récupère l'historique des streams sur une période donnée."""
    try:
        # Calculer la date limite
        limit_date = datetime.now()
        limit_date = limit_date.replace(hour=limit_date.hour - hours)
        
        # Construire la requête
        match_query = {"created_at": {"$gt": limit_date}}
        if category:
            match_query["category"] = category
        
        # Pipeline d'agrégation
        pipeline = [
            {"$match": match_query},
            {"$group": {
                "_id": {
                    "channel": "$channel",
                    "hour": {"$hour": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "avg_viewers": {"$avg": "$viewers"},
                "max_viewers": {"$max": "$viewers"},
                "min_viewers": {"$min": "$viewers"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.month": 1, "_id.day": 1, "_id.hour": 1}}
        ]
        
        results = list(streams_collection.aggregate(pipeline))
        logger.info(f"Récupéré {len(results)} points de données historiques pour les streams" + 
                   (f" de {category}" if category else ""))
        return results
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique des streams: {e}")
        return []
