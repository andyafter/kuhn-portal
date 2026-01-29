import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

ANTE = 1
BET_SIZE = 1
STARTING_STACK = 200

@dataclass
class PlayerState:
    username: str
    stack: int = STARTING_STACK
    card: Optional[int] = None
    contributed: int = 0
    folded: bool = False

@dataclass
class KuhnPokerGame:
    players: Dict[int, PlayerState] = field(default_factory=dict)
    pot: int = 0
    deck: List[int] = field(default_factory=lambda: [1, 2, 3])
    action_history: List[str] = field(default_factory=list)
    current_player_seat: int = 0  # Seat that acts first (player one)
    phase: str = "waiting"  # waiting, playing, showdown
    winner_seat: Optional[int] = None
    result_amount: int = 0
    bet_made: bool = False
    bet_seat: Optional[int] = None
    
    def add_player(self, seat: int, username: str) -> bool:
        if seat in self.players or len(self.players) >= 2:
            return False
        self.players[seat] = PlayerState(username=username)
        return True
    
    def remove_player(self, seat: int) -> bool:
        if seat in self.players:
            del self.players[seat]
            self.phase = "waiting"
            return True
        return False
    
    def can_start(self) -> bool:
        return len(self.players) == 2 and self.phase == "waiting"
    
    def start_hand(self):
        if not self.can_start():
            return
        
        # Reset state
        self.pot = 0
        self.action_history = []
        self.winner_seat = None
        self.result_amount = 0
        self.bet_made = False
        self.bet_seat = None
        
        # Reset deck
        self.deck = [1, 2, 3]
        
        # Shuffle and deal
        random.shuffle(self.deck)
        seats = sorted(self.players.keys())
        
        for i, seat in enumerate(seats):
            self.players[seat].card = self.deck[i]
            self.players[seat].contributed = 0
            self.players[seat].folded = False
        
        # Post antes
        for seat in seats:
            self.players[seat].stack -= ANTE
            self.players[seat].contributed = ANTE
            self.pot += ANTE
        
        # Player one acts first
        self.current_player_seat = seats[0]
        self.phase = "playing"
    
    def get_current_player_username(self) -> Optional[str]:
        if self.phase != "playing":
            return None
        if self.current_player_seat in self.players:
            return self.players[self.current_player_seat].username
        return None
    
    def get_opponent_seat(self, seat: int) -> int:
        seats = sorted(self.players.keys())
        return seats[1] if seats[0] == seat else seats[0]
    
    def process_action(self, seat: int, action: str) -> Tuple[bool, str]:
        if self.phase != "playing":
            return False, "Game not in playing phase"
        
        if seat != self.current_player_seat:
            return False, "Not your turn"
        
        player = self.players[seat]
        opponent_seat = self.get_opponent_seat(seat)
        
        if action == "fold":
            if not self.bet_made or seat == self.bet_seat:
                return False, "Nothing to fold to"
            player.folded = True
            self.action_history.append("fold")
            self._end_hand(opponent_seat)
            return True, "Folded"
        
        elif action == "check":
            if self.bet_made:
                return False, "Cannot check, must call or fold"
            self.action_history.append("check")
            
            # Check if hand should end
            if len(self.action_history) >= 2 and self.action_history[-2:] == ["check", "check"]:
                self._showdown()
            else:
                self.current_player_seat = opponent_seat
            return True, "Checked"
        
        elif action == "call":
            if not self.bet_made or seat == self.bet_seat:
                return False, "Nothing to call"
            call_amount = BET_SIZE
            if player.stack < call_amount:
                return False, "Insufficient stack"
            player.stack -= call_amount
            player.contributed += call_amount
            self.pot += call_amount
            self.action_history.append("call")
            self._showdown()
            return True, "Called"
        
        elif action == "bet":
            if self.bet_made:
                return False, "Bet already made"
            bet_amount = BET_SIZE
            if player.stack < bet_amount:
                return False, "Insufficient stack"
            player.stack -= bet_amount
            player.contributed += bet_amount
            self.pot += bet_amount
            self.bet_made = True
            self.bet_seat = seat
            self.action_history.append("bet")
            self.current_player_seat = opponent_seat
            return True, "Bet"
        
        return False, "Invalid action"

    def _showdown(self):
        self.phase = "showdown"
        seats = sorted(self.players.keys())
        
        p1 = self.players[seats[0]]
        p2 = self.players[seats[1]]
        
        if p1.card > p2.card:
            self._end_hand(seats[0])
        else:
            self._end_hand(seats[1])
    
    def _end_hand(self, winner_seat: int):
        self.phase = "showdown"
        self.winner_seat = winner_seat
        winner = self.players[winner_seat]
        loser_seat = self.get_opponent_seat(winner_seat)
        loser = self.players[loser_seat]
        
        # Calculate winnings (pot minus what winner put in)
        self.result_amount = self.pot - winner.contributed
        winner.stack += self.pot
    
    def next_hand(self):
        """Start new hand"""
        self.phase = "waiting"
        # Reset stacks to 200 as per requirements
        for seat in self.players:
            self.players[seat].stack = STARTING_STACK
        self.start_hand()
    
    def get_state_for_player(self, username: str) -> dict:
        my_seat = None
        for seat, player in self.players.items():
            if player.username == username:
                my_seat = seat
                break
        
        seats = sorted(self.players.keys()) if self.players else []
        p1 = self.players.get(seats[0]) if len(seats) > 0 else None
        p2 = self.players.get(seats[1]) if len(seats) > 1 else None
        
        # Determine if we should show cards (showdown phase)
        show_cards = self.phase == "showdown"
        return {
            "phase": self.phase,
            "pot": self.pot,
            "current_player": self.get_current_player_username(),
            "player1": p1.username if p1 else None,
            "player2": p2.username if p2 else None,
            "player1_stack": p1.stack if p1 else STARTING_STACK,
            "player2_stack": p2.stack if p2 else STARTING_STACK,
            "player1_card": p1.card if p1 and show_cards else None,
            "player2_card": p2.card if p2 and show_cards else None,
            "my_card": self.players[my_seat].card if my_seat is not None and self.players.get(my_seat) else None,
            "my_seat": my_seat,
            "action_history": self.action_history,
            "bet_made": self.bet_made,
            "winner": self.players[self.winner_seat].username if self.winner_seat is not None else None,
            "result_amount": self.result_amount,
        }
