# Penguuu Gambling System

A complete virtual currency gambling system for Penguuu. For entertainment only.
**Must never** involve or support real money, cryptocurrency, or any item with real-world value.
All games use the bot's virtual economy.

---

## General Requirements

Build a modern, scalable, modular gambling system.

- Use clean architecture.
- Keep each game in its own module.
- Make adding future games simple.
- Follow the existing Penguuu code style and architecture.
- Do not redesign existing systems unless necessary.
- Integrate naturally into the current bot.
- Do not introduce breaking changes.
- Thoroughly test every game before considering it complete.

Do not use em dashes anywhere in the project.
Do not overuse emojis.
Keep responses professional, clean, and easy to read.

---

## Economy Integration

All games must use the existing Penguuu economy.

Every game should support:
- Balance checks
- Minimum bet
- Maximum bet
- Daily betting limits (optional)
- Win/loss tracking
- Profit tracking
- Statistics
- Leaderboards
- Achievement progress
- Gambling experience
- Gambling level

Never allow negative balances.

---

## Commands

```
/blackjack  /slots  /plinko  /highlow  /coinflip  /dice
/roulette   /mines  /crash   /keno     /lottery   /wheel
/towers     /baccarat /war  /holdem   /jackpot   /scratch  /limbo
```

Every command should include:
- Bet amount
- Help information
- Validation
- Error handling
- Cooldowns where appropriate

---

## Games

### Blackjack
Play against the dealer. Hit, Stand, Double Down, Split, Soft hands, Blackjack payout, Dealer AI following casino rules.

### Slots
Spin multiple reels. Multiple symbols, different rarities, multipliers, bonus symbols, free spins, jackpots, animated results.

### Keno
Players select numbers. Bot randomly draws numbers. Payout increases with more matches and higher difficulty.

### High Low
Display one card. Player predicts Higher or Lower. Win streak multipliers, cash out anytime, optional Ace high/low rules.

### Texas Hold'em
Multiplayer, dealer rotation, blinds, community cards, betting rounds, folding, hand evaluation, winner calculation.

### Plinko
Drop a virtual ball. Adjustable risk, adjustable rows, different multiplier layouts, ball animation, randomized paths.

### Coin Flip
Heads or Tails. 50/50 odds.

### Roulette
Bet on Red, Black, Even, Odd, Numbers, Columns, Dozens.

### Dice
Roll Over, Roll Under, PvP, House.

### Mines
Player reveals tiles. Each safe tile increases multiplier. Cash out anytime. Lose by revealing a mine.

### Crash
Multiplier increases continuously. Players cash out before the crash. Random crash point, fair algorithm, live multiplier.

### Towers
Players climb floors. Correct choice continues. Wrong choice loses. Cash out anytime.

### Baccarat
Banker, Player, Tie. Follow official baccarat rules.

### War
Player draws a card. Dealer draws a card. Higher card wins.

### Jackpot
Players contribute bets. Winner selected randomly. Winner receives entire jackpot.

### Scratch Cards
Virtual scratch cards. Different rarities. Instant rewards.

### Wheel
Prize wheel with coins, multipliers, jackpots, bonus prizes.

### Limbo
Choose a target multiplier. If generated multiplier exceeds target, player wins based on that multiplier.

---

## Fairness

Every game should use secure randomness. Avoid predictable random generation. System should feel fair. Do not manipulate odds based on user history.

---

## Statistics

Track: total bets, total wins, total losses, net profit, biggest win, biggest loss, games played, win percentage, favorite game, current streak, longest streak.

---

## Leaderboards

Support: richest players, biggest winners, biggest gamblers, most games played, highest blackjack streak, highest slots jackpot, highest Plinko multiplier, highest crash cashout.

---

## Achievements

Examples: First Win, Lucky Streak, Blackjack Master, Slots Champion, High Roller, Jackpot Winner, Millionaire, Risk Taker, Plinko Legend, Poker Pro.

---

## Daily Features

Daily reward, daily free spin, daily scratch card, daily lottery ticket.

---

## Interactive Components

Use Discord Components V2 where appropriate. Buttons, select menus, modals. Games should feel interactive instead of command-only.

---

## User Experience

Every game should include: clear instructions, attractive embeds, smooth interaction flow, helpful error messages, responsive buttons, timeout handling, automatic cleanup.

---

## Configuration

Administrators should configure: enabled games, minimum bet, maximum bet, cooldowns, multipliers, house edge, jackpot limits, reward values through a configuration system.

---

## Security

Validate every interaction server-side. Prevent: invalid bets, duplicate interactions, race conditions, double payouts, overflow exploits, interaction spoofing.

---

## Database

Store: player balances, statistics, achievements, game history, daily rewards, cooldowns, jackpot entries. Use efficient queries and indexes.

---

## Future Expansion

Design system so new games can be added without modifying existing ones. Each game should register itself automatically.

---

## Final Expectations

Polished, modern, responsive, enjoyable while remaining simple to use. Every game integrates seamlessly with Penguuu's existing economy and architecture. Modular, secure, maintainable, thoroughly tested. Virtual in-server currency only. No real-money gambling support.
