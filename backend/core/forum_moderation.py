"""
Moderation queue system for forum
Auto-flagging, queue management, actions
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional
from pydantic import BaseModel

from core.database import db


class ModerationAction(BaseModel):
    action_type: str  # "approve", "reject", "delete", "lock", "pin"
    reason: str
    moderator_id: str


class ModerationQueue:
    """Queue for managing flagged content"""
    
    FLAG_TYPES = {
        'spam': {
            'name': 'Spam',
            'severity': 'high',
            'auto_action': 'delete'
        },
        'toxic': {
            'name': 'Contenu Toxique',
            'severity': 'high',
            'auto_action': 'delete'
        },
        'offensive': {
            'name': 'Contenu Offensant',
            'severity': 'medium',
            'auto_action': 'review'
        },
        'duplicate': {
            'name': 'Doublon',
            'severity': 'low',
            'auto_action': 'merge'
        },
        'off_topic': {
            'name': 'Hors Sujet',
            'severity': 'low',
            'auto_action': 'review'
        },
        'low_quality': {
            'name': 'Faible Qualité',
            'severity': 'low',
            'auto_action': 'review'
        }
    }
    
    @classmethod
    async def flag_content(
        cls,
        content_type: str,  # "topic" or "comment"
        content_id: str,
        flag_type: str,
        flagger_id: str,
        reason: str = "",
        auto_detected: bool = False
    ) -> Dict:
        """Flag content for moderation"""
        flag_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        flag_data = {
            "id": flag_id,
            "content_type": content_type,
            "content_id": content_id,
            "flag_type": flag_type,
            "flagger_id": flagger_id,
            "reason": reason,
            "auto_detected": auto_detected,
            "status": "pending",  # pending, reviewed, resolved
            "created_at": now,
            "updated_at": now
        }
        
        await db.forum_moderation_queue.insert_one(flag_data)
        
        # Get flag info
        flag_info = cls.FLAG_TYPES.get(flag_type, {"name": flag_type, "severity": "medium"})
        
        return {
            "success": True,
            "flag_id": flag_id,
            "flag_info": flag_info
        }
    
    @classmethod
    async def get_queue(
        cls,
        status: str = "pending",
        content_type: Optional[str] = None,
        flag_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get moderation queue"""
        query = {"status": status}
        
        if content_type:
            query["content_type"] = content_type
        
        if flag_type:
            query["flag_type"] = flag_type
        
        queue = await db.forum_moderation_queue.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Enrich with content details
        for item in queue:
            if item["content_type"] == "topic":
                content = await db.forum_topics.find_one(
                    {"id": item["content_id"]},
                    {"_id": 0, "title": 1, "content": 1, "author_name": 1}
                )
            else:
                content = await db.forum_comments.find_one(
                    {"id": item["content_id"]},
                    {"_id": 0, "content": 1, "author_name": 1}
                )
            
            item["content"] = content
            item["flag_info"] = cls.FLAG_TYPES.get(item["flag_type"], {"name": item["flag_type"]})
        
        return queue
    
    @classmethod
    async def moderate_content(
        cls,
        flag_id: str,
        action: ModerationAction,
        moderator_id: str
    ) -> Dict:
        """Take moderation action on flagged content"""
        flag = await db.forum_moderation_queue.find_one({"id": flag_id}, {"_id": 0})
        if not flag:
            return {"success": False, "message": "Flag not found"}
        
        # Update flag status
        await db.forum_moderation_queue.update_one(
            {"id": flag_id},
            {
                "$set": {
                    "status": "resolved",
                    "action": action.action_type,
                    "action_reason": action.reason,
                    "moderator_id": moderator_id,
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Execute action
        result = await cls._execute_action(flag, action)
        
        return {
            "success": True,
            "action_taken": action.action_type,
            "result": result
        }
    
    @classmethod
    async def _execute_action(cls, flag: Dict, action: ModerationAction) -> Dict:
        """Execute the moderation action"""
        content_type = flag["content_type"]
        content_id = flag["content_id"]
        
        if action.action_type == "delete":
            if content_type == "topic":
                await db.forum_topics.delete_one({"id": content_id})
                await db.forum_comments.delete_many({"topic_id": content_id})
            else:
                await db.forum_comments.delete_one({"id": content_id})
            
            return {"deleted": True}
        
        elif action.action_type == "lock":
            if content_type == "topic":
                await db.forum_topics.update_one(
                    {"id": content_id},
                    {"$set": {"is_locked": True}}
                )
            
            return {"locked": True}
        
        elif action.action_type == "pin":
            if content_type == "topic":
                await db.forum_topics.update_one(
                    {"id": content_id},
                    {"$set": {"is_pinned": True}}
                )
            
            return {"pinned": True}
        
        elif action.action_type == "approve":
            # Just mark as resolved, no action needed
            return {"approved": True}
        
        elif action.action_type == "reject":
            # Mark flag as rejected, no action on content
            return {"rejected": True}
        
        return {"unknown_action": True}
    
    @classmethod
    async def get_moderation_stats(cls) -> Dict:
        """Get moderation statistics"""
        pending = await db.forum_moderation_queue.count_documents({"status": "pending"})
        reviewed = await db.forum_moderation_queue.count_documents({"status": "reviewed"})
        resolved = await db.forum_moderation_queue.count_documents({"status": "resolved"})
        
        # Stats by flag type
        pipeline = [
            {"$group": {"_id": "$flag_type", "count": {"$sum": 1}}}
        ]
        flag_stats = await db.forum_moderation_queue.aggregate(pipeline).to_list(50)
        
        return {
            "pending": pending,
            "reviewed": reviewed,
            "resolved": resolved,
            "by_flag_type": flag_stats
        }
    
    @classmethod
    async def bulk_moderate(
        cls,
        flag_ids: List[str],
        action: ModerationAction,
        moderator_id: str
    ) -> Dict:
        """Take bulk moderation action"""
        results = []
        
        for flag_id in flag_ids:
            result = await cls.moderate_content(flag_id, action, moderator_id)
            results.append(result)
        
        return {
            "success": True,
            "processed": len(results),
            "results": results
        }
    
    @classmethod
    async def auto_detect_spam(cls, content: str) -> Optional[str]:
        """Auto-detect spam content (simple version, can be enhanced with ML)"""
        spam_keywords = ['viagra', 'casino', 'porn', 'xxx', 'click here', 'free money', 'winner']
        
        content_lower = content.lower()
        
        for keyword in spam_keywords:
            if keyword in content_lower:
                return 'spam'
        
        # Check for excessive caps
        if len([c for c in content if c.isupper()]) / len(content) > 0.7:
            return 'offensive'
        
        # Check for excessive links
        if content.count('http') > 3:
            return 'spam'
        
        return None
    
    @classmethod
    async def check_content_on_create(cls, content: str, content_type: str) -> Optional[Dict]:
        """Check content when created and auto-flag if needed"""
        detected_flag = await cls.auto_detect_spam(content)
        
        if detected_flag:
            # Auto-flag for moderation
            flag_result = await cls.flag_content(
                content_type=content_type,
                content_id="",  # Will be filled after creation
                flag_type=detected_flag,
                flagger_id="system",
                reason="Auto-detected spam/offensive content",
                auto_detected=True
            )
            
            return {
                "flagged": True,
                "flag_type": detected_flag,
                "flag_id": flag_result["flag_id"]
            }
        
        return None


# Global instance
moderation_queue = ModerationQueue()
