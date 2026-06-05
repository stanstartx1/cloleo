#!/usr/bin/env python3
import asyncio
import os
import sys
import uuid
from pathlib import Path

# Ajouter le chemin du backend
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from core.database import db
from core.auth import hash_password

# Charger .env
load_dotenv()

async def init_admin():
    email = os.getenv('ADMIN_EMAIL', 'admin@cloleo.com')
    password = os.getenv('ADMIN_PASSWORD', 'cloclo@2026!')
    name = os.getenv('ADMIN_NAME', 'Super Admin')
    
    # Vérifie si l'admin existe déjà
    existing = await db.users.find_one({'email': email})
    
    if existing:
        print(f'✅ Admin déjà existant: {existing["email"]}')
        # Met à jour le mot de passe si besoin
        await db.users.update_one(
            {'email': email},
            {'$set': {
                'password': hash_password(password),
                'name': name,
                'role': 'admin',
                'is_active': True,
                'is_verified': True,
                'updated_at': '2026-06-05T00:00:00Z'
            }}
        )
        print('   Mot de passe mis à jour')
    else:
        # Crée le nouvel admin
        admin = {
            'id': str(uuid.uuid4()),
            'email': email,
            'password': hash_password(password),
            'name': name,
            'role': 'admin',
            'is_active': True,
            'is_verified': True,
            'created_at': '2026-06-05T00:00:00Z'
        }
        await db.users.insert_one(admin)
        print('✅ Admin créé avec succès')
    
    print(f'   Email: {email}')
    print(f'   Mot de passe: {password}')
    print(f'   Nom: {name}')

if __name__ == '__main__':
    asyncio.run(init_admin())