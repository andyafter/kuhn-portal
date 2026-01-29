from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict, List
import json

from .database import engine, get_db, Base
from .models import Player, GameHistory
from .schemas import PlayerCreate, PlayerResponse
from .game import KuhnPokerGame, STARTING_STACK

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kuhn Poker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4040"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Game state
game = KuhnPokerGame()
connected_players: Dict[str, WebSocket] = {}

async def broadcast_state():
    """Send game state to all connected players"""
    for username, ws in connected_players.items():
        try:
            state = game.get_state_for_player(username)
            await ws.send_json({"type": "game_state", "data": state})
        except:
            pass

@app.post("/api/players", response_model=PlayerResponse)
def create_or_get_player(player: PlayerCreate, db: Session = Depends(get_db)):
    db_player = db.query(Player).filter(Player.username == player.username).first()
    if db_player:
        return db_player
    
    new_player = Player(username=player.username)
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return new_player

@app.get("/api/players/{username}", response_model=PlayerResponse)
def get_player(username: str, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.username == username).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@app.get("/api/leaderboard", response_model=List[PlayerResponse])
def get_leaderboard(db: Session = Depends(get_db)):
    return db.query(Player).order_by(Player.total_pnl.desc()).limit(10).all()

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str, db: Session = Depends(get_db)):
    await websocket.accept()
    
    # Get or create player
    player = db.query(Player).filter(Player.username == username).first()
    if not player:
        player = Player(username=username)
        db.add(player)
        db.commit()
    
    connected_players[username] = websocket
    
    try:
        # Send initial state
        state = game.get_state_for_player(username)
        await websocket.send_json({"type": "game_state", "data": state})
        await websocket.send_json({
            "type": "player_stats", 
            "data": {"total_pnl": player.total_pnl, "games_played": player.games_played}
        })
        
        while True:
            data = await websocket.receive_json()
            action_type = data.get("type")
            
            if action_type == "take_seat":
                seat = data.get("seat")
                if game.add_player(seat, username):
                    await broadcast_state()
                    # Auto-start if 2 players
                    if game.can_start():
                        game.start_hand()
                        await broadcast_state()
                else:
                    await websocket.send_json({"type": "error", "message": "Seat taken or game full"})
            
            elif action_type == "leave_seat":
                for seat, p in list(game.players.items()):
                    if p.username == username:
                        game.remove_player(seat)
                        break
                await broadcast_state()
            
            elif action_type == "action":
                action = data.get("action")
                my_seat = None
                for seat, p in game.players.items():
                    if p.username == username:
                        my_seat = seat
                        break
                
                if my_seat is not None:
                    success, msg = game.process_action(my_seat, action)
                    if success:
                        await broadcast_state()
                        
                        # If hand ended, update stats
                        if game.phase == "showdown":
                            winner_username = game.players[game.winner_seat].username
                            loser_seat = game.get_opponent_seat(game.winner_seat)
                            loser_username = game.players[loser_seat].username
                            
                            # Update database
                            winner = db.query(Player).filter(Player.username == winner_username).first()
                            loser = db.query(Player).filter(Player.username == loser_username).first()
                            
                            if winner and loser:
                                winner.total_pnl += game.result_amount
                                winner.games_played += 1
                                loser.total_pnl -= game.result_amount
                                loser.games_played += 1
                                db.commit()
                                
                                # Send updated stats
                                if winner_username in connected_players:
                                    await connected_players[winner_username].send_json({
                                        "type": "player_stats",
                                        "data": {"total_pnl": winner.total_pnl, "games_played": winner.games_played}
                                    })
                                if loser_username in connected_players:
                                    await connected_players[loser_username].send_json({
                                        "type": "player_stats",
                                        "data": {"total_pnl": loser.total_pnl, "games_played": loser.games_played}
                                    })
                    else:
                        await websocket.send_json({"type": "error", "message": msg})
            
            elif action_type == "next_hand":
                if game.phase == "showdown":
                    game.next_hand()
                    await broadcast_state()
    
    except WebSocketDisconnect:
        # Remove player from game
        for seat, p in list(game.players.items()):
            if p.username == username:
                game.remove_player(seat)
                break
        
        if username in connected_players:
            del connected_players[username]
        
        await broadcast_state()
