# Pydantic models for the Forum system
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ForumCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    target_role: Optional[str] = "all"  # "vendor", "enterprise", "all"


class ForumCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class ForumTopicCreate(BaseModel):
    category_id: str
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=10000)
    is_pinned: bool = False
    is_locked: bool = False


class ForumTopicUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None


class ForumCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[str] = None  # For nested comments
    media_url: Optional[str] = None
    audio_url: Optional[str] = None


class ForumCommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ForumReactionCreate(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=50)


class ForumSearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    author_id: Optional[str] = None
    sort_by: str = "recent"  # recent, popular, views
