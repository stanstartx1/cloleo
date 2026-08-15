"""Gamification API routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_current_user
from core.database import db
from core.gamification_delivery import get_gamification_data, REWARDS, add_delivery_points

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/{role}")
async def get_role_gamification(role: str, user: dict = Depends(get_current_user)):
    return await get_gamification_data(user["id"], role)


@router.post("/redeem")
async def redeem_reward(payload: dict, user: dict = Depends(get_current_user)):
    reward_id = payload.get("reward_id")
    reward = next((r for r in REWARDS if r["id"] == reward_id), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Récompense non trouvée")

    profile = await db.gamification_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    points = profile.get("points", 0) if profile else 0
    if points < reward["cost"]:
        raise HTTPException(status_code=400, detail="Points insuffisants")

    await db.gamification_profiles.update_one(
        {"user_id": user["id"]},
        {
            "$inc": {"points": -reward["cost"]},
            "$push": {"redeemed_rewards": {
                "reward_id": reward_id,
                "redeemed_at": datetime.now(timezone.utc).isoformat(),
            }},
        },
        upsert=True,
    )
    return {"ok": True, "message": f"Récompense '{reward['name']}' obtenue !"}


@router.get("/leaderboard/{role}")
async def get_leaderboard(role: str, limit: int = 20):
    users = await db.users.find({"role": role}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    user_ids = [u["id"] for u in users]
    profiles = await db.gamification_profiles.find(
        {"user_id": {"$in": user_ids}}, {"_id": 0}
    ).sort("points", -1).limit(limit).to_list(limit)
    name_map = {u["id"]: u["name"] for u in users}
    for p in profiles:
        p["name"] = name_map.get(p["user_id"], "Anonyme")
    return {"leaderboard": profiles}
