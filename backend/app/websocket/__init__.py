from typing import Dict, List, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time order updates."""

    def __init__(self):
        # Admin connections: list of websockets
        self.admin_connections: List[WebSocket] = []
        # Customer connections: keyed by order_id
        self.customer_connections: Dict[int, List[WebSocket]] = {}
        # Table connections: keyed by table_token
        self.table_connections: Dict[str, List[WebSocket]] = {}

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)
        logger.info(f"Admin connected. Total: {len(self.admin_connections)}")

    async def connect_customer(self, websocket: WebSocket, order_id: int):
        await websocket.accept()
        if order_id not in self.customer_connections:
            self.customer_connections[order_id] = []
        self.customer_connections[order_id].append(websocket)

    async def connect_table(self, websocket: WebSocket, table_token: str):
        await websocket.accept()
        if table_token not in self.table_connections:
            self.table_connections[table_token] = []
        self.table_connections[table_token].append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    def disconnect_customer(self, websocket: WebSocket, order_id: int):
        if order_id in self.customer_connections:
            conns = self.customer_connections[order_id]
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                del self.customer_connections[order_id]

    def disconnect_table(self, websocket: WebSocket, table_token: str):
        if table_token in self.table_connections:
            conns = self.table_connections[table_token]
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                del self.table_connections[table_token]

    async def broadcast_to_admins(self, data: Any):
        """Send a message to all connected admin clients."""
        message = json.dumps(data)
        dead = []
        for ws in self.admin_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.admin_connections.remove(ws)

    async def broadcast_to_order(self, order_id: int, data: Any):
        """Send an update to all customers watching a specific order."""
        message = json.dumps(data)
        if order_id not in self.customer_connections:
            return
        dead = []
        for ws in self.customer_connections[order_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.customer_connections[order_id].remove(ws)

    async def broadcast_order_update(self, order_data: dict):
        """Broadcast an order update to both admins and relevant customers."""
        order_id = order_data.get("id")
        payload = {"type": "order_update", "data": order_data}
        await self.broadcast_to_admins(payload)
        if order_id:
            await self.broadcast_to_order(order_id, payload)

    async def broadcast_new_order(self, order_data: dict):
        """Notify admins of a new incoming order."""
        payload = {"type": "new_order", "data": order_data}
        await self.broadcast_to_admins(payload)


# Global singleton
manager = ConnectionManager()
