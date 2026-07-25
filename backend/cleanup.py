import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "cloleo")

async def cleanup():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("=== Nettoyage de la base de données ===\n")
    
    # Find and delete EKO-BAT enterprise
    print("Recherche de l'entreprise EKO-BAT...")
    eko_bat = await db.users.find_one({"company_name": {"$regex": "EKO-BAT", "$options": "i"}, "role": "enterprise"})
    
    if eko_bat:
        eko_bat_id = eko_bat.get("id")
        print(f"Entreprise trouvée: {eko_bat.get('company_name')} (ID: {eko_bat_id})")
        
        # Delete all products from this enterprise
        product_count = await db.products.count_documents({"seller_id": eko_bat_id})
        print(f"Suppression de {product_count} produits de cette entreprise...")
        await db.products.delete_many({"seller_id": eko_bat_id})
        
        # Delete the enterprise
        await db.users.delete_one({"id": eko_bat_id})
        print(f"✅ Entreprise EKO-BAT supprimée avec ses produits\n")
    else:
        print("❌ Entreprise EKO-BAT non trouvée\n")
    
    # Find and delete products "n. GH" and "sss"
    print("Recherche des produits 'n. GH' et 'sss'...")
    
    n_gh = await db.products.find_one({"name": {"$regex": "n. GH", "$options": "i"}})
    if n_gh:
        print(f"Produit trouvé: {n_gh.get('name')} (ID: {n_gh.get('id')})")
        await db.products.delete_one({"id": n_gh.get("id")})
        print(f"✅ Produit 'n. GH' supprimé\n")
    else:
        print("❌ Produit 'n. GH' non trouvé\n")
    
    sss = await db.products.find_one({"name": {"$regex": "sss", "$options": "i"}})
    if sss:
        print(f"Produit trouvé: {sss.get('name')} (ID: {sss.get('id')})")
        await db.products.delete_one({"id": sss.get("id")})
        print(f"✅ Produit 'sss' supprimé\n")
    else:
        print("❌ Produit 'sss' non trouvé\n")
    
    print("=== Nettoyage terminé ===")
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup())
