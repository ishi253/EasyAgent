"""MongoDB connection helpers for the FastAPI backend."""

from __future__ import annotations

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "easyagent")

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    return get_client()[MONGODB_DB_NAME]


def get_users_collection():
    return get_database()["users"]


def agents_collection_for_user(user_id: str):
    return get_database()[f"agents_{user_id}"]


async def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
