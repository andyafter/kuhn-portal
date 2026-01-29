from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PlayerCreate(BaseModel):
    username: str

class PlayerResponse(BaseModel):
    id: int
    username: str
    total_pnl: float
    games_played: int
    
    class Config:
        from_attributes = True

class GameState(BaseModel):
    phase: str  # "waiting", "playing", "showdown"
    pot: int
    current_player: Optional[int]
    player1: Optional[str]
    player2: Optional[str]
    player1_stack: int
    player2_stack: int
    my_card: Optional[int]
    action_history: List[str]
    winner: Optional[str]
    result_amount: Optional[int]

class GameAction(BaseModel):
    action: str  # "bet", "check", "call", "fold"
