"""
WebSocket manager for real-time forum updates
Handles connections, subscriptions, and message broadcasting
"""

import asyncio
import json
from typing import Dict, Set, Optional, Any
from datetime import datetime
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ForumWebSocketManager:
    """Manages WebSocket connections for the forum"""
    
    def __init__(self):
        # Store active connections: {user_id: {connection_id: websocket}}
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        
        # Store subscriptions: {topic_id: Set[user_id]}
        self.topic_subscriptions: Dict[str, Set[str]] = {}
        
        # Store typing indicators: {topic_id: {user_id: timestamp}}
        self.typing_indicators: Dict[str, Dict[str, float]] = {}
        
        # Store presence: {user_id: {topic_id: last_seen}}
        self.presence: Dict[str, Dict[str, float]] = {}
        
        # Store online users per topic: {topic_id: Set[user_id]}
        self.online_users: Dict[str, Set[str]] = {}
    
    async def connect(self, user_id: str, connection_id: str, websocket: Any):
        """Register a new WebSocket connection"""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        self.active_connections[user_id][connection_id] = {
            'websocket': websocket,
            'connected_at': datetime.utcnow().isoformat()
        }
        
        logger.info(f"User {user_id} connected with connection {connection_id}")
        
        # Broadcast user joined to subscribed topics
        for topic_id in self.topic_subscriptions:
            if user_id in self.topic_subscriptions[topic_id]:
                await self.broadcast_to_topic(topic_id, {
                    'type': 'user_joined',
                    'user_id': user_id,
                    'timestamp': datetime.utcnow().isoformat()
                }, exclude_user_id=user_id)
    
    async def disconnect(self, user_id: str, connection_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections and connection_id in self.active_connections[user_id]:
            del self.active_connections[user_id][connection_id]
            
            # If user has no more connections, clean up
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Remove from all topic subscriptions
                for topic_id, users in self.topic_subscriptions.items():
                    if user_id in users:
                        users.remove(user_id)
                        await self.broadcast_to_topic(topic_id, {
                            'type': 'user_left',
                            'user_id': user_id,
                            'timestamp': datetime.utcnow().isoformat()
                        })
                
                # Clean up presence
                if user_id in self.presence:
                    del self.presence[user_id]
                
                # Clean up online users
                for topic_id, users in self.online_users.items():
                    if user_id in users:
                        users.remove(user_id)
            
            logger.info(f"User {user_id} disconnected from connection {connection_id}")
    
    async def subscribe_to_topic(self, user_id: str, topic_id: str):
        """Subscribe a user to a topic"""
        if topic_id not in self.topic_subscriptions:
            self.topic_subscriptions[topic_id] = set()
        
        if user_id not in self.topic_subscriptions[topic_id]:
            self.topic_subscriptions[topic_id].add(user_id)
            
            # Add to online users
            if topic_id not in self.online_users:
                self.online_users[topic_id] = set()
            self.online_users[topic_id].add(user_id)
            
            # Add to presence
            if user_id not in self.presence:
                self.presence[user_id] = {}
            self.presence[user_id][topic_id] = datetime.utcnow().timestamp()
            
            # Broadcast user joined to topic
            await self.broadcast_to_topic(topic_id, {
                'type': 'user_joined',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }, exclude_user_id=user_id)
            
            # Send current online users to the new subscriber
            await self.send_to_user(user_id, {
                'type': 'presence_update',
                'topic_id': topic_id,
                'online_users': list(self.online_users[topic_id]),
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"User {user_id} subscribed to topic {topic_id}")
    
    async def unsubscribe_from_topic(self, user_id: str, topic_id: str):
        """Unsubscribe a user from a topic"""
        if topic_id in self.topic_subscriptions and user_id in self.topic_subscriptions[topic_id]:
            self.topic_subscriptions[topic_id].remove(user_id)
            
            # Remove from online users
            if topic_id in self.online_users and user_id in self.online_users[topic_id]:
                self.online_users[topic_id].remove(user_id)
            
            # Remove from presence
            if user_id in self.presence and topic_id in self.presence[user_id]:
                del self.presence[user_id][topic_id]
            
            # Broadcast user left
            await self.broadcast_to_topic(topic_id, {
                'type': 'user_left',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"User {user_id} unsubscribed from topic {topic_id}")
    
    async def broadcast_to_topic(self, topic_id: str, message: Dict[str, Any], exclude_user_id: Optional[str] = None):
        """Broadcast a message to all users subscribed to a topic"""
        if topic_id not in self.topic_subscriptions:
            return
        
        subscribers = self.topic_subscriptions[topic_id]
        
        for user_id in subscribers:
            if exclude_user_id and user_id == exclude_user_id:
                continue
            
            if user_id in self.active_connections:
                for connection_id, conn_data in self.active_connections[user_id].items():
                    try:
                        await conn_data['websocket'].send_json(message)
                    except Exception as e:
                        logger.error(f"Error sending to user {user_id} connection {connection_id}: {e}")
                        # Remove failed connection
                        await self.disconnect(user_id, connection_id)
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send a message to a specific user"""
        if user_id not in self.active_connections:
            return
        
        for connection_id, conn_data in self.active_connections[user_id].items():
            try:
                await conn_data['websocket'].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to user {user_id} connection {connection_id}: {e}")
                await self.disconnect(user_id, connection_id)
    
    async def set_typing(self, user_id: str, topic_id: str):
        """Set typing indicator for a user in a topic"""
        if topic_id not in self.typing_indicators:
            self.typing_indicators[topic_id] = {}
        
        self.typing_indicators[topic_id][user_id] = datetime.utcnow().timestamp()
        
        # Broadcast typing to other users in topic
        await self.broadcast_to_topic(topic_id, {
            'type': 'typing',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }, exclude_user_id=user_id)
        
        # Clear typing after 3 seconds of inactivity
        await asyncio.sleep(3)
        if user_id in self.typing_indicators.get(topic_id, {}):
            del self.typing_indicators[topic_id][user_id]
            await self.broadcast_to_topic(topic_id, {
                'type': 'typing_stopped',
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }, exclude_user_id=user_id)
    
    def get_online_users(self, topic_id: str) -> Set[str]:
        """Get online users for a topic"""
        return self.online_users.get(topic_id, set())
    
    def get_typing_users(self, topic_id: str) -> Set[str]:
        """Get users currently typing in a topic"""
        if topic_id not in self.typing_indicators:
            return set()
        
        # Filter out old typing indicators (older than 3 seconds)
        now = datetime.utcnow().timestamp()
        active_typing = {
            user_id: timestamp for user_id, timestamp in self.typing_indicators[topic_id].items()
            if now - timestamp < 3
        }
        self.typing_indicators[topic_id] = active_typing
        
        return set(active_typing.keys())
    
    async def broadcast_new_comment(self, topic_id: str, comment: Dict[str, Any]):
        """Broadcast a new comment to topic subscribers"""
        await self.broadcast_to_topic(topic_id, {
            'type': 'new_comment',
            'topic_id': topic_id,
            'comment': comment,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    async def broadcast_topic_update(self, topic_id: str, topic: Dict[str, Any]):
        """Broadcast topic update to subscribers"""
        await self.broadcast_to_topic(topic_id, {
            'type': 'topic_updated',
            'topic_id': topic_id,
            'topic': topic,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    async def broadcast_notification(self, user_id: str, notification: Dict[str, Any]):
        """Send a notification to a specific user"""
        await self.send_to_user(user_id, {
            'type': 'notification',
            'notification': notification,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(conns) for conns in self.active_connections.values())
    
    def get_topic_connection_count(self, topic_id: str) -> int:
        """Get number of users subscribed to a topic"""
        return len(self.topic_subscriptions.get(topic_id, set()))


# Global instance
forum_ws_manager = ForumWebSocketManager()
