from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from pydantic import BaseModel
import os
from pathlib import Path

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# КОНФИГ БАЗЫ ДАННЫХ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE_URL = "sqlite:///./posts.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# МОДЕЛЬ БАЗЫ ДАННЫХ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class PostDB(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), index=True)
    text = Column(Text)
    image = Column(String(500), nullable=True)
    video = Column(String(500), nullable=True)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Создаём таблицы
Base.metadata.create_all(bind=engine)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PYDANTIC МОДЕЛИ (для API)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class PostCreate(BaseModel):
    username: str
    text: str
    image: str = None
    video: str = None

class PostResponse(BaseModel):
    id: int
    username: str
    text: str
    image: str = None
    video: str = None
    likes: int
    created_at: str
    
    class Config:
        from_attributes = True

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FASTAPI ПРИЛОЖЕНИЕ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = FastAPI(title="Posts API")

# CORS — разрешаем запросы с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/")
def read_root():
    return {"message": "Posts API работает! 🚀"}

# Создать пост
@app.post("/api/posts", response_model=PostResponse)
def create_post(post: PostCreate, db: Session = None):
    db = SessionLocal()
    try:
        db_post = PostDB(
            username=post.username,
            text=post.text,
            image=post.image,
            video=post.video
        )
        db.add(db_post)
        db.commit()
        db.refresh(db_post)
        return db_post
    finally:
        db.close()

# Получить все посты
@app.get("/api/posts", response_model=list[PostResponse])
def get_posts(skip: int = 0, limit: int = 100):
    db = SessionLocal()
    try:
        posts = db.query(PostDB).order_by(PostDB.created_at.desc()).offset(skip).limit(limit).all()
        return posts
    finally:
        db.close()

# Получить пост по ID
@app.get("/api/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: int):
    db = SessionLocal()
    try:
        post = db.query(PostDB).filter(PostDB.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        return post
    finally:
        db.close()

# Удалить пост
@app.delete("/api/posts/{post_id}")
def delete_post(post_id: int):
    db = SessionLocal()
    try:
        post = db.query(PostDB).filter(PostDB.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        db.delete(post)
        db.commit()
        return {"message": "Пост удалён"}
    finally:
        db.close()

# Лайк на пост
@app.post("/api/posts/{post_id}/like")
def like_post(post_id: int):
    db = SessionLocal()
    try:
        post = db.query(PostDB).filter(PostDB.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")
        post.likes += 1
        db.commit()
        return {"likes": post.likes}
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
