"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = "ws://localhost:4041";

interface GameState {
  phase: string;
  pot: number;
  current_player: string | null;
  player1: string | null;
  player2: string | null;
  player1_stack: number;
  player2_stack: number;
  player1_card: number | null;
  player2_card: number | null;
  my_card: number | null;
  my_seat: number | null;
  action_history: string[];
  bet_made: boolean;
  winner: string | null;
  result_amount: number;
}

interface PlayerStats {
  total_pnl: number;
  games_played: number;
}

const cardDisplay: Record<number, string> = {
  1: "J",
  2: "Q",
  3: "K",
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ total_pnl: 0, games_played: 0 });
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((name: string) => {
    console.log("Connecting to WebSocket...", `${BACKEND_URL}/ws/${name}`);
    setIsConnecting(true);
    setError(null);
    
    try {
      const ws = new WebSocket(`${BACKEND_URL}/ws/${name}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnecting(false);
        setIsLoggedIn(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received:", data);
        if (data.type === "game_state") {
          setGameState(data.data);
        } else if (data.type === "player_stats") {
          setPlayerStats(data.data);
        } else if (data.type === "error") {
          setError(data.message);
          setTimeout(() => setError(null), 3000);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnecting(false);
        setIsLoggedIn(false);
        setGameState(null);
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setIsConnecting(false);
        setError("Connection error - check if backend is running on port 4041");
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setIsConnecting(false);
      setError("Failed to connect");
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      connect(username.trim());
    }
  };

  const sendMessage = (msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const takeSeat = (seat: number) => {
    sendMessage({ type: "take_seat", seat });
  };

  const leaveSeat = () => {
    sendMessage({ type: "leave_seat" });
  };

  const sendAction = (action: string) => {
    sendMessage({ type: "action", action });
  };

  const nextHand = () => {
    sendMessage({ type: "next_hand" });
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-green-950">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Kuhn Poker</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">Enter your username to join</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-center"
                disabled={isConnecting}
              />
              <Button type="submit" className="w-full" disabled={isConnecting || !username.trim()}>
                {isConnecting ? "Connecting..." : "Join Table"}
              </Button>
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMyTurn = gameState?.current_player === username;
  const amSeated = gameState?.my_seat !== null && gameState?.my_seat !== undefined;
  const betMade = gameState?.bet_made ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-950 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Kuhn Poker</h1>
          <Badge variant="outline" className="text-white border-white/30">
            {username}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-white text-sm">
            <span className="text-white/60">PNL:</span>{" "}
            <span className={playerStats.total_pnl >= 0 ? "text-green-400" : "text-red-400"}>
              {playerStats.total_pnl >= 0 ? "+" : ""}{playerStats.total_pnl}
            </span>
          </div>
          <div className="text-white text-sm">
            <span className="text-white/60">Games:</span> {playerStats.games_played}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-center">
          {error}
        </div>
      )}

      {/* Game Table */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-green-800/50 border-green-700/50 backdrop-blur">
          <CardContent className="p-8">
            {/* Player 2 (Top) */}
            <div className="flex justify-center mb-8">
              <PlayerSeat
                player={gameState?.player2 || null}
                stack={gameState?.player2_stack || 200}
                card={gameState?.player2_card}
                isCurrentPlayer={gameState?.current_player === gameState?.player2}
                isMe={gameState?.player2 === username}
                myCard={gameState?.my_seat === 1 ? gameState?.my_card : null}
                onTakeSeat={() => takeSeat(1)}
                onLeaveSeat={leaveSeat}
                canSit={!amSeated && !gameState?.player2}
                canLeave={gameState?.player2 === username && gameState?.phase === "waiting"}
              />
            </div>

            {/* Table Center - Pot and Info */}
            <div className="flex justify-center items-center gap-8 mb-8">
              <div className="bg-green-900/60 rounded-full px-8 py-4 text-center border border-green-600/30">
                <div className="text-white/60 text-xs mb-1">POT</div>
                <div className="text-3xl font-bold text-yellow-400">{gameState?.pot || 0}</div>
              </div>
              
              {gameState?.phase === "playing" && (
                <div className="text-white/80 text-sm">
                  Antes: 1 each
                </div>
              )}

              {gameState?.action_history && gameState.action_history.length > 0 && (
                <div className="text-white/60 text-sm">
                  Actions: {gameState.action_history.join(" → ")}
                </div>
              )}
            </div>

            {/* Player 1 (Bottom) */}
            <div className="flex justify-center mb-6">
              <PlayerSeat
                player={gameState?.player1 || null}
                stack={gameState?.player1_stack || 200}
                card={gameState?.player1_card}
                isCurrentPlayer={gameState?.current_player === gameState?.player1}
                isMe={gameState?.player1 === username}
                myCard={gameState?.my_seat === 0 ? gameState?.my_card : null}
                onTakeSeat={() => takeSeat(0)}
                onLeaveSeat={leaveSeat}
                canSit={!amSeated && !gameState?.player1}
                canLeave={gameState?.player1 === username && gameState?.phase === "waiting"}
              />
            </div>

            {/* Action Buttons */}
            {amSeated && gameState?.phase === "playing" && isMyTurn && (
              <div className="flex justify-center gap-4 mt-6">
                {!betMade && (
                  <>
                    <Button
                      onClick={() => sendAction("check")}
                      variant="secondary"
                      size="lg"
                    >
                      Check
                    </Button>
                    <Button
                      onClick={() => sendAction("bet")}
                      size="lg"
                    >
                      Bet
                    </Button>
                  </>
                )}
                {betMade && (
                  <>
                    <Button
                      onClick={() => sendAction("fold")}
                      variant="destructive"
                      size="lg"
                    >
                      Fold
                    </Button>
                    <Button
                      onClick={() => sendAction("call")}
                      variant="secondary"
                      size="lg"
                    >
                      Call
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Showdown Result */}
            {gameState?.phase === "showdown" && (
              <div className="text-center mt-6 space-y-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {gameState.winner === username ? "You Won!" : `${gameState.winner} Wins!`}
                </div>
                <div className="text-white/80">
                  Won {gameState.result_amount} chips
                </div>
                {amSeated && (
                  <Button onClick={nextHand} size="lg">
                    Next Hand
                  </Button>
                )}
              </div>
            )}

            {/* Waiting for players */}
            {gameState?.phase === "waiting" && (
              <div className="text-center text-white/60 mt-4">
                {!gameState.player1 || !gameState.player2
                  ? "Waiting for players to take seats..."
                  : "Starting..."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rules */}
      <div className="max-w-4xl mx-auto mt-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-2">Kuhn Poker Rules</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• 3-card deck: Jack (J), Queen (Q), King (K)</li>
              <li>• Each player antes 1 chip</li>
              <li>• Each player receives one card</li>
              <li>• Third card is set aside unseen</li>
              <li>• Player one acts first each hand</li>
              <li>• Higher card wins at showdown (K &gt; Q &gt; J)</li>
              <li>• Actions: Check, Bet, Call, Fold (single betting round)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PlayerSeatProps {
  player: string | null;
  stack: number;
  card: number | null;
  isCurrentPlayer: boolean;
  isMe: boolean;
  myCard: number | null;
  onTakeSeat: () => void;
  onLeaveSeat: () => void;
  canSit: boolean;
  canLeave: boolean;
}

function PlayerSeat({
  player,
  stack,
  card,
  isCurrentPlayer,
  isMe,
  myCard,
  onTakeSeat,
  onLeaveSeat,
  canSit,
  canLeave,
}: PlayerSeatProps) {
  const displayCard = isMe ? myCard : card;

  if (!player) {
    return (
      <div className="w-48 h-32 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
        {canSit ? (
          <Button variant="ghost" className="text-white/60" onClick={onTakeSeat}>
            Take Seat
          </Button>
        ) : (
          <span className="text-white/40">Empty Seat</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-48 rounded-xl p-4 transition-all ${
        isCurrentPlayer
          ? "bg-yellow-500/20 border-2 border-yellow-500 shadow-lg shadow-yellow-500/20"
          : "bg-black/30 border border-white/20"
      } ${isMe ? "ring-2 ring-blue-500/50" : ""}`}
    >
      {/* Player Info */}
      <div className="text-center">
        <div className="text-white font-semibold flex items-center justify-center gap-2">
          {player}
          {isMe && <Badge variant="secondary" className="text-xs">You</Badge>}
        </div>
        <div className="text-white/60 text-sm mt-1">Stack: {stack}</div>
      </div>

      {/* Card Display */}
      <div className="flex justify-center mt-3">
        {displayCard ? (
          <div className="w-12 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <span
              className={`text-2xl font-bold ${
                displayCard === 1 ? "text-gray-600" : displayCard === 2 ? "text-red-500" : "text-yellow-600"
              }`}
            >
              {cardDisplay[displayCard]}
            </span>
          </div>
        ) : (
          <div className="w-12 h-16 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 shadow-lg" />
        )}
      </div>

      {/* Leave button */}
      {canLeave && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-white/60 hover:text-white"
          onClick={onLeaveSeat}
        >
          Leave
        </Button>
      )}
    </div>
  );
}
