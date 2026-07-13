from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.websocket import manager
from app.models import Order
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/admin")
async def admin_websocket(websocket: WebSocket):
    """Admin panel connects here to receive all order updates."""
    await manager.connect_admin(websocket)
    try:
        while True:
            # Keep connection alive; admin mostly listens
            data = await websocket.receive_text()
            # Optionally handle ping/pong
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
        logger.info("Admin disconnected")


@router.websocket("/order/{order_id}")
async def order_websocket(websocket: WebSocket, order_id: int):
    """Customer connects to track their specific order."""
    await manager.connect_customer(websocket, order_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_customer(websocket, order_id)


@router.websocket("/table/{table_token}")
async def table_websocket(websocket: WebSocket, table_token: str):
    """Table-level connection (used before order is placed)."""
    await manager.connect_table(websocket, table_token)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_table(websocket, table_token)
