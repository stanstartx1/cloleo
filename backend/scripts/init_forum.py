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
        {
            "id": "cat-general",
            "name": "Discussion Générale",
            "description": "Discussions générales sur la plateforme, suggestions et feedback",
            "icon": "💬",
            "color": "bg-blue-100",
            "sort_order": 1,
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
            "sort_order": 2,
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
            "sort_order": 3,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-marketplace",
            "name": "Marketplace",
            "description": "Discussions sur les produits, vendeurs et achats",
            "icon": "🛍️",
            "color": "bg-purple-100",
            "sort_order": 4,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system"
        },
        {
            "id": "cat-offtopic",
            "name": "Hors Sujet",
            "description": "Discussions informelles, humour et conversations variées",
            "icon": "🎉",
            "color": "bg-pink-100",
            "sort_order": 5,
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
