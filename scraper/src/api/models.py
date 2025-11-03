from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ValidateTweetRequest(BaseModel):
    tweet_url: str
    expected_username: str

class TweetData(BaseModel):
    tweet_id: str
    author_username: str
    author_display_name: str
    text: str
    created_at: str
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    quotes: int = 0
    bookmarks: int = 0
    views: int = 0
    deleted: bool = False
    suspended: bool = False

class ValidateTweetResponse(BaseModel):
    success: bool
    data: Optional[TweetData] = None
    error: Optional[str] = None

class CheckEngagementRequest(BaseModel):
    username: str
    tweet_id: str

class EngagementData(BaseModel):
    liked: bool = False
    retweeted: bool = False
    commented: bool = False
    bookmarked: bool = False

class CheckEngagementResponse(BaseModel):
    success: bool
    data: Optional[EngagementData] = None
    error: Optional[str] = None

class VerifyTweetRequest(BaseModel):
    tweet_url: str
    expected_username: str
    expected_code: str

class VerifyTweetResponse(BaseModel):
    success: bool
    verified: bool = False
    author: Optional[str] = None
    content: Optional[str] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None

class GetTweetResponse(BaseModel):
    success: bool
    data: Optional[TweetData] = None
    error: Optional[str] = None

class UserProfileData(BaseModel):
    username: str
    display_name: str
    bio: Optional[str] = None
    followers: int = 0
    following: int = 0
    tweets_count: int = 0
    verified: bool = False
    created_at: Optional[str] = None

class GetUserProfileResponse(BaseModel):
    success: bool
    data: Optional[UserProfileData] = None
    error: Optional[str] = None