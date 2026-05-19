# Core database configuration
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os

# ====================== CONFIGURATION ======================
ROOT_DIR = Path(__file__).parent.parent

# Charger le .env depuis la racine du backend
load_dotenv(ROOT_DIR / ".env")

# Récupération des variables d'environnement
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "cloleo_marketplace")

# ====================== VALIDATION ======================
if not mongo_url:
    raise RuntimeError("❌ MONGO_URL n'est pas défini dans le fichier .env")

if not mongo_url.startswith("mongodb+srv://") and not mongo_url.startswith("mongodb://"):
    raise RuntimeError("❌ MONGO_URL invalide. Vérifiez le format.")

print(f"✅ Connexion MongoDB initialisée → {db_name}")

# ====================== CONNEXION ======================
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,      # Timeout plus court pour détecter les problèmes
    connectTimeoutMS=10000,
    socketTimeoutMS=20000,
    retryWrites=True,
    w="majority"
)

db = client[db_name]

# Test de connexion léger au démarrage
async def test_connection():
    try:
        await client.server_info()
        print("✅ Connexion MongoDB Atlas réussie !")
    except Exception as e:
        print(f"❌ Erreur de connexion MongoDB : {e}")
        raise

# Optionnel : lancer le test au import (décommente si tu veux)
# import asyncio
# asyncio.create_task(test_connection())