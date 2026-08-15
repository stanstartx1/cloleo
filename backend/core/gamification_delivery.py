"""Gamification for delivery ecosystem."""
from datetime import datetime, timezone
from typing import Dict, List
import uuid

from core.database import db

POINTS_MAP = {
    "delivery_completed": 25,
    "positive_rating": 10,
    "on_time_delivery": 15,
    "fast_preparation": 10,
    "weekly_streak": 50,
}

BADGES = [
    {"id": "star_driver", "name": "Livreur Étoile", "threshold": 500, "icon": "⭐"},
    {"id": "top_vendor", "name": "Vendeur Top", "threshold": 300, "icon": "🏆"},
    {"id": "speed_demon", "name": "Rapide comme l'éclair", "threshold": 200, "icon": "⚡"},
    {"id": "reliable", "name": "Fiable", "threshold": 100, "icon": "✅"},
]

REWARDS = [
    {"id": "priority_orders", "name": "Priorité commandes", "cost": 200, "description": "24h de priorité"},
    {"id": "fee_discount", "name": "Réduction frais", "cost": 150, "description": "10% sur frais livraison"},
    {"id": "badge_boost", "name": "Badge visible", "cost": 100, "description": "Badge sur profil 7 jours"},
]


async def add_delivery_points(user_id: str, action: str, custom_points: int = None):
    points = custom_points or POINTS_MAP.get(action, 5)
    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {
            "$inc": {"points": points, f"stats.{action}": 1},
            "$setOnInsert": {"user_id": user_id, "badges": [], "redeemed_rewards": []},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if profile:
        earned = profile.get("points", 0)
        new_badges = [b["id"] for b in BADGES if earned >= b["threshold"]]
        current = set(profile.get("badges", []))
        if set(new_badges) - current:
            await db.gamification_profiles.update_one(
                {"user_id": user_id},
                {"$set": {"badges": list(set(new_badges))}},
            )


async def get_gamification_data(user_id: str, role: str) -> dict:
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {
        "points": 0, "badges": [], "stats": {}, "redeemed_rewards": [],
    }
    points = profile.get("points", 0)
    levels = [
        (0, "Débutant"), (100, "Apprenti"), (500, "Confirmé"),
        (1000, "Expert"), (2500, "Maître"), (5000, "Légende"),
    ]
    level_name = "Débutant"
    next_threshold = 100
    for threshold, name in levels:
        if points >= threshold:
            level_name = name
        else:
            next_threshold = threshold
            break

    leaderboard = await db.gamification_profiles.find({}, {"_id": 0, "user_id": 1, "points": 1}).sort("points", -1).limit(10).to_list(10)
    for entry in leaderboard:
        u = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0, "name": 1, "role": 1})
        entry["name"] = u.get("name") if u else "Anonyme"
        entry["role"] = u.get("role") if u else role

    return {
        "points": points,
        "level": level_name,
        "next_level_at": next_threshold,
        "badges": [b for b in BADGES if b["id"] in profile.get("badges", [])],
        "available_badges": BADGES,
        "available_rewards": REWARDS,
        "redeemed_rewards": profile.get("redeemed_rewards", []),
        "stats": profile.get("stats", {}),
        "daily_streak": profile.get("daily_streak", 0),
        "leaderboard": leaderboard,
    }
