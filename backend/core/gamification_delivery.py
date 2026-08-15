"""Gamification for delivery ecosystem."""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
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

REWARD_EFFECTS = {
    "priority_orders": {"priority_until_hours": 24},
    "fee_discount": {"discount_percent": 10, "valid_hours": 48},
    "badge_boost": {"boost_days": 7},
}


async def add_delivery_points(user_id: str, action: str, custom_points: int = None):
    points = custom_points or POINTS_MAP.get(action, 5)
    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {
            "$inc": {"points": points, f"stats.{action}": 1},
            "$setOnInsert": {"user_id": user_id, "badges": [], "redeemed_rewards": [], "active_effects": []},
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


async def update_delivery_streak(user_id: str):
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    last = profile.get("last_delivery_date")
    streak = profile.get("daily_streak", 0)

    if last == today:
        return streak

    yesterday = (now - timedelta(days=1)).date().isoformat()
    if last == yesterday:
        streak += 1
    else:
        streak = 1

    update = {"daily_streak": streak, "last_delivery_date": today, "updated_at": now.isoformat()}
    if streak >= 7 and streak % 7 == 0:
        await add_delivery_points(user_id, "weekly_streak", POINTS_MAP["weekly_streak"])

    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {"$set": update},
        upsert=True,
    )
    return streak


def _parse_ts(ts: str) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


async def check_on_time_delivery(order: dict) -> bool:
    eta = order.get("eta_minutes")
    in_transit_at = order.get("in_transit_at")
    delivered_at = order.get("delivered_at") or datetime.now(timezone.utc).isoformat()
    if not eta or not in_transit_at:
        return False
    start = _parse_ts(in_transit_at)
    end = _parse_ts(delivered_at)
    if not start or not end:
        return False
    actual_minutes = (end - start).total_seconds() / 60
    return actual_minutes <= eta + 5


async def apply_reward_effect(user_id: str, reward_id: str):
    effect = REWARD_EFFECTS.get(reward_id)
    if not effect:
        return
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=effect.get("valid_hours") or effect.get("priority_until_hours") or effect.get("boost_days", 0) * 24)
    await db.gamification_profiles.update_one(
        {"user_id": user_id},
        {
            "$push": {"active_effects": {
                "reward_id": reward_id,
                "effect": effect,
                "expires_at": expires.isoformat(),
                "applied_at": now.isoformat(),
            }},
        },
        upsert=True,
    )


async def has_active_effect(user_id: str, reward_id: str) -> bool:
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0, "active_effects": 1})
    now = datetime.now(timezone.utc).isoformat()
    for effect in profile.get("active_effects", []) if profile else []:
        if effect.get("reward_id") == reward_id and effect.get("expires_at", "") > now:
            return True
    return False


async def get_gamification_data(user_id: str, role: str) -> dict:
    profile = await db.gamification_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {
        "points": 0, "badges": [], "stats": {}, "redeemed_rewards": [], "active_effects": [],
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

    now = datetime.now(timezone.utc).isoformat()
    active_effects = [
        e for e in profile.get("active_effects", [])
        if e.get("expires_at", "") > now
    ]

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
        "active_effects": active_effects,
        "stats": profile.get("stats", {}),
        "daily_streak": profile.get("daily_streak", 0),
        "leaderboard": leaderboard,
    }
