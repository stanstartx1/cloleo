# WebSocket Connection Manager
from fastapi import WebSocket
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone
import logging
import json

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.driver_locations: Dict[str, dict] = {}
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of rooms
        self.driver_connections: Dict[str, str] = {}  # websocket_id -> driver_id
    
    async def connect(self, websocket: WebSocket, room: str, user_id: str = None):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        
        # Track user rooms
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(room)
        
        # Track driver connections
        if room.startswith("driver_"):
            driver_id = room.replace("driver_", "")
            self.driver_connections[id(websocket)] = driver_id
        
        logger.info(f"WebSocket connected to room: {room} (user: {user_id})")
    
    def disconnect(self, websocket: WebSocket, room: str, user_id: str = None):
        if room in self.active_connections:
            if websocket in self.active_connections[room]:
                self.active_connections[room].remove(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]
        
        # Clean up user tracking
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(room)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Clean up driver tracking
        if id(websocket) in self.driver_connections:
            del self.driver_connections[id(websocket)]
        
        logger.info(f"WebSocket disconnected from room: {room} (user: {user_id})")
    
    async def broadcast_to_room(self, room: str, message: dict):
        if room in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {room}: {e}")
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, room)
            logger.info(f"Broadcast to {room}: {message.get('type', 'unknown')}")
        else:
            logger.warning(f"Room {room} has no active connections")
    
    async def broadcast_to_all_drivers(self, message: dict):
        """Broadcast to all driver rooms"""
        driver_rooms = [room for room in self.active_connections.keys() if room.startswith("driver_")]
        for room in driver_rooms:
            await self.broadcast_to_room(room, message)
        logger.info(f"Broadcast to all drivers ({len(driver_rooms)} rooms): {message.get('type', 'unknown')}")
    
    async def broadcast_to_all(self, message: dict):
        for room in list(self.active_connections.keys()):
            await self.broadcast_to_room(room, message)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all rooms a user is connected to"""
        if user_id in self.user_connections:
            for room in self.user_connections[user_id]:
                await self.broadcast_to_room(room, message)
            logger.info(f"Sent to user {user_id}: {message.get('type', 'unknown')}")
        else:
            logger.warning(f"User {user_id} has no active connections")
    
    def update_driver_location(self, driver_id: str, location: dict):
        self.driver_locations[driver_id] = {
            **location,
            "driver_id": driver_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def get_driver_location(self, driver_id: str) -> Optional[dict]:
        return self.driver_locations.get(driver_id)
    
    def get_all_driver_locations(self) -> Dict[str, dict]:
        return self.driver_locations
    
    def get_connected_drivers(self) -> List[str]:
        """Get list of driver IDs that have active WebSocket connections"""
        return list(set([
            self.driver_connections.get(conn_id) 
            for conn_id in self.driver_connections.keys()
            if self.driver_connections.get(conn_id)
        ]))
    
    def get_active_connections_count(self) -> int:
        """Get total number of active WebSocket connections"""
        return sum(len(conns) for conns in self.active_connections.values())

manager = ConnectionManager()
