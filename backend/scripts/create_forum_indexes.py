#!/usr/bin/env python3
"""
Create database indexes for forum collections for optimal performance
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import db


async def create_forum_indexes():
    """Create indexes for forum collections"""
    
    print("Creating forum indexes...")
    
    # Forum categories indexes
    await db.forum_categories.create_index([("sort_order", 1)])
    await db.forum_categories.create_index([("name", 1)])
    print("✅ Forum categories indexes created")
    
    # Forum topics indexes
    await db.forum_topics.create_index([("category_id", 1)])
    await db.forum_topics.create_index([("author_id", 1)])
    await db.forum_topics.create_index([("created_at", -1)])
    await db.forum_topics.create_index([("updated_at", -1)])
    await db.forum_topics.create_index([("is_pinned", -1), ("updated_at", -1)])
    await db.forum_topics.create_index([("view_count", -1)])
    await db.forum_topics.create_index([("tags", 1)])
    await db.forum_topics.create_index([("title", "text"), ("content", "text")])  # Text search
    print("✅ Forum topics indexes created")
    
    # Forum comments indexes
    await db.forum_comments.create_index([("topic_id", 1)])
    await db.forum_comments.create_index([("author_id", 1)])
    await db.forum_comments.create_index([("parent_id", 1)])
    await db.forum_comments.create_index([("created_at", -1)])
    await db.forum_comments.create_index([("topic_id", 1), ("created_at", -1)])
    print("✅ Forum comments indexes created")
    
    print("\n✅ All forum indexes created successfully")


if __name__ == "__main__":
    asyncio.run(create_forum_indexes())
