import asyncio
import random
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cloleo")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Product data by category
PRODUCTS_DATA = {
    "mode-textile": [
        {"name": "Robe Wax Ankara Premium", "description": "Magnifique robe en tissu wax africain authentique. Coupe moderne et élégante, parfaite pour les occasions spéciales. Tissu 100% coton de qualité supérieure.", "price_range": (15000, 45000)},
        {"name": "Chemise Bazin Brodée Homme", "description": "Chemise traditionnelle en bazin riche avec broderies artisanales. Confort optimal et style authentique africain.", "price_range": (18000, 55000)},
        {"name": "Ensemble Boubou Femme", "description": "Ensemble boubou complet avec voile assorti. Tissu léger et confortable, idéal pour les cérémonies.", "price_range": (25000, 75000)},
        {"name": "Jean Slim Stretch Premium", "description": "Jean coupe slim en denim stretch de haute qualité. Confortable et tendance, disponible en plusieurs lavages.", "price_range": (12000, 28000)},
        {"name": "T-shirt Graphique Afro", "description": "T-shirt 100% coton avec impressions graphiques inspirées de l'art africain. Coupe moderne et confortable.", "price_range": (5000, 12000)},
        {"name": "Robe Soirée Paillettes", "description": "Robe de soirée élégante avec détails pailletés. Coupe flatteuse et finitions soignées.", "price_range": (35000, 85000)},
        {"name": "Costume 3 Pièces Homme", "description": "Costume classique comprenant veste, pantalon et gilet. Tissu italien de qualité, coupe ajustée.", "price_range": (65000, 150000)},
        {"name": "Dashiki Traditionnel Coloré", "description": "Dashiki authentique aux couleurs vives. Broderies détaillées sur le col et la poitrine.", "price_range": (8000, 22000)},
        {"name": "Jupe Midi Plissée", "description": "Jupe midi plissée élégante et polyvalente. Taille élastique pour un confort optimal.", "price_range": (10000, 25000)},
        {"name": "Polo Premium Piqué", "description": "Polo en coton piqué de qualité supérieure. Col et manchettes côtelés, coupe ajustée.", "price_range": (8000, 18000)},
        {"name": "Caftan Marocain Luxe", "description": "Caftan marocain avec broderies dorées artisanales. Tissu satiné de haute qualité.", "price_range": (45000, 120000)},
        {"name": "Combinaison Pantalon Femme", "description": "Combinaison élégante une pièce. Coupe fluide et ceinture à nouer à la taille.", "price_range": (18000, 38000)},
        {"name": "Veste Blazer Femme", "description": "Blazer coupe ajustée avec doublure intérieure. Parfaite pour le bureau ou les sorties.", "price_range": (22000, 48000)},
        {"name": "Short Bermuda Homme", "description": "Bermuda en coton léger avec poches cargo. Parfait pour l'été africain.", "price_range": (8000, 18000)},
        {"name": "Robe Maxi Fleurie", "description": "Robe longue avec imprimé floral tropical. Tissu fluide et confortable.", "price_range": (15000, 35000)},
    ],
    "artisanat-decoration": [
        {"name": "Masque Africain Baoulé", "description": "Masque traditionnel sculpté à la main par des artisans baoulé. Bois d'ébène véritable avec patine naturelle.", "price_range": (25000, 85000)},
        {"name": "Tableau Huile sur Toile Africain", "description": "Peinture originale représentant une scène de vie africaine. Technique à l'huile sur toile de lin.", "price_range": (35000, 150000)},
        {"name": "Statuette Bronze Ashanti", "description": "Statuette en bronze coulée selon la technique traditionnelle Ashanti. Pièce unique et authentique.", "price_range": (45000, 180000)},
        {"name": "Panier Tressé Bolga", "description": "Panier artisanal tressé à la main au Ghana. Fibres naturelles teintées, motifs géométriques.", "price_range": (8000, 25000)},
        {"name": "Tambour Djembé Sculpté", "description": "Djembé traditionnel avec fût en bois sculpté et peau de chèvre. Son authentique et puissant.", "price_range": (35000, 95000)},
        {"name": "Tapis Berbère Fait Main", "description": "Tapis berbère authentique tissé à la main au Maroc. Laine naturelle et motifs traditionnels.", "price_range": (55000, 200000)},
        {"name": "Vase Terre Cuite Artisanal", "description": "Vase décoratif en terre cuite façonné à la main. Motifs gravés et finition mate.", "price_range": (12000, 35000)},
        {"name": "Cadre Photo Bois Exotique", "description": "Cadre photo en bois exotique avec gravures africaines. Format 20x30cm.", "price_range": (8000, 22000)},
        {"name": "Sculpture Girafe Bois", "description": "Sculpture décorative girafe en bois massif. Hauteur 60cm, finition vernie.", "price_range": (18000, 45000)},
        {"name": "Set Dessous de Verre Bogolan", "description": "Ensemble de 6 dessous de verre en tissu bogolan malien. Motifs traditionnels.", "price_range": (6000, 15000)},
        {"name": "Miroir Soleil Rotin", "description": "Miroir mural avec cadre en rotin tressé style soleil. Diamètre 50cm.", "price_range": (15000, 38000)},
        {"name": "Lampe Calebasse Sculptée", "description": "Lampe d'ambiance en calebasse naturelle ajourée. Lumière tamisée et chaleureuse.", "price_range": (18000, 42000)},
    ],
    "bijoux-accessoires": [
        {"name": "Collier Perles Africaines", "description": "Collier multirang en perles de verre recyclé du Ghana. Couleurs vibrantes et fermeture ajustable.", "price_range": (8000, 25000)},
        {"name": "Bracelet Manchette Bronze", "description": "Bracelet manchette en bronze martelé à la main. Design inspiré de l'art tribal.", "price_range": (12000, 35000)},
        {"name": "Boucles d'Oreilles Créoles Or", "description": "Créoles en plaqué or 18 carats avec motifs gravés. Diamètre 4cm.", "price_range": (15000, 45000)},
        {"name": "Sac à Main Cuir Artisanal", "description": "Sac en cuir véritable tanné végétal. Coutures à la main et finitions soignées.", "price_range": (25000, 75000)},
        {"name": "Montre Bois Bambou Homme", "description": "Montre avec boîtier en bambou naturel et bracelet cuir. Mouvement quartz japonais.", "price_range": (18000, 45000)},
        {"name": "Ceinture Cuir Tressé", "description": "Ceinture en cuir véritable tressé à la main. Boucle en laiton antique.", "price_range": (12000, 32000)},
        {"name": "Lunettes Soleil Vintage", "description": "Lunettes de soleil style vintage avec monture acétate. Protection UV400.", "price_range": (15000, 38000)},
        {"name": "Pochette Soirée Perlée", "description": "Pochette de soirée ornée de perles et sequins. Chaîne amovible dorée.", "price_range": (18000, 48000)},
        {"name": "Bracelet Cheville Argent", "description": "Bracelet de cheville en argent 925 avec breloques. Longueur ajustable.", "price_range": (10000, 28000)},
        {"name": "Foulard Soie Imprimé", "description": "Foulard en soie naturelle avec imprimé africain. Dimensions 90x90cm.", "price_range": (15000, 42000)},
        {"name": "Chapeau Panama Tressé", "description": "Chapeau panama authentique tressé en Équateur. Protection solaire élégante.", "price_range": (22000, 55000)},
        {"name": "Pendentif Carte Afrique Or", "description": "Pendentif carte d'Afrique en plaqué or avec chaîne 45cm.", "price_range": (12000, 35000)},
    ],
    "beaute-cosmetiques": [
        {"name": "Huile de Karité Pure Bio", "description": "Beurre de karité 100% pur et non raffiné du Burkina Faso. Hydratant naturel multi-usage.", "price_range": (5000, 15000)},
        {"name": "Savon Noir Africain", "description": "Savon noir traditionnel fabriqué à base de cendres de plantain et beurre de cacao. Nettoyant doux et naturel.", "price_range": (3000, 8000)},
        {"name": "Huile de Baobab Pressée Froid", "description": "Huile de baobab bio pressée à froid. Riche en vitamines A, D, E et oméga. Anti-âge naturel.", "price_range": (8000, 22000)},
        {"name": "Crème Visage Aloe Vera", "description": "Crème hydratante à l'aloe vera frais. Formule légère et non grasse, convient à tous types de peau.", "price_range": (6000, 18000)},
        {"name": "Masque Argile Ghassoul", "description": "Argile ghassoul du Maroc en poudre. Purifiant naturel pour visage et cheveux.", "price_range": (4000, 12000)},
        {"name": "Parfum Oud Arabe Premium", "description": "Eau de parfum concentrée au oud et musc. Fragrance orientale longue tenue.", "price_range": (25000, 85000)},
        {"name": "Kit Soin Cheveux Naturels", "description": "Coffret complet pour cheveux crépus : shampoing, après-shampoing et masque. Ingrédients naturels.", "price_range": (15000, 38000)},
        {"name": "Gel Aloe Vera 100% Pur", "description": "Gel d'aloe vera pur extrait à froid. Apaisant, hydratant et cicatrisant.", "price_range": (5000, 14000)},
        {"name": "Rouge à Lèvres Mat Longue Tenue", "description": "Rouge à lèvres mat enrichi en beurre de karité. Couleur intense et hydratation.", "price_range": (6000, 16000)},
        {"name": "Huile Moringa Cheveux", "description": "Huile de moringa pure pour cheveux secs et abîmés. Renforce et fait briller.", "price_range": (7000, 18000)},
        {"name": "Coffret Maquillage Complet", "description": "Palette complète avec fards, blush, highlighter et pinceaux. Pigments haute qualité.", "price_range": (25000, 65000)},
        {"name": "Spray Fixateur Maquillage", "description": "Brume fixatrice longue tenue. Tenue jusqu'à 16h sans transfert.", "price_range": (8000, 20000)},
    ],
    "electronique-gadgets": [
        {"name": "Écouteurs Bluetooth Premium", "description": "Écouteurs sans fil avec réduction de bruit active. Autonomie 30h, son Hi-Fi.", "price_range": (25000, 75000)},
        {"name": "Powerbank Solaire 20000mAh", "description": "Batterie externe avec panneau solaire intégré. Charge rapide et 4 ports USB.", "price_range": (18000, 45000)},
        {"name": "Montre Connectée Sport", "description": "Smartwatch avec GPS, cardiofréquencemètre et suivi sommeil. Étanche IP68.", "price_range": (35000, 95000)},
        {"name": "Enceinte Bluetooth Waterproof", "description": "Enceinte portable étanche avec basse puissante. Autonomie 20h, micro intégré.", "price_range": (15000, 48000)},
        {"name": "Lampe LED Rechargeable", "description": "Lampe de bureau LED avec batterie intégrée. 3 modes d'éclairage et port USB.", "price_range": (8000, 22000)},
        {"name": "Chargeur Sans Fil Rapide", "description": "Station de charge sans fil 15W compatible tous smartphones. Design minimaliste.", "price_range": (10000, 28000)},
        {"name": "Webcam HD 1080p", "description": "Webcam Full HD avec microphone intégré et correction automatique lumière.", "price_range": (18000, 45000)},
        {"name": "Clavier Mécanique Gaming", "description": "Clavier mécanique rétroéclairé RGB. Switches blue, anti-ghosting.", "price_range": (25000, 65000)},
        {"name": "Souris Sans Fil Ergonomique", "description": "Souris wireless ergonomique avec DPI ajustable. Silencieuse et précise.", "price_range": (8000, 25000)},
        {"name": "Hub USB-C 7 en 1", "description": "Adaptateur multiport : HDMI 4K, USB 3.0, SD card, ethernet, charge 100W.", "price_range": (15000, 42000)},
        {"name": "Ring Light Professionnel", "description": "Anneau lumineux LED 10 pouces avec trépied. Parfait pour selfies et vidéos.", "price_range": (12000, 35000)},
        {"name": "Ventilateur USB Portable", "description": "Mini ventilateur rechargeable 3 vitesses. Silencieux et compact.", "price_range": (5000, 15000)},
    ],
    "maison-cuisine": [
        {"name": "Service Assiettes Céramique", "description": "Service 18 pièces en céramique artisanale. Motifs africains peints à la main.", "price_range": (35000, 85000)},
        {"name": "Mixeur Blender Puissant", "description": "Blender 1200W avec bol verre 1.5L. Fonctions smoothie, glace pilée et soupe.", "price_range": (25000, 65000)},
        {"name": "Cocotte Fonte Émaillée", "description": "Cocotte en fonte émaillée 5L. Compatible tous feux dont induction.", "price_range": (35000, 95000)},
        {"name": "Set Ustensiles Bois Bambou", "description": "Ensemble 8 ustensiles cuisine en bambou naturel avec support rotatif.", "price_range": (12000, 28000)},
        {"name": "Bouilloire Électrique Inox", "description": "Bouilloire 1.7L en acier inoxydable. Arrêt automatique et filtre anti-calcaire.", "price_range": (15000, 38000)},
        {"name": "Nappe Wax Rectangulaire", "description": "Nappe en tissu wax 150x250cm avec serviettes assorties. Lavable en machine.", "price_range": (18000, 42000)},
        {"name": "Machine à Café Expresso", "description": "Machine expresso 15 bars avec mousseur à lait. Capsules compatibles Nespresso.", "price_range": (45000, 120000)},
        {"name": "Poêle Antiadhésive 28cm", "description": "Poêle revêtement céramique sans PFOA. Manche amovible, four compatible.", "price_range": (12000, 32000)},
        {"name": "Balance Cuisine Digitale", "description": "Balance précision 1g-5kg avec bol amovible. Écran LCD et tare automatique.", "price_range": (8000, 22000)},
        {"name": "Set Verres Cristal 6pcs", "description": "Ensemble 6 verres à eau en cristal soufflé. Design moderne et élégant.", "price_range": (18000, 48000)},
        {"name": "Planche Découper Bois Massif", "description": "Planche en bois d'acacia massif avec rigole. Dimensions 45x30cm.", "price_range": (10000, 28000)},
        {"name": "Friteuse Air Chaud 5L", "description": "Friteuse sans huile grande capacité. Cuisson saine, 8 programmes prédéfinis.", "price_range": (35000, 85000)},
    ],
    "produits-locaux-agroalimentaire": [
        {"name": "Café Arabica Torréfié", "description": "Café arabica de Côte d'Ivoire torréfié artisanalement. Notes chocolatées et fruitées.", "price_range": (8000, 22000)},
        {"name": "Miel Pur Forêt Tropical", "description": "Miel brut non pasteurisé récolté en forêt tropicale. Riche en enzymes et antioxydants.", "price_range": (10000, 28000)},
        {"name": "Chocolat Noir 70% Cacao", "description": "Tablette chocolat noir origine Côte d'Ivoire. Cacao premium équitable.", "price_range": (5000, 15000)},
        {"name": "Huile Palme Rouge Bio", "description": "Huile de palme rouge non raffinée, riche en vitamine A. Production artisanale.", "price_range": (6000, 18000)},
        {"name": "Piment Séché Pilé", "description": "Poudre de piment africain authentique. Saveur intense et piquant modéré.", "price_range": (3000, 8000)},
        {"name": "Attieke Séché Premium", "description": "Attiéké déshydraté prêt à cuisiner. Semoule de manioc traditionnelle.", "price_range": (4000, 12000)},
        {"name": "Gingembre Frais Bio 1kg", "description": "Gingembre frais biologique. Saveur piquante et aromatique.", "price_range": (5000, 12000)},
        {"name": "Bissap Fleurs Séchées", "description": "Fleurs d'hibiscus séchées pour infusion. Riche en vitamine C.", "price_range": (4000, 10000)},
        {"name": "Noix de Cajou Grillées", "description": "Noix de cajou de Côte d'Ivoire grillées et légèrement salées. 500g.", "price_range": (8000, 18000)},
        {"name": "Beurre Cacahuète Naturel", "description": "Beurre de cacahuète 100% arachides sans additifs. Texture crémeuse.", "price_range": (5000, 14000)},
        {"name": "Thé Kinkeliba Bio", "description": "Infusion de kinkeliba du Sénégal. Digestif naturel et détoxifiant.", "price_range": (4000, 12000)},
        {"name": "Sauce Arachide Prête", "description": "Sauce arachide traditionnelle prête à l'emploi. Sans conservateurs.", "price_range": (5000, 15000)},
    ],
    "sport-loisirs": [
        {"name": "Tapis Yoga Antidérapant", "description": "Tapis yoga 6mm épais avec sangle transport. Surface antidérapante eco-friendly.", "price_range": (12000, 32000)},
        {"name": "Haltères Set 10kg", "description": "Paire d'haltères réglables 2-10kg avec support. Revêtement néoprène.", "price_range": (25000, 65000)},
        {"name": "Ballon Football Pro", "description": "Ballon taille 5 qualité match. Cousu main, vessie latex haute rebond.", "price_range": (15000, 42000)},
        {"name": "Corde à Sauter Pro", "description": "Corde à sauter ajustable avec compteur digital. Poignées ergonomiques.", "price_range": (8000, 22000)},
        {"name": "Sac Sport Multifonction", "description": "Sac de sport 40L avec compartiment chaussures. Imperméable et résistant.", "price_range": (18000, 45000)},
        {"name": "Gants Boxe Cuir", "description": "Gants de boxe 12oz en cuir synthétique premium. Rembourrage mousse haute densité.", "price_range": (22000, 55000)},
        {"name": "Bandes Résistance Set", "description": "Kit 5 bandes élastiques résistances variées. Accessoires musculation inclus.", "price_range": (10000, 28000)},
        {"name": "Vélo Spinning Indoor", "description": "Vélo d'appartement avec résistance magnétique. Écran LCD, support tablette.", "price_range": (85000, 250000)},
        {"name": "Raquette Tennis Pro", "description": "Raquette graphite 300g avec housse. Équilibre neutre, puissance et contrôle.", "price_range": (35000, 95000)},
        {"name": "Montre Podomètre Basic", "description": "Bracelet connecté compteur de pas et calories. Autonomie 7 jours.", "price_range": (12000, 32000)},
        {"name": "Jeu Échecs Bois Luxe", "description": "Échiquier pliable en bois avec pièces sculptées. Rangement intégré.", "price_range": (15000, 45000)},
        {"name": "Hamac Toile Résistant", "description": "Hamac double 200x150cm avec attaches. Toile coton résistante 200kg.", "price_range": (18000, 48000)},
    ],
}

# Stock images by category (using placeholder URLs - in real scenario these would be actual product images)
CATEGORY_IMAGES = {
    "mode-textile": [
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500",
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500",
        "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=500",
    ],
    "artisanat-decoration": [
        "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=500",
        "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=500",
    ],
    "bijoux-accessoires": [
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500",
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500",
    ],
    "beaute-cosmetiques": [
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500",
        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500",
    ],
    "electronique-gadgets": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500",
    ],
    "maison-cuisine": [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500",
        "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500",
    ],
    "produits-locaux-agroalimentaire": [
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500",
    ],
    "sport-loisirs": [
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500",
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500",
    ],
}

FCFA_TO_USD = 0.00165

async def create_products():
    # Get existing vendor or create one
    vendor = await db.users.find_one({"role": "vendor", "is_active": True, "is_verified": True}, {"_id": 0})
    if not vendor:
        print("No verified vendor found. Checking all vendors...")
        vendor = await db.users.find_one({"role": "vendor"}, {"_id": 0})
    if not vendor:
        print("No vendor found. Using admin as seller.")
        vendor = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if not vendor:
        # Create a default vendor
        print("Creating default vendor...")
        vendor = {
            "id": str(uuid.uuid4()),
            "email": "shop@cloleo.com",
            "name": "Cloléo Shop Officiel",
            "role": "vendor",
            "is_active": True,
            "is_verified": True,
            "shop_name": "Cloléo Shop Officiel"
        }
        await db.users.insert_one(vendor)
    
    seller_id = vendor["id"]
    seller_name = vendor.get("shop_name") or vendor.get("name", "Cloléo Shop")
    
    products_created = 0
    
    for category_slug, products in PRODUCTS_DATA.items():
        print(f"\nCreating products for: {category_slug}")
        
        for product_data in products:
            # Check if product already exists
            existing = await db.products.find_one({"name": product_data["name"]})
            if existing:
                print(f"  - Skipping (exists): {product_data['name']}")
                continue
            
            price_fcfa = random.randint(product_data["price_range"][0], product_data["price_range"][1])
            price_fcfa = round(price_fcfa / 500) * 500  # Round to nearest 500
            
            images = CATEGORY_IMAGES.get(category_slug, ["https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=500"])
            
            product = {
                "id": str(uuid.uuid4()),
                "name": product_data["name"],
                "description": product_data["description"],
                "price_fcfa": price_fcfa,
                "price_usd": round(price_fcfa * FCFA_TO_USD, 2),
                "category_slug": category_slug,
                "seller_id": seller_id,
                "seller_name": seller_name,
                "images": [random.choice(images)],
                "status": "approved",
                "is_featured": random.random() < 0.15,  # 15% chance featured
                "sales_count": random.randint(0, 50),
                "stock": random.randint(5, 100),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.products.insert_one(product)
            products_created += 1
            print(f"  + Created: {product_data['name']} ({price_fcfa} FCFA)")
    
    print(f"\n✅ Total products created: {products_created}")
    
    # Count total
    total = await db.products.count_documents({"status": "approved"})
    print(f"📦 Total approved products in database: {total}")

if __name__ == "__main__":
    asyncio.run(create_products())
