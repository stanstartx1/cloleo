# WebSocket Connection Manager
from fastapi import WebSocket
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.driver_locations: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        logger.info(f"WebSocket connected to room: {room}")
    
    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            if websocket in self.active_connections[room]:
                self.active_connections[room].remove(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]
        logger.info(f"WebSocket disconnected from room: {room}")
    
    async def broadcast_to_room(self, room: str, message: dict):
        if room in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, room)
    
    async def broadcast_to_all(self, message: dict):
        for room in list(self.active_connections.keys()):
            await self.broadcast_to_room(room, message)
    
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

manager = ConnectionManager()
