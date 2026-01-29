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

## 中文说明

这是一个双人 Kuhn Poker 的网页对战入口，使用 WebSocket 实时同步牌局。

## 运行方式

### 后端（FastAPI）

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4041
```

### 前端（Next.js）

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:4040`。

## 使用方式

- 输入用户名并进入牌桌。
- 点击 “Take Seat” 坐下（总共两席）。
- 用第二个浏览器窗口或隐身窗口加入第二位玩家。
- 轮到你时使用操作按钮。
- 摊牌后点击 “Next Hand” 开始下一局。

## Kuhn Poker 规则（基于 Wikipedia）

- 牌库：3 张牌（J、Q、K）。
- 每位玩家先下 1 个底注（ante）。
- 每人发 1 张牌，第三张牌弃置且不公开。
- 每局由玩家一先行动。
- 行动：过牌或下注 1；若有人下注，对手只能跟注或弃牌。
- 过牌-过牌或下注-跟注后摊牌，比大小者胜。
- 若对手弃牌，下注者直接赢得底池。

备注：
- 没有加注；一局最多只能出现一次下注。
- 应用会在每一局开始时将双方筹码重置为 200。

来源：https://en.wikipedia.org/wiki/Kuhn_poker
