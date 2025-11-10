# X Engagement Bot - Command Reference

Complete documentation for all bot commands organized by permission level.

## Table of Contents
- [User Commands](#user-commands)
- [Admin Commands](#admin-commands)
- [Super Admin Commands](#super-admin-commands)

---

## User Commands

These commands are available to all server members.

### `/ping`
**Description:** Check bot latency and status

**Usage:**
```
/ping
```

**Returns:** Bot response time and connection status

---

### `/my-profile`
**Description:** View and edit your profile

**Usage:**
```
/my-profile
```

**Details:**
- Shows your Discord profile information
- Displays linked Twitter/X account (if any)
- Shows linked Solana wallet (if any)
- Account creation and last updated timestamps
- Provides buttons to update Twitter or wallet information

---

### `/set-profile`
**Description:** Link your Twitter/X profile

**Usage:**
```
/set-profile
```

**Details:**
- Opens a modal to enter your Twitter username or profile URL
- Generates a verification code
- You must post a tweet with the verification code
- Submit the tweet URL to complete verification
- Once verified, your Twitter account is linked to your Discord profile

**Important:** Each Twitter account can only be linked to one Discord account

---

### `/my-wallet`
**Description:** View your Solana wallet information

**Usage:**
```
/my-wallet
```

**Returns:**
- Your currently linked Solana wallet address
- Wallet status and verification

---

### `/set-wallet`
**Description:** Set your Solana wallet address for rewards

**Usage:**
```
/set-wallet
```

**Details:**
- Opens a modal to enter your Solana wallet address
- Wallet address is validated before saving
- Used for receiving SOL and token rewards
- Each wallet can only be linked to one Discord account

---

### `/my-points`
**Description:** Check your points balance

**Usage:**
```
/my-points
```

**Returns:**
- Total points earned
- Available points (spendable)
- Server rank
- Points history summary

---

### `/leaderboard`
**Description:** View the server points leaderboard

**Usage:**
```
/leaderboard
```

**Details:**
- Shows top 10 users by total points
- Displays username and point totals
- Updates in real-time
- Server-specific rankings

---

### `/claim-reward`
**Description:** Spend points to claim rewards

**Usage:**
```
/claim-reward
```

**Details:**
- Shows available rewards you can afford
- Displays point cost for each reward
- Confirms before spending points
- Rewards can be:
  - SOL (sent to your wallet)
  - Tokens (sent to your wallet)
  - Discord roles

---

## Admin Commands

These commands require Administrator permissions in the server.

### `/setup-raid`
**Description:** Setup raid channels and configuration

**Usage:**
```
/setup-raid
  post-channel: #channel
  raid-channel: #channel
  [default-points: 50]
  [frequency-hours: 24]
```

**Parameters:**
- `post-channel` (required): Channel where users post their raid tweets
- `raid-channel` (required): Channel where raid tweets are announced
- `default-points` (optional): Default points per raid tweet (1-1000, default: 50)
- `frequency-hours` (optional): Hours between allowed tweets (1-168, default: 24)

**Details:**
- Must be run before users can participate in raids
- Sets up the raid system for your server
- Configures point rewards for raid participation
- Sets tweet frequency limits to prevent spam

---

### `/post-engagement`
**Description:** Post a tweet for users to engage with

**Usage:**
```
/post-engagement
  tweet-url: https://x.com/username/status/123456789
  points: 100
  requirements: like+rt
  [expires-in: 24]
```

**Parameters:**
- `tweet-url` (required): Full URL of the tweet to engage with
- `points` (required): Points to award for completion (minimum: 1)
- `requirements` (required): Required actions
  - `like` - Like only
  - `like+rt` - Like and Retweet
  - `like+rt+comment` - Like, Retweet, and Comment
  - `like+rt+comment+bookmark` - All actions
- `expires-in` (optional): Hours until campaign expires (1-720)

**Details:**
- Creates an engagement campaign for the specified tweet
- Users must complete all required actions
- Bot verifies completion via Twitter API/scraper
- Points are awarded automatically upon verification
- Can track completion statistics

---

### `/set-raid-rewards`
**Description:** Set raid rewards based on user role

**Usage:**
```
/set-raid-rewards
  role: @RoleName
  reward-type: sol
  amount: 0.1
```

**Parameters:**
- `role` (required): Discord role to set reward for
- `reward-type` (required): Type of reward
  - `sol` - Solana
  - `token` - SPL Token
  - `points` - Point multiplier
- `amount` (required): Reward amount (minimum: 0.001)

**Details:**
- Users with the specified role receive extra rewards for raid tweets
- Rewards are automatic when raid tweets are verified
- Can set different rewards for different roles
- SOL/Token rewards require users to have wallet set up

---

### `/set-rewards`
**Description:** Configure point rewards that users can claim

**Usage:**
```
/set-rewards
  name: "Premium Role"
  points-cost: 1000
  type: role
  [amount: 0.5]
  [role: @Role]
  [description: "Get access to premium features"]
```

**Parameters:**
- `name` (required): Name of the reward
- `points-cost` (required): Points required to claim (minimum: 1)
- `type` (required): Reward type
  - `sol` - SOL cryptocurrency
  - `token` - SPL Token
  - `role` - Discord role
- `amount` (optional): Amount of SOL/Token (required for sol/token types)
- `role` (optional): Role to assign (required for role type)
- `description` (optional): Description of the reward

**Details:**
- Creates rewards that users can claim with points
- Automatically processes claims
- Tracks claim history
- Can create multiple reward tiers

---

### `/set-points`
**Description:** Set default points per engagement

**Usage:**
```
/set-points
  points: 100
```

**Parameters:**
- `points` (required): Default points to award (minimum: 1, maximum: 10000)

**Details:**
- Sets the default point value for engagements
- Can be overridden per engagement when posting
- Applies server-wide

---

### `/set-tweet-limit`
**Description:** Set how frequently users can post raid tweets

**Usage:**
```
/set-tweet-limit
  hours: 24
```

**Parameters:**
- `hours` (required): Hours between allowed tweets (minimum: 1, maximum: 168)

**Details:**
- Prevents spam by limiting tweet frequency
- Users must wait the specified time between raid tweets
- Applies to all users in the server

---

### `/set-expiration`
**Description:** Set or update engagement expiration

**Usage:**
```
/set-expiration
  tweet-id: 123456789
  hours: 48
```

**Parameters:**
- `tweet-id` (required): Tweet ID of the engagement
- `hours` (required): Hours until expiration (0 to remove expiration)

**Details:**
- Updates expiration time for existing engagements
- Set to 0 to make engagement never expire
- Expired engagements cannot be completed

---

### `/view-stats`
**Description:** View engagement statistics

**Usage:**
```
/view-stats
  [tweet-id: 123456789]
```

**Parameters:**
- `tweet-id` (optional): Specific tweet ID to view stats for

**Details:**
- Without tweet-id: Shows overall server engagement statistics
- With tweet-id: Shows detailed stats for that specific engagement
- Includes:
  - Total completions
  - Completion rate
  - Points distributed
  - Top participants

---

## Super Admin Commands

These commands are only available to bot super administrators (bot owner and authorized users).

### `/generate-code`
**Description:** Generate access code for new servers

**Usage:**
```
/generate-code
  [expires-in: 30]
```

**Parameters:**
- `expires-in` (optional): Code expires in X days (0 = never expires, default: 30)

**Details:**
- Creates a unique access code for server activation
- Share the code with server admins to activate the bot
- Codes can expire after specified days
- One code per server
- Tracks which server used which code

---

### `/list-servers`
**Description:** List all connected servers

**Usage:**
```
/list-servers
  [show-inactive: true]
```

**Parameters:**
- `show-inactive` (optional): Include inactive servers (default: false)

**Details:**
- Shows all servers using the bot
- Displays:
  - Server name and ID
  - Member count
  - Active status
  - Access code used
  - Join date

---

### `/server-stats`
**Description:** View cross-server statistics

**Usage:**
```
/server-stats
```

**Details:**
- Shows global bot statistics across all servers
- Includes:
  - Total servers
  - Total users
  - Total engagements
  - Total points distributed
  - Total rewards claimed
  - Active engagements
  - System health metrics

---

## Common Workflows

### Setting Up the Bot (Admin)
1. Run `/setup-raid` to configure raid channels
2. Run `/set-rewards` to create claimable rewards
3. Run `/set-raid-rewards` to set role-based rewards (optional)
4. Run `/post-engagement` to create your first engagement campaign

### User Participation
1. Run `/set-profile` to link Twitter account
2. Run `/set-wallet` to link Solana wallet (for crypto rewards)
3. Complete engagements posted by admins
4. Check `/my-points` to see your balance
5. Use `/leaderboard` to see your rank
6. Run `/claim-reward` to spend points

### Raid Tweet Participation
1. Ensure your profile and wallet are set up
2. Post your raid tweet on Twitter/X
3. Share the tweet URL in the designated raid post channel
4. Bot verifies your tweet and awards points automatically

---

## Troubleshooting

### "Twitter account already linked" Error
- Each Twitter account can only be linked to one Discord account
- If you need to unlink, contact a server admin

### "Wallet address already in use" Error
- Each wallet can only be linked to one Discord account
- Make sure you're using your own wallet address

### "FOREIGN KEY constraint failed" Error
- This has been fixed in the latest version
- The bot now automatically creates server records when needed

### Engagement Not Completing
- Make sure you've completed ALL required actions (like, retweet, comment, bookmark)
- Wait a few minutes for the scraper to verify your actions
- Check that the engagement hasn't expired

### Points Not Showing
- Points are server-specific
- Make sure you're checking points in the correct server
- Completed engagements may take a few minutes to process

---

## Support

For additional help:
- Contact your server administrators
- Check the bot's status with `/ping`
- Report issues to the bot development team

---

## Version Information

This documentation is current as of the latest bot version.

Last Updated: 2025-11-10
