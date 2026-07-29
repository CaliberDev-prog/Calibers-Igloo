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

## Economy

### Currencies

Support multiple virtual currencies with enable/disable per currency:

- **Coins** (primary) - earned from gambling, daily rewards, and achievements
- **Gems** (premium) - earned from high-tier achievements, special events, and progression milestones
- **Tokens** (event) - time-limited currency for seasonal events and tournaments

Each currency has:
- Configurable name and symbol
- Enable/disable toggle
- Configurable starting balance
- Minimum and maximum balance limits
- Separate transaction history

### Economy Features

- **Starting balance**: Configurable per currency (default 1000 coins, 0 gems, 0 tokens)
- **Transaction log**: Immutable history with type (bet, win, loss, daily, pay, admin, purchase), amount, balance snapshot, timestamp, and reference ID
- **Inflation controls**: Configurable caps on daily rewards, max bet sizes, and jackpot pools
- **Economy reset tools**: Admin-only commands to reset individual users or the entire economy, with audit logging
- **Manual adjustments**: Admin commands to credit or debit currency with required reason field and audit trail
- **Anti-exploit**: Negative balance prevention, maximum bet limits per game, cooldowns, rate limiting on balance-sensitive commands

### Economy Commands

- `/balance` - Check your balance (all currencies)
- `/pay <user> <amount> [currency]` - Transfer currency to another user
- `/leaderboard [currency]` - View richest players
- `/profile [user]` - View gambling profile, stats, titles, badges

---

## Economy Integration

Every game must use the shared economy service. Games never manage balances directly.

Every game should support:
- Balance checks before betting
- Minimum and maximum bet enforcement
- Win/loss tracking per game
- Profit tracking per game
- Gambling experience and level progression
- Daily, weekly, and monthly betting limits (configurable per game)
- Achievement progress hooks

Never allow negative balances. All balance mutations use atomic MongoDB operations.

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

## Commands

Every command should include:
- Bet amount with validation
- Help information accessible via `/help <game>`
- Input validation (bet bounds, balance check, cooldown check)
- Error handling with user-friendly messages
- Cooldowns where appropriate (configurable per game)

---

## Fairness

- Every game uses secure randomness (`crypto.randomBytes` or `crypto.getRandomValues`).
- Configurable RTP (Return to Player) per game, adjustable by administrators.
- Provably fair architecture recommended: server seed, client seed, nonce, and SHA-256 hash verification.
- Do not manipulate odds based on user history, balance, or play frequency.
- Daily and weekly betting limits enforced server-side per user.
- Anti-abuse detection: flag unusual patterns (rapid betting, statistical anomalies, multi-account farming).
- Self-exclusion: users can disable gambling on their account. Configurable timeout (24h, 7d, 30d, permanent) with no undo during active exclusion.

---

## Statistics

Track per user and per game:
- Total bets placed
- Total wins
- Total losses
- Net profit (across all games and per game)
- Biggest single win
- Biggest single loss
- Games played (per game and total)
- Win percentage
- Favorite game (most played)
- Current win/loss streak
- Longest win/loss streak
- Total wagered amount
- Total time spent gambling

---

## Leaderboards

Support multiple leaderboard views with configurable reset intervals (all-time, monthly, weekly, seasonal):

- Richest players (by net worth)
- Biggest winners (by net profit)
- Biggest gamblers (by total wagered)
- Most games played
- Highest blackjack streak
- Highest slots jackpot hit
- Highest Plinko multiplier achieved
- Highest crash cashout multiplier
- Seasonal leaderboards with rewards

Leaderboards cache and refresh on a configurable interval (default 60s).

---

## Achievements

Achievements unlock permanently and are tracked per user. Examples:

- First Win - Place your first winning bet
- Lucky Streak - Win 5 bets in a row
- Blackjack Master - Win 100 blackjack hands
- Slots Champion - Hit the jackpot on any slot machine
- High Roller - Place a single bet of 10,000+ coins
- Jackpot Winner - Win a jackpot pool
- Millionaire - Reach 1,000,000 coins net worth
- Risk Taker - Play every available game at least once
- Plinko Legend - Achieve the maximum Plinko multiplier
- Poker Pro - Win 50 Texas Hold'em hands
- Daily Devotion - Claim 30 daily rewards in a row
- Gambling Addict - Play 1000 games total

Each achievement has: id, name, description, icon, category, criteria (type + threshold), reward (currency amount + XP), and hidden flag.

---

## Player Progression

### Gambling Profile

Accessed via `/profile [user]`. Displays:
- Current level and XP
- Titles (earned, equipped)
- Badges (earned, displayed)
- Statistics summary
- Achievement progress
- Current rank on leaderboards

### Titles and Badges

- **Titles**: Earned from achievements, leaderboard placement, seasonal events. Displayed next to username in gambling embeds. Example: "The High Roller", "Lucky Star", "Poker Face".
- **Badges**: Earned from milestones and special events. Displayed on profile. Example: 1K Bets badge, Millionaire badge, Season 1 Champion badge.

### Seasons

- Seasonal levels reset each season (configurable duration, default 3 months).
- Seasonal leaderboards with exclusive titles and badges as rewards.
- Prestige system: reset season level for a permanent badge showing your prestige tier.

### Challenges

- Daily challenges (e.g., "Win 3 blackjack hands today")
- Weekly challenges (e.g., "Earn 5000 coins from slots this week")
- Monthly challenges (e.g., "Play 10 different games this month")

---

## Social Features

- **PvP betting**: Challenge another user to a head-to-head game (Duel, War, Coin Flip) with both parties wagering.
- **Guild or team competitions**: Compete as a group for combined wagering targets.
- **Friend leaderboards**: Compare stats with friends (optional opt-in).
- **Spectate**: Watch ongoing Blackjack or Texas Hold'em games in read-only mode.
- **Tournaments**: Scheduled events with entry fees, prize pools, and automated bracket/leaderboard management.

---

## Shop

Spend currency on non-monetary cosmetics and utilities:

- **Profile themes**: Change the color scheme of your `/profile` embed
- **Profile backgrounds**: Custom banner image on your profile
- **Chat badges**: Special badge displayed next to your name in gambling interactions
- **Name colors**: Colored display name in gambling embeds
- **Crate keys**: Keys to open loot crates with random cosmetic rewards
- **Temporary boosters**: 2x XP, 2x coins from games, reduced cooldowns (24h duration)
- **Lucky charms**: Small percentage boost to win probability for a limited time (configurable per game)
- **Daily streak protection**: Freeze your daily streak so it doesn't reset on a missed day
- **Cosmetic titles**: Purchase exclusive titles from the shop

---

## Daily Features

- **Daily reward**: Configurable currency amount, 24h cooldown, streak tracking with bonus for consecutive days
- **Daily free spin**: One free slot spin per day (no bet required, winnings still awarded)
- **Daily scratch card**: One free scratch card per day
- **Daily lottery ticket**: One free lottery entry per day
- All daily features reset on a configurable schedule (default midnight UTC)

---

## Interactive Components

Use Discord Components V2 where appropriate:
- Buttons for game actions (Hit, Stand, Double Down, Cash Out, Reveal)
- Select menus for choices (bet amount, number selection in Keno, Roulette bets)
- Modals for complex input (custom bet amounts, player profiles)

Games should feel interactive instead of command-only. Every interaction has a configurable timeout (default 120s) with automatic cleanup.

---

## User Experience

Every game should include:
- Clear instructions displayed at the start
- Attractive embeds using the Penguuu design system (icy-blue theme)
- Smooth interaction flow with button state management
- Helpful error messages (never raw stack traces)
- Disabled buttons during processing to prevent double-clicks
- Timeout handling with embed update on expiry
- Automatic cleanup of expired game sessions

---

## Configuration

Administrators should configure through both slash commands and the web dashboard:

- Enabled/disabled games (per game toggle)
- Minimum and maximum bet per game
- Cooldown duration per game
- Multipliers per game (configurable per outcome)
- House edge percentage per game
- Jackpot pool limits and contribution percentages
- Reward values for achievements, daily rewards, and challenges
- RTP percentage per game
- Currency settings (enable/disable, name, symbol, starting balance)
- Season duration and rewards

Goal: administrators should almost never need to edit source code.

---

## Admin Dashboard

Since Penguuu already has a dashboard, add gambling management pages:

- **Economy Overview**: Total coins in circulation, active users, daily transaction volume, charts
- **Transactions**: Searchable/filterable transaction log with user, type, amount, timestamp
- **Game Configuration**: Per-game settings panel (bets, cooldowns, multipliers, house edge)
- **RTP Settings**: Configure Return to Player per game with live expected vs actual RTP display
- **Multipliers**: Fine-tune payout tables per game
- **Jackpots**: View active jackpot pools, contribution rates, win history
- **Leaderboards**: View all leaderboard types, manually award leaderboard prizes
- **Achievements**: Create, edit, enable/disable achievements. View unlock statistics.
- **Player Profiles**: Search users, view balances, stats, achievements, transaction history. Manual adjustments with audit trail.
- **Gambling Logs**: Audit log of all admin actions (adjustments, resets, config changes)
- **Economy Analytics**: Charts and trends for coin supply, daily active gamblers, popular games, revenue

---

## Security

Validate every interaction server-side:
- Bet amount is valid (number, within min/max, user has sufficient balance)
- User identity matches the interaction owner
- Channel and guild are valid
- Cooldown state is respected
- Game session state matches expected state (prevent replay attacks)

Prevent:
- Invalid bets (negative, zero, non-numeric, exceeds balance)
- Duplicate interactions (button spam, double-submit)
- Race conditions (atomic balance operations via `$inc`)
- Double payouts (payout calculated and applied before response sent)
- Overflow exploits (balance caps at max safe integer)
- Interaction spoofing (custom IDs validated against session store)

Balance operations use atomic MongoDB operations (`findOneAndUpdate` with `$inc`) -- never read-modify-write.

---

## Database

### Models

Plan for these models up front to make later phases smoother:

- **UserEconomy**: userId, guildId, balances (Map of currency -> amount), totalEarned, totalSpent, lastDailyClaim, gamblingEnabled, selfExcludeUntil
- **Transaction**: userId, guildId, type, currency, amount, balanceBefore, balanceAfter, referenceId, referenceType, timestamp, description
- **DailyReward**: userId, guildId, streak, lastClaimAt, totalClaimed
- **Achievement**: id, name, description, icon, category, criteria, rewards, hidden, enabled, createdAt
- **UserAchievement**: userId, guildId, achievementId, unlockedAt, notificationSent
- **GamblingStats**: userId, guildId, gameStats (Map of game -> wins, losses, bets, profit, biggestWin, biggestLoss), totalBets, totalWins, totalLosses, netProfit, currentStreak, longestStreak, biggestWin, biggestLoss, totalWagered, xp, level, favoriteGame
- **GameHistory**: userId, guildId, game, bet, payout, outcome, details, timestamp
- **JackpotPool**: poolId, game, currency, totalAmount, entryFee, entries, winnerId, winningAmount, status, createdAt, endedAt
- **LeaderboardCache**: type, period, entries (sorted array of userId, value), lastUpdated, expiresAt
- **EconomySettings**: guildId, currencies, startingBalances, dailyReward, minBet, maxBet, cooldowns, multipliers, houseEdge, jackpotLimits, rtp, seasonConfig

Use efficient queries with appropriate indexes on userId+guildId, type+timestamp, and period fields.

---

## Game Registration Pattern

Each game module exports a standard interface:

```js
export const game = {
  name: 'blackjack',
  aliases: ['bj'],
  minBet: 1,
  maxBet: 10000,
  cooldown: 0,
  async execute(interaction, balance) { /* ... */ },
};
```

A central game registry (`src/games/index.js`) auto-discovers modules in `src/games/` and registers slash commands, cooldowns, and statistics hooks. Adding a new game requires only creating a file in `src/games/` following the interface -- no modifications to existing code.

---

## Future Expansion

Design the system so new games can be added without modifying existing ones. Each game should register itself automatically through the game registry pattern.

---

## Final Expectations

Polished, modern, responsive, enjoyable while remaining simple to use. Every game integrates seamlessly with Penguuu's existing economy and architecture. Modular, secure, maintainable, thoroughly tested. Virtual in-server currency only. No real-money gambling support.
