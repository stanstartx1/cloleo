#!/usr/bin/env python3
"""
Initialize forum collections with default categories
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import db
from datetime import datetime, timezone


async def init_forum():
    """Initialize forum with default categories"""
    
    # Check if categories already exist
    existing = await db.forum_categories.count_documents({})
    if existing > 0:
        print(f"Forum already initialized with {existing} categories")
        return
    
    # Create default categories
    default_categories = [
        # Vendor-specific categories
        {
            "id": "cat-vendor-general",
            "name": "Discussion Générale Vendeurs",
            "description": "Discussions générales entre vendeurs, conseils et partage d'expériences",
            "icon": "�",
            "color": "bg-blue-100",
            "sort_order": 1,
            "target_role": "vendor",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-vendor-marketing",
            "name": "Marketing & Promotion",
            "description": "Stratégies marketing, promotion des produits et visibilité",
            "icon": "📈",
            "color": "bg-green-100",
            "sort_order": 2,
            "target_role": "vendor",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-vendor-tips",
            "name": "Conseils & Astuces",
            "description": "Partage de conseils, astuces et meilleures pratiques pour vendeurs",
            "icon": "💡",
            "color": "bg-amber-100",
            "sort_order": 3,
            "target_role": "vendor",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        # Enterprise-specific categories
        {
            "id": "cat-enterprise-general",
            "name": "Discussion Générale Entreprises",
            "description": "Discussions générales entre entreprises, partenariats et collaborations",
            "icon": "🏢",
            "color": "bg-purple-100",
            "sort_order": 10,
            "target_role": "enterprise",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-enterprise-b2b",
            "name": "Partenariats B2B",
            "description": "Opportunités de partenariats business-to-business entre entreprises",
            "icon": "🤝",
            "color": "bg-indigo-100",
            "sort_order": 11,
            "target_role": "enterprise",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-enterprise-logistics",
            "name": "Logistique & Supply Chain",
            "description": "Discussions sur la logistique, gestion des stocks et chaîne d'approvisionnement",
            "icon": "🚚",
            "color": "bg-teal-100",
            "sort_order": 12,
            "target_role": "enterprise",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        # General/All categories (for admin and future use)
        {
            "id": "cat-general",
            "name": "Discussion Générale",
            "description": "Discussions générales sur la plateforme, suggestions et feedback",
            "icon": "�",
            "color": "bg-blue-100",
            "sort_order": 20,
            "target_role": "all",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-support",
            "name": "Support & Aide",
            "description": "Questions sur l'utilisation de la plateforme, problèmes techniques",
            "icon": "❓",
            "color": "bg-green-100",
            "sort_order": 21,
            "target_role": "all",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-announcements",
            "name": "Annonces",
            "description": "Nouvelles fonctionnalités, mises à jour et annonces importantes",
            "icon": "📢",
            "color": "bg-amber-100",
            "sort_order": 22,
            "target_role": "all",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        }
    ]
    
    # Insert categories
    for category in default_categories:
        await db.forum_categories.insert_one(category)
        print(f"Created category: {category['name']}")
    
    print(f"\n✅ Forum initialized with {len(default_categories)} categories")


if __name__ == "__main__":
    asyncio.run(init_forum())
