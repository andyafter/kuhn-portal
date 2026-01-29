# Kuhn Portal

A simple two-player Kuhn poker portal with a live WebSocket game table.

## Run the app

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4041
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:4040` in your browser.

## How to use the portal

- Enter a username and join the table.
- Click "Take Seat" to sit (only two seats total).
- Open a second browser or incognito window for a second player.
- Use the action buttons when it is your turn.
- Click "Next Hand" after a showdown to deal again.

## Kuhn poker rules (based on Wikipedia)

- Deck: 3 cards (J, Q, K).
- Each player antes 1 chip.
- Each player is dealt one card; the third card is set aside unseen.
- Player one acts first each hand.
- Actions: check or bet 1. If a bet happens, the other player may call or fold.
- Showdown happens after check-check or bet-call; higher card wins.
- If a player folds to a bet, the bettor wins the pot.

Notes:
- No raises; only one bet is possible in a hand.
- The app resets both stacks to 200 at the start of each hand.

Source: https://en.wikipedia.org/wiki/Kuhn_poker
