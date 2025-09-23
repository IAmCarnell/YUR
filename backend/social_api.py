from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime, timedelta
import jwt

app = FastAPI(
    title="Pitnik Social Media API",
    description="API for the Pitnik social media platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://yurnation.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = "pitnik_secret_key_2024"

# In-memory storage (in production, use a proper database)
users_db = {}
posts_db = {}
friendships_db = {}

# Models
class User(BaseModel):
    id: str
    email: str
    name: str
    username: str
    bio: Optional[str] = ""
    location: Optional[str] = ""
    avatar: Optional[str] = ""
    created_at: datetime

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    username: str

class UserLogin(BaseModel):
    email: str
    password: str

class Post(BaseModel):
    id: str
    user_id: str
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime
    likes: int = 0
    comments: int = 0
    shares: int = 0

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = users_db.get(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Routes
@app.get("/")
async def root():
    return {"message": "Pitnik Social Media API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "platform": "Pitnik Social Media",
        "users": len(users_db),
        "posts": len(posts_db)
    }

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    for user in users_db.values():
        if user["email"] == user_data.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if user["username"] == user_data.username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "username": user_data.username,
        "bio": "",
        "location": "",
        "avatar": "",
        "created_at": datetime.utcnow().isoformat(),
        "password": user_data.password  # In production, hash this!
    }
    
    users_db[user_id] = user
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    # Remove password from response
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.post("/api/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    # Find user by email
    user = None
    for u in users_db.values():
        if u["email"] == login_data.email:
            user = u
            break
    
    if not user or user["password"] != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Remove password from response
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/api/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password"}

@app.get("/api/posts")
async def get_posts(current_user: dict = Depends(get_current_user)):
    # Return all posts sorted by creation time (newest first)
    posts = list(posts_db.values())
    posts.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Add user info to each post
    for post in posts:
        user = users_db.get(post["user_id"])
        if user:
            post["author"] = {
                "id": user["id"],
                "name": user["name"],
                "username": user["username"],
                "avatar": user["avatar"]
            }
    
    return posts

@app.post("/api/posts")
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post = {
        "id": post_id,
        "user_id": current_user["id"],
        "content": post_data.content,
        "image_url": post_data.image_url,
        "video_url": post_data.video_url,
        "created_at": datetime.utcnow().isoformat(),
        "likes": 0,
        "comments": 0,
        "shares": 0
    }
    
    posts_db[post_id] = post
    
    # Add author info
    post["author"] = {
        "id": current_user["id"],
        "name": current_user["name"],
        "username": current_user["username"],
        "avatar": current_user["avatar"]
    }
    
    return post

@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = posts_db.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Simple like system (in production, track who liked what)
    post["likes"] += 1
    posts_db[post_id] = post
    
    return {"message": "Post liked", "likes": post["likes"]}

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {k: v for k, v in user.items() if k != "password"}

# Initialize with some demo data
@app.on_event("startup")
async def initialize_data():
    # Create demo users
    demo_users = [
        {
            "id": "demo-user-1",
            "email": "john@example.com",
            "name": "John Doe",
            "username": "johndoe",
            "bio": "Software developer and tech enthusiast",
            "location": "San Francisco, CA",
            "avatar": "/api/placeholder/40/40",
            "created_at": datetime.utcnow().isoformat(),
            "password": "password123"
        },
        {
            "id": "demo-user-2",
            "email": "sarah@example.com",
            "name": "Sarah Wilson",
            "username": "sarahw",
            "bio": "Photographer and nature lover",
            "location": "New York, NY",
            "avatar": "/api/placeholder/40/40",
            "created_at": datetime.utcnow().isoformat(),
            "password": "password123"
        }
    ]
    
    for user in demo_users:
        users_db[user["id"]] = user
    
    # Create demo posts
    demo_posts = [
        {
            "id": "post-1",
            "user_id": "demo-user-1",
            "content": "Just finished my latest project! Excited to share it with everyone. Building amazing things with the Pitnik community! 🚀",
            "image_url": "/api/placeholder/600/400",
            "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "likes": 24,
            "comments": 8,
            "shares": 3
        },
        {
            "id": "post-2",
            "user_id": "demo-user-2",
            "content": "Beautiful sunset from my balcony today! Nature never ceases to amaze me. Hope everyone is having a wonderful day! 🌅",
            "image_url": "/api/placeholder/600/400",
            "created_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
            "likes": 67,
            "comments": 12,
            "shares": 5
        }
    ]
    
    for post in demo_posts:
        posts_db[post["id"]] = post

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)