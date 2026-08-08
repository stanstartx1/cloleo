import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from bson import ObjectId

from core.database import db
from core.auth import get_current_user, require_admin
from models.forum_schemas import (
    ForumCategoryCreate, ForumCategoryUpdate,
    ForumTopicCreate, ForumTopicUpdate,
    ForumCommentCreate, ForumCommentUpdate,
    ForumReactionCreate, ForumSearchQuery
)

router = APIRouter(prefix="/forum", tags=["Forum"])


# ==================== CATEGORIES ====================

@router.get("/categories")
async def get_categories(user: dict = Depends(get_current_user)):
    """Get all forum categories - optimized with aggregation (requires authentication)"""
    categories = await db.forum_categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    
    # Add topic count for each category using aggregation for better performance
    category_ids = [c["id"] for c in categories]
    if category_ids:
        topic_counts = await db.forum_topics.aggregate([
            {"$match": {"category_id": {"$in": category_ids}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}}
        ]).to_list(100)
        
        count_map = {doc["_id"]: doc["count"] for doc in topic_counts}
        for category in categories:
            category["topic_count"] = count_map.get(category["id"], 0)
    else:
        for category in categories:
            category["topic_count"] = 0
    
    return categories


@router.get("/categories/{category_id}")
async def get_category(category_id: str, user: dict = Depends(get_current_user)):
    """Get a specific category with its topics - optimized with aggregation (requires authentication)"""
    category = await db.forum_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get topics for this category with comment counts in single aggregation
    topics = await db.forum_topics.aggregate([
        {"$match": {"category_id": category_id}},
        {"$sort": {"is_pinned": -1, "updated_at": -1}},
        {"$limit": 50},
        {"$lookup": {
            "from": "forum_comments",
            "localField": "id",
            "foreignField": "topic_id",
            "as": "comments"
        }},
        {"$addFields": {"comment_count": {"$size": "$comments"}}},
        {"$project": {
            "_id": 0,
            "comments": 0
        }}
    ]).to_list(50)
    
    # Get last comment for each topic
    for topic in topics:
        last_comment = await db.forum_comments.find_one(
            {"topic_id": topic["id"]},
            {"_id": 0, "created_at": 1, "author_name": 1}
        ).sort("created_at", -1)
        topic["last_comment"] = last_comment
    
    category["topics"] = topics
    return category


@router.post("/categories")
async def create_category(category: ForumCategoryCreate, user: dict = Depends(require_admin)):
    """Create a new forum category (admin only)"""
    category_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    category_data = {
        "id": category_id,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "color": category.color,
        "sort_order": category.sort_order,
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.forum_categories.insert_one(category_data)
    category_data.pop("_id", None)
    return category_data


@router.put("/categories/{category_id}")
async def update_category(category_id: str, category: ForumCategoryUpdate, user: dict = Depends(require_admin)):
    """Update a forum category (admin only)"""
    existing = await db.forum_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    if category.name is not None:
        update_data["name"] = category.name
    if category.description is not None:
        update_data["description"] = category.description
    if category.icon is not None:
        update_data["icon"] = category.icon
    if category.color is not None:
        update_data["color"] = category.color
    if category.sort_order is not None:
        update_data["sort_order"] = category.sort_order
    
    await db.forum_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.forum_categories.find_one({"id": category_id}, {"_id": 0})
    return updated


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    """Delete a forum category (admin only)"""
    existing = await db.forum_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Delete all topics in this category
    await db.forum_topics.delete_many({"category_id": category_id})
    
    # Delete the category
    await db.forum_categories.delete_one({"id": category_id})
    
    return {"message": "Category deleted successfully"}


# ==================== TOPICS ====================

@router.get("/topics")
async def get_topics(
    category_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = "recent",
    user: dict = Depends(get_current_user)
):
    """Get forum topics with pagination - optimized with aggregation (requires authentication)"""
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    # Sorting
    sort_field = "updated_at"
    if sort == "popular":
        sort_field = "view_count"
    elif sort == "views":
        sort_field = "view_count"
    
    skip = (page - 1) * limit
    
    # Use aggregation for better performance with counts
    pipeline = [
        {"$match": query},
        {"$sort": {sort_field: -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "forum_comments",
            "localField": "id",
            "foreignField": "topic_id",
            "as": "comments"
        }},
        {"$addFields": {"comment_count": {"$size": "$comments"}}},
        {"$project": {
            "_id": 0,
            "comments": 0
        }}
    ]
    
    topics = await db.forum_topics.aggregate(pipeline).to_list(limit)
    
    # Get last comment for each topic
    for topic in topics:
        last_comment = await db.forum_comments.find_one(
            {"topic_id": topic["id"]},
            {"_id": 0, "created_at": 1, "author_name": 1}
        ).sort("created_at", -1)
        topic["last_comment"] = last_comment
    
    total = await db.forum_topics.count_documents(query)
    
    return {
        "topics": topics,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str, user: dict = Depends(get_current_user)):
    """Get a specific topic with its comments (requires authentication)"""
    topic = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Increment view count
    await db.forum_topics.update_one({"id": topic_id}, {"$inc": {"view_count": 1}})
    
    # Get comments for this topic
    comments = await db.forum_comments.find(
        {"topic_id": topic_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Build comment tree (handle nested comments)
    comment_map = {c["id"]: c for c in comments}
    root_comments = []
    
    for comment in comments:
        comment["replies"] = []
        if comment.get("parent_id"):
            parent = comment_map.get(comment["parent_id"])
            if parent:
                parent["replies"].append(comment)
        else:
            root_comments.append(comment)
    
    topic["comments"] = root_comments
    topic["comment_count"] = len(comments)
    
    return topic


@router.post("/topics")
async def create_topic(topic: ForumTopicCreate, user: dict = Depends(get_current_user)):
    """Create a new forum topic"""
    topic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Verify category exists
    category = await db.forum_categories.find_one({"id": topic.category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    topic_data = {
        "id": topic_id,
        "category_id": topic.category_id,
        "title": topic.title,
        "content": topic.content,
        "tags": topic.tags or [],
        "is_pinned": topic.is_pinned,
        "is_locked": topic.is_locked,
        "author_id": user["id"],
        "author_name": user.get("name", "Anonymous"),
        "author_avatar": user.get("profile_photo"),
        "view_count": 0,
        "comment_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.forum_topics.insert_one(topic_data)
    topic_data.pop("_id", None)
    return topic_data


@router.put("/topics/{topic_id}")
async def update_topic(topic_id: str, topic: ForumTopicUpdate, user: dict = Depends(get_current_user)):
    """Update a forum topic"""
    existing = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Check ownership or admin
    if existing["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this topic")
    
    if existing.get("is_locked") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Topic is locked")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if topic.title is not None:
        update_data["title"] = topic.title
    if topic.content is not None:
        update_data["content"] = topic.content
    if topic.tags is not None:
        update_data["tags"] = topic.tags
    if topic.is_pinned is not None and user.get("role") == "admin":
        update_data["is_pinned"] = topic.is_pinned
    if topic.is_locked is not None and user.get("role") == "admin":
        update_data["is_locked"] = topic.is_locked
    
    await db.forum_topics.update_one({"id": topic_id}, {"$set": update_data})
    
    updated = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    return updated


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, user: dict = Depends(get_current_user)):
    """Delete a forum topic"""
    existing = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Check ownership or admin
    if existing["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this topic")
    
    # Delete all comments in this topic
    await db.forum_comments.delete_many({"topic_id": topic_id})
    
    # Delete the topic
    await db.forum_topics.delete_one({"id": topic_id})
    
    return {"message": "Topic deleted successfully"}


# ==================== COMMENTS ====================

@router.post("/topics/{topic_id}/comments")
async def create_comment(topic_id: str, comment: ForumCommentCreate, user: dict = Depends(get_current_user)):
    """Create a new comment on a topic"""
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Verify topic exists
    topic = await db.forum_topics.find_one({"id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if topic.get("is_locked"):
        raise HTTPException(status_code=403, detail="Topic is locked")
    
    # Verify parent comment if provided
    if comment.parent_id:
        parent = await db.forum_comments.find_one({"id": comment.parent_id}, {"_id": 0})
        if not parent or parent["topic_id"] != topic_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    comment_data = {
        "id": comment_id,
        "topic_id": topic_id,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "author_id": user["id"],
        "author_name": user.get("name", "Anonymous"),
        "author_avatar": user.get("profile_photo"),
        "reactions": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.forum_comments.insert_one(comment_data)
    
    # Update topic comment count and updated_at
    await db.forum_topics.update_one(
        {"id": topic_id},
        {
            "$inc": {"comment_count": 1},
            "$set": {"updated_at": now}
        }
    )
    
    comment_data.pop("_id", None)
    return comment_data


@router.put("/comments/{comment_id}")
async def update_comment(comment_id: str, comment: ForumCommentUpdate, user: dict = Depends(get_current_user)):
    """Update a comment"""
    existing = await db.forum_comments.find_one({"id": comment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check ownership or admin
    if existing["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    
    update_data = {
        "content": comment.content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.forum_comments.update_one({"id": comment_id}, {"$set": update_data})
    
    updated = await db.forum_comments.find_one({"id": comment_id}, {"_id": 0})
    return updated


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    """Delete a comment"""
    existing = await db.forum_comments.find_one({"id": comment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check ownership or admin
    if existing["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    topic_id = existing["topic_id"]
    
    # Delete the comment and all its replies
    await db.forum_comments.delete_many({"$or": [{"id": comment_id}, {"parent_id": comment_id}]})
    
    # Update topic comment count
    comment_count = await db.forum_comments.count_documents({"topic_id": topic_id})
    await db.forum_topics.update_one(
        {"id": topic_id},
        {"$set": {"comment_count": comment_count}}
    )
    
    return {"message": "Comment deleted successfully"}


# ==================== REACTIONS ====================

@router.post("/comments/{comment_id}/reactions")
async def add_reaction(comment_id: str, reaction: ForumReactionCreate, user: dict = Depends(get_current_user)):
    """Add a reaction to a comment"""
    existing = await db.forum_comments.find_one({"id": comment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user already reacted with this emoji
    reactions = existing.get("reactions", [])
    for r in reactions:
        if r["user_id"] == user["id"] and r["emoji"] == reaction.emoji:
            # Remove the reaction (toggle)
            await db.forum_comments.update_one(
                {"id": comment_id},
                {"$pull": {"reactions": {"user_id": user["id"], "emoji": reaction.emoji}}}
            )
            return {"message": "Reaction removed"}
    
    # Add the reaction
    await db.forum_comments.update_one(
        {"id": comment_id},
        {
            "$push": {
                "reactions": {
                    "user_id": user["id"],
                    "user_name": user.get("name", "Anonymous"),
                    "emoji": reaction.emoji,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"message": "Reaction added"}


# ==================== SEARCH ====================

@router.post("/search")
async def search_forum(search: ForumSearchQuery, user: dict = Depends(get_current_user)):
    """Search forum topics (requires authentication)"""
    query = {
        "$or": [
            {"title": {"$regex": search.query, "$options": "i"}},
            {"content": {"$regex": search.query, "$options": "i"}},
            {"tags": {"$in": [search.query]}}
        ]
    }
    
    if search.category_id:
        query["category_id"] = search.category_id
    
    if search.tags:
        query["tags"] = {"$in": search.tags}
    
    if search.author_id:
        query["author_id"] = search.author_id
    
    # Sorting
    sort_field = "updated_at"
    if search.sort_by == "popular":
        sort_field = "view_count"
    elif search.sort_by == "views":
        sort_field = "view_count"
    
    topics = await db.forum_topics.find(
        query,
        {"_id": 0}
    ).sort(sort_field, -1).to_list(50)
    
    # Add comment counts
    for topic in topics:
        comment_count = await db.forum_comments.count_documents({"topic_id": topic["id"]})
        topic["comment_count"] = comment_count
    
    return {
        "results": topics,
        "total": len(topics)
    }


# ==================== STATS ====================

@router.get("/stats")
async def get_forum_stats(user: dict = Depends(get_current_user)):
    """Get forum statistics (requires authentication)"""
    category_count = await db.forum_categories.count_documents({})
    topic_count = await db.forum_topics.count_documents({})
    comment_count = await db.forum_comments.count_documents({})
    
    # Get recent activity
    recent_topics = await db.forum_topics.find(
        {},
        {"_id": 0, "title": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(5)
    
    recent_comments = await db.forum_comments.find(
        {},
        {"_id": 0, "content": 1, "created_at": 1, "author_name": 1}
    ).sort("created_at", -1).to_list(5)
    
    return {
        "category_count": category_count,
        "topic_count": topic_count,
        "comment_count": comment_count,
        "recent_topics": recent_topics,
        "recent_comments": recent_comments
    }
