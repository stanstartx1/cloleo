"""
Push notification service for forum
Supports web push notifications and email notifications
"""

import uuid
from typing import List, Dict, Optional
from datetime import datetime, timezone
import json

from core.database import db


class NotificationService:
    """Service for managing push notifications"""
    
    NOTIFICATION_TYPES = {
        'mention': {
            'title': 'Nouvelle mention',
            'template': '{user} vous a mentionné dans un commentaire'
        },
        'reply': {
            'title': 'Nouvelle réponse',
            'template': '{user} a répondu à votre commentaire'
        },
        'topic_update': {
            'title': 'Topic mis à jour',
            'template': 'Le topic "{topic}" a été mis à jour'
        },
        'new_comment': {
            'title': 'Nouveau commentaire',
            'template': 'Nouveau commentaire dans "{topic}"'
        },
        'best_answer': {
            'title': 'Meilleure réponse !',
            'template': 'Votre réponse a été marquée comme meilleure réponse !'
        },
        'moderation': {
            'title': 'Action de modération',
            'template': 'Votre contenu a été {action}'
        },
        'achievement': {
            'title': 'Nouveau badge !',
            'template': 'Vous avez obtenu le badge "{badge}" !'
        }
    }
    
    @classmethod
    async def send_notification(
        cls,
        user_id: str,
        notification_type: str,
        data: Dict,
        channels: List[str] = None
    ) -> Dict:
        """Send notification to user via specified channels"""
        if channels is None:
            channels = ['in_app']  # Default to in-app only
        
        notification_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Get notification template
        template = cls.NOTIFICATION_TYPES.get(notification_type, {
            'title': 'Notification',
            'template': '{message}'
        })
        
        # Format message
        message = template['template'].format(**data)
        
        # Create notification record
        notification = {
            "id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": template['title'],
            "message": message,
            "data": data,
            "channels": channels,
            "read": False,
            "created_at": now
        }
        
        await db.forum_notifications.insert_one(notification)
        
        # Send via each channel
        results = {}
        for channel in channels:
            if channel == 'in_app':
                results['in_app'] = True  # Already stored in DB
            elif channel == 'push':
                results['push'] = await cls._send_push_notification(user_id, notification)
            elif channel == 'email':
                results['email'] = await cls._send_email_notification(user_id, notification)
        
        return {
            "success": True,
            "notification_id": notification_id,
            "results": results
        }
    
    @classmethod
    async def _send_push_notification(cls, user_id: str, notification: Dict) -> bool:
        """Send web push notification (placeholder - would use Web Push API)"""
        # TODO: Implement actual web push using service like Firebase Cloud Messaging
        # For now, just log
        print(f"Push notification to {user_id}: {notification['title']}")
        return True
    
    @classmethod
    async def _send_email_notification(cls, user_id: str, notification: Dict) -> bool:
        """Send email notification (placeholder - would use SendGrid/Mailgun)"""
        # TODO: Implement actual email sending
        # For now, just log
        print(f"Email notification to {user_id}: {notification['title']}")
        return True
    
    @classmethod
    async def get_user_notifications(
        cls,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a user"""
        query = {"user_id": user_id}
        
        if unread_only:
            query["read"] = False
        
        notifications = await db.forum_notifications.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return notifications
    
    @classmethod
    async def mark_as_read(cls, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        result = await db.forum_notifications.update_one(
            {"id": notification_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return result.modified_count > 0
    
    @classmethod
    async def mark_all_as_read(cls, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await db.forum_notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return result.modified_count
    
    @classmethod
    async def get_unread_count(cls, user_id: str) -> int:
        """Get unread notification count for a user"""
        count = await db.forum_notifications.count_documents({
            "user_id": user_id,
            "read": False
        })
        
        return count
    
    @classmethod
    async def delete_notification(cls, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        result = await db.forum_notifications.delete_one({
            "id": notification_id,
            "user_id": user_id
        })
        
        return result.deleted_count > 0
    
    @classmethod
    async def set_notification_preferences(
        cls,
        user_id: str,
        preferences: Dict
    ) -> Dict:
        """Set user notification preferences"""
        user_prefs = await db.forum_notification_preferences.find_one({"user_id": user_id})
        
        if user_prefs:
            await db.forum_notification_preferences.update_one(
                {"user_id": user_id},
                {"$set": {**preferences, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.forum_notification_preferences.insert_one({
                "user_id": user_id,
                **preferences,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        return {"success": True}
    
    @classmethod
    async def get_notification_preferences(cls, user_id: str) -> Optional[Dict]:
        """Get user notification preferences"""
        prefs = await db.forum_notification_preferences.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        return prefs
    
    @classmethod
    async def notify_mention(cls, mentioned_user_id: str, mentioner_name: str, topic_id: str, comment_id: str):
        """Send notification when user is mentioned"""
        await cls.send_notification(
            user_id=mentioned_user_id,
            notification_type='mention',
            data={
                'user': mentioner_name,
                'topic_id': topic_id,
                'comment_id': comment_id
            },
            channels=['in_app', 'push']
        )
    
    @classmethod
    async def notify_reply(cls, parent_author_id: str, replier_name: str, topic_id: str, comment_id: str):
        """Send notification when someone replies to comment"""
        await cls.send_notification(
            user_id=parent_author_id,
            notification_type='reply',
            data={
                'user': replier_name,
                'topic_id': topic_id,
                'comment_id': comment_id
            },
            channels=['in_app', 'push']
        )
    
    @classmethod
    async def notify_best_answer(cls, user_id: str, topic_id: str, topic_title: str):
        """Send notification when comment is marked as best answer"""
        await cls.send_notification(
            user_id=user_id,
            notification_type='best_answer',
            data={
                'topic': topic_title,
                'topic_id': topic_id
            },
            channels=['in_app', 'push', 'email']
        )


# Global instance
notification_service = NotificationService()
