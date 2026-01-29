from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    total_pnl = Column(Float, default=0.0)
    games_played = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class GameHistory(Base):
    __tablename__ = "game_history"
    
    id = Column(Integer, primary_key=True, index=True)
    player1_id = Column(Integer, ForeignKey("players.id"))
    player2_id = Column(Integer, ForeignKey("players.id"))
    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    pot_size = Column(Integer)
    player1_card = Column(Integer)
    player2_card = Column(Integer)
    action_history = Column(String)
    created_at = Column(DateTime, server_default=func.now())
