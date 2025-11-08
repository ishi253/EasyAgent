from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import List, Optional

from bson import ObjectId
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from pymongo import ReturnDocument

from agents.agent import Agent as AgentConfig
from backend.app.db import agents_collection_for_user, close_client, get_users_collection


# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "easyagent")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

app = FastAPI(title="EasyAgent Backend")
users_collection = get_users_collection()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# -----------------------------------------------------------------------------
# Utility helpers
# -----------------------------------------------------------------------------


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def validate_object_id(id_value: str) -> ObjectId:
    if not ObjectId.is_valid(id_value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid identifier.")
    return ObjectId(id_value)


# -----------------------------------------------------------------------------
# Pydantic models
# -----------------------------------------------------------------------------


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class User(BaseModel):
    id: str
    email: EmailStr


class AgentBase(BaseModel):
    name: str
    prompt: str
    tools: List[str] = Field(default_factory=list)
    need_mcp: bool = False


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    need_mcp: Optional[bool] = None


class AgentOut(AgentBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# Database adapters
# -----------------------------------------------------------------------------


async def get_user_by_email(email: str) -> Optional[dict]:
    return await users_collection.find_one({"email": email})


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = await get_user_by_email(email)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError as exc:
        raise credentials_error from exc

    user_document = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user_document:
        raise credentials_error
    return User(id=str(user_document["_id"]), email=user_document["email"])


def serialize_agent(document: dict) -> AgentOut:
    return AgentOut(
        id=str(document["_id"]),
        user_id=str(document["user_id"]),
        name=document["name"],
        prompt=document["prompt"],
        tools=document.get("tools", []),
        need_mcp=document.get("need_mcp", False),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


# -----------------------------------------------------------------------------
# Lifespan events
# -----------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event() -> None:
    await users_collection.create_index("email", unique=True)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await close_client()


# -----------------------------------------------------------------------------
# Auth endpoints
# -----------------------------------------------------------------------------


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate) -> UserOut:
    existing = await get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    user_doc = {
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "created_at": datetime.utcnow(),
    }
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    user_agents = agents_collection_for_user(user_id)
    await user_agents.create_index("user_id")
    await user_agents.create_index("created_at")
    return UserOut(id=user_id, email=user.email)


@app.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")

    access_token = create_access_token({"sub": str(user["_id"])})
    return Token(access_token=access_token)


# -----------------------------------------------------------------------------
# Agent CRUD endpoints
# -----------------------------------------------------------------------------


@app.post("/agents", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
async def create_agent(agent_in: AgentCreate, current_user: User = Depends(get_current_user)) -> AgentOut:
    agent_config = AgentConfig(
        prompt=agent_in.prompt,
        tools=agent_in.tools,
        name=agent_in.name,
        needMCP=agent_in.need_mcp,
    )
    now = datetime.utcnow()
    document = {
        "user_id": ObjectId(current_user.id),
        "name": agent_config.name,
        "prompt": agent_config.prompt,
        "tools": agent_config.tools,
        "need_mcp": agent_config.needMCP,
        "created_at": now,
        "updated_at": now,
    }
    user_agents = agents_collection_for_user(current_user.id)
    result = await user_agents.insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_agent(document)


@app.get("/agents", response_model=List[AgentOut])
async def list_agents(current_user: User = Depends(get_current_user)) -> List[AgentOut]:
    agents: List[AgentOut] = []
    user_agents = agents_collection_for_user(current_user.id)
    cursor = user_agents.find()
    async for document in cursor:
        agents.append(serialize_agent(document))
    return agents


@app.get("/agents/{agent_id}", response_model=AgentOut)
async def get_agent(agent_id: str, current_user: User = Depends(get_current_user)) -> AgentOut:
    user_agents = agents_collection_for_user(current_user.id)
    document = await user_agents.find_one({"_id": validate_object_id(agent_id)})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    return serialize_agent(document)


@app.put("/agents/{agent_id}", response_model=AgentOut)
async def update_agent(agent_id: str, agent_update: AgentUpdate, current_user: User = Depends(get_current_user)) -> AgentOut:
    update_fields = {k: v for k, v in agent_update.dict(exclude_unset=True).items()}
    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields provided.")
    if "need_mcp" in update_fields:
        update_fields["need_mcp"] = bool(update_fields["need_mcp"])
    update_fields["updated_at"] = datetime.utcnow()

    user_agents = agents_collection_for_user(current_user.id)
    document = await user_agents.find_one_and_update(
        {"_id": validate_object_id(agent_id)},
        {"$set": update_fields},
        return_document=ReturnDocument.AFTER,
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    return serialize_agent(document)


@app.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: str, current_user: User = Depends(get_current_user)) -> None:
    user_agents = agents_collection_for_user(current_user.id)
    result = await user_agents.delete_one({"_id": validate_object_id(agent_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
