# Profile Management Modules

Complete implementation of the profile management system for global user profiles with Twitter verification.

## 📁 Files

1. **profileManager.js** - Main profile management with verification flow
2. **duplicateChecker.js** - Prevents duplicate Twitter profiles
3. **profileValidator.js** - Validates Twitter URLs and usernames

---

## 🚀 Overview

These modules handle the complete lifecycle of linking Twitter profiles to Discord users, including:
- Two-step verification process (code generation + tweet verification)
- Duplicate prevention (one Twitter account per Discord user)
- Profile updates and unlinking
- Comprehensive validation

### Verification Flow

```
User initiates → Generate code → User tweets code
                        ↓
            Store pending verification
                        ↓
            User submits tweet URL
                        ↓
            Validate tweet contains code
                        ↓
            Verify authorship matches
                        ↓
            Check for duplicates
                        ↓
            Link profile & mark verified
```

---

## 📋 Module Details

### 1. ProfileManager.js

**Purpose:** Orchestrates the entire profile management lifecycle including verification.

**Key Features:**
- ✅ Two-step verification with tweet codes
- ✅ 8-character alphanumeric codes
- ✅ 15-minute expiry on verification codes
- ✅ Profile linking/unlinking
- ✅ Profile updates (unlink + relink)
- ✅ Pending verification tracking
- ✅ Automatic cleanup of expired codes

**Main Methods:**

```javascript
// User Profile Management
- createOrUpdateUser(userId, username, discriminator)
- getUserProfile(userId)

// Twitter Linking (Two-Step Process)
- initiateTwitterLink(userId, twitterInput)      // Step 1: Generate code
- verifyTwitterLink(userId, tweetUrl)             // Step 2: Verify ownership

// Profile Management
- unlinkTwitterProfile(userId)
- updateTwitterProfile(userId, newTwitterInput)

// Verification Status
- getPendingVerification(userId)
- cancelPendingVerification(userId)
- cleanupExpiredVerifications()

// Statistics
- getProfileStats()
```

**Verification Code Format:**
- Length: 8 characters
- Characters: A-Z, 0-9
- Example: `A3K9M2L7`
- Expiry: 15 minutes

**Usage Example:**

```javascript
const profileManager = require('./profile/profileManager');

// Step 1: Initiate linking
const initResult = await profileManager.initiateTwitterLink(
  '123456789',        // Discord user ID
  '@elonmusk'         // Twitter handle or URL
);

if (initResult.success) {
  console.log('Verification code:', initResult.verificationCode);
  console.log('Tweet this code from @elonmusk');
  console.log('Expires at:', new Date(initResult.expiresAt));
}

// Step 2: User tweets the code and submits tweet URL
const verifyResult = await profileManager.verifyTwitterLink(
  '123456789',                                    // Discord user ID
  'https://x.com/elonmusk/status/1234567890'     // Tweet URL
);

if (verifyResult.success) {
  console.log('✅ Profile verified and linked!');
}
```

---

### 2. DuplicateChecker.js

**Purpose:** Enforces one-to-one mapping between Discord users and Twitter accounts.

**Key Features:**
- ✅ Prevents multiple Discord users from linking same Twitter account
- ✅ Prevents one Discord user from linking multiple Twitter accounts
- ✅ Batch duplicate detection
- ✅ Admin duplicate resolution tools
- ✅ Database constraint validation

**Duplicate Rules:**
1. Each Twitter account can only be linked to ONE Discord user
2. Each Discord user can only link ONE Twitter account
3. Both enforced by database UNIQUE constraints

**Main Methods:**

```javascript
// Primary Duplicate Check
- checkForDuplicates(userId, twitterUsername)

// Specific Checks
- checkTwitterUsernameDuplicate(twitterUsername, excludeUserId)
- checkUserHasProfile(userId)
- checkUserConsistency(userId)

// Discovery
- findUsersWithTwitterAccount(twitterUsername)
- batchCheckDuplicates()

// Admin Tools
- resolveDuplicate(twitterUsername, keepUserId)
- validateDatabaseConstraints()
- getDuplicateStats()
```

**Error Response Format:**

```javascript
{
  allowed: false,
  error: "Twitter account @elonmusk is already linked to another Discord user",
  duplicateType: "twitter_account",
  duplicateInfo: {
    twitterUsername: "elonmusk",
    linkedUserId: "987654321",
    linkedAt: 1698450000000,
    verified: true
  }
}
```

**Usage Example:**

```javascript
const duplicateChecker = require('./profile/duplicateChecker');

// Check before linking
const check = await duplicateChecker.checkForDuplicates(
  '123456789',    // Discord user ID
  'elonmusk'      // Twitter username
);

if (!check.allowed) {
  console.error('❌', check.error);
  console.log('Duplicate type:', check.duplicateType);
  console.log('Info:', check.duplicateInfo);
}

// Admin: Find who has a Twitter account linked
const result = duplicateChecker.findUsersWithTwitterAccount('elonmusk');
if (result.found) {
  console.log('Linked to Discord user:', result.userId);
}
```

---

### 3. ProfileValidator.js

**Purpose:** Validates Twitter usernames and URLs against Twitter's format rules.

**Key Features:**
- ✅ Username format validation (1-15 chars, alphanumeric + underscore)
- ✅ Profile URL validation (twitter.com & x.com)
- ✅ Tweet URL validation (for verification)
- ✅ Reserved username checking
- ✅ URL normalization (twitter.com → x.com)
- ✅ Batch validation

**Twitter Username Rules:**
- Length: 1-15 characters
- Allowed: Letters (a-z, A-Z), numbers (0-9), underscore (_)
- Not allowed: Hyphens, periods, special characters
- Reserved: twitter, admin, support, api, etc.

**Main Methods:**

```javascript
// Primary Validation
- validateTwitterInput(input)          // Username or URL
- validateUsername(username)
- validateProfileUrl(url)
- validateTweetUrl(url)                // For verification tweets

// Utilities
- extractUsernameFromUrl(url)
- normalizeUrl(url)
- sanitizeUsername(username)
- compareUsernames(username1, username2)

// Batch Operations
- validateMultipleUsernames(usernames)
- validateBatch(inputs)

// Information
- getConstraints()
- getValidationStats()
```

**Accepted Input Formats:**

```javascript
// All of these are valid inputs:
'elonmusk'
'@elonmusk'
'https://twitter.com/elonmusk'
'https://x.com/elonmusk'
'https://twitter.com/elonmusk/'
'https://x.com/elonmusk/'

// All normalize to:
{
  twitterUsername: 'elonmusk',
  twitterUrl: 'https://x.com/elonmusk'
}
```

**Usage Example:**

```javascript
const profileValidator = require('./profile/profileValidator');

// Validate any input (username or URL)
const result = profileValidator.validateTwitterInput('@elonmusk');

if (result.valid) {
  console.log('Username:', result.twitterUsername);  // elonmusk
  console.log('URL:', result.twitterUrl);           // https://x.com/elonmusk
} else {
  console.error('Error:', result.error);
}

// Validate tweet URL
const tweetCheck = profileValidator.validateTweetUrl(
  'https://x.com/elonmusk/status/1234567890'
);

if (tweetCheck.valid) {
  console.log('Username:', tweetCheck.username);    // elonmusk
  console.log('Tweet ID:', tweetCheck.tweetId);     // 1234567890
}
```

---

## 🔧 Integration

### 1. Directory Structure

```
x-engagement-bot/
├── bot/
│   └── src/
│       └── handlers/
│           ├── profile/
│           │   ├── profileManager.js
│           │   ├── duplicateChecker.js
│           │   └── profileValidator.js
│           └── raid/
│               └── raidMonitor.js (uses profile data)
```

### 2. Database Integration

The modules use the existing database schema from `schema.js`:

```javascript
// Required tables:
- global_users
- global_twitter_profiles

// Key relationships:
FOREIGN KEY (user_id) REFERENCES global_users(user_id)
UNIQUE constraints on user_id and twitter_username
```

### 3. Discord Command Integration

Example `/set-profile` command:

```javascript
const { SlashCommandBuilder } = require('discord.js');
const profileManager = require('../../handlers/profile/profileManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-profile')
    .setDescription('Link your Twitter profile')
    .addStringOption(option =>
      option.setName('twitter')
        .setDescription('Your Twitter username or URL')
        .setRequired(true)
    ),

  async execute(interaction) {
    const twitterInput = interaction.options.getString('twitter');
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Create/update Discord user
    await profileManager.createOrUpdateUser(
      userId,
      username,
      interaction.user.discriminator
    );

    // Initiate Twitter linking
    const result = await profileManager.initiateTwitterLink(userId, twitterInput);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.error}`,
        ephemeral: true
      });
    }

    // Send verification instructions
    const embed = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('🔐 Twitter Verification Required')
      .setDescription('To verify your Twitter account ownership:')
      .addFields(
        {
          name: '1️⃣ Tweet This Code',
          value: `\`\`\`${result.verificationCode}\`\`\``
        },
        {
          name: '2️⃣ From This Account',
          value: `[@${result.twitterUsername}](${result.twitterUrl})`
        },
        {
          name: '3️⃣ Example Tweet',
          value: `Verifying my Discord account: ${result.verificationCode}`
        },
        {
          name: '4️⃣ Submit Tweet URL',
          value: `Use \`/verify-profile <tweet-url>\` within ${Math.floor((result.expiresAt - Date.now()) / 60000)} minutes`
        }
      )
      .setFooter({ text: 'Your verification code will expire in 15 minutes' })
      .setTimestamp(result.expiresAt);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
```

Example `/verify-profile` command:

```javascript
module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify-profile')
    .setDescription('Verify your Twitter profile with tweet URL')
    .addStringOption(option =>
      option.setName('tweet-url')
        .setDescription('URL of your verification tweet')
        .setRequired(true)
    ),

  async execute(interaction) {
    const tweetUrl = interaction.options.getString('tweet-url');
    const userId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    // Verify the profile
    const result = await profileManager.verifyTwitterLink(userId, tweetUrl);

    if (!result.success) {
      return interaction.editReply({
        content: `❌ ${result.error}`
      });
    }

    // Success!
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Twitter Profile Verified!')
      .setDescription(`Your Twitter account has been successfully linked.`)
      .addFields(
        {
          name: 'Twitter Account',
          value: `[@${result.twitterUsername}](https://x.com/${result.twitterUsername})`
        }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
```

### 4. Bot Initialization

```javascript
// In bot/src/index.js
const profileManager = require('./handlers/profile/profileManager');

client.once('ready', () => {
  console.log('Bot is ready!');
  
  // Periodic cleanup of expired verifications (every 5 minutes)
  setInterval(() => {
    profileManager.cleanupExpiredVerifications();
  }, 5 * 60 * 1000);
});
```

---

## 🔒 Security Features

### Verification Security
- ✅ Time-limited verification codes (15 minutes)
- ✅ One-time use codes
- ✅ Cryptographically random code generation
- ✅ Tweet ownership verification
- ✅ Author username matching

### Duplicate Prevention
- ✅ Database UNIQUE constraints
- ✅ Pre-check before linking
- ✅ Post-check after linking
- ✅ Atomic database operations
- ✅ Transaction safety

### Input Validation
- ✅ Strict format checking
- ✅ Reserved username blocking
- ✅ SQL injection prevention (prepared statements)
- ✅ XSS prevention (no HTML in usernames)
- ✅ Length limits enforced

---

## 📊 Database Schema

### global_users
```sql
CREATE TABLE global_users (
  user_id TEXT PRIMARY KEY,           -- Discord user ID
  username TEXT NOT NULL,              -- Discord username
  discriminator TEXT,                  -- Discord discriminator
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### global_twitter_profiles
```sql
CREATE TABLE global_twitter_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,       -- One profile per user
  twitter_username TEXT UNIQUE NOT NULL, -- One user per Twitter account
  twitter_url TEXT NOT NULL,
  verified INTEGER DEFAULT 0,          -- Verification status
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES global_users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_twitter_username ON global_twitter_profiles(twitter_username);
```

---

## 🎯 Features

### Profile Management
- ✅ Link Twitter profile with verification
- ✅ Unlink Twitter profile
- ✅ Update Twitter profile (unlink + relink)
- ✅ View profile status
- ✅ Check pending verifications

### Verification Process
- ✅ Generate unique 8-character codes
- ✅ 15-minute expiry window
- ✅ Tweet-based ownership proof
- ✅ Automatic verification on tweet submission
- ✅ Clear instructions for users

### Duplicate Prevention
- ✅ Real-time duplicate checking
- ✅ One Twitter account per Discord user
- ✅ One Discord user per Twitter account
- ✅ Admin tools to resolve duplicates
- ✅ Database constraint validation

### Validation
- ✅ Twitter username format validation
- ✅ Twitter URL format validation
- ✅ Tweet URL validation
- ✅ Reserved username checking
- ✅ Batch validation support

---

## 🔄 Complete User Flow

### Linking Process

1. **User initiates:** `/set-profile @username`
2. **System validates:** Format check, duplicate check
3. **System generates:** 8-character code (e.g., `A3K9M2L7`)
4. **User tweets:** "Verifying my Discord account: A3K9M2L7"
5. **User submits:** `/verify-profile <tweet-url>`
6. **System verifies:**
   - Tweet exists and is accessible
   - Tweet contains correct code
   - Tweet author matches username
   - Code hasn't expired
7. **System links:** Profile marked as verified
8. **User confirmed:** Success message with profile link

### Unlinking Process

1. **User requests:** `/unlink-profile`
2. **System checks:** Profile exists
3. **System removes:** Twitter profile record
4. **User confirmed:** Unlink successful

### Update Process

1. **User requests:** `/update-profile @newusername`
2. **System unlinks:** Old profile
3. **System initiates:** New verification (steps 2-8 above)

---

## 🐛 Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Twitter account already linked" | Username in use by another user | Use different Twitter account |
| "You already have a Twitter account linked" | User already has profile | Use `/unlink-profile` first |
| "Verification code expired" | Code > 15 minutes old | Restart verification process |
| "Invalid tweet URL" | Wrong URL format | Use tweet URL not profile URL |
| "Tweet author doesn't match" | Wrong Twitter account tweeted | Tweet from correct account |
| "Username can only contain..." | Invalid characters in username | Use only letters, numbers, _ |
| "Username is reserved" | System username | Choose different username |

---

## 📈 Admin Tools

### Monitoring

```javascript
// Get profile statistics
const stats = await profileManager.getProfileStats();
console.log('Total users:', stats.stats.totalUsers);
console.log('Linked profiles:', stats.stats.linkedProfiles);
console.log('Verified:', stats.stats.verifiedProfiles);
console.log('Pending verifications:', stats.stats.pendingVerifications);

// Check for duplicates
const duplicates = await duplicateChecker.batchCheckDuplicates();
if (duplicates.duplicateCount > 0) {
  console.log('⚠️ Found duplicates:', duplicates.duplicates);
}

// Validate database constraints
const validation = await duplicateChecker.validateDatabaseConstraints();
if (!validation.valid) {
  console.log('❌ Constraint violations:', validation.issues);
}
```

### Cleanup

```javascript
// Clean up expired verifications
const cleaned = profileManager.cleanupExpiredVerifications();
console.log(`Cleaned ${cleaned} expired verifications`);

// Resolve duplicate (admin only)
const resolution = await duplicateChecker.resolveDuplicate(
  'elonmusk',      // Twitter username
  '123456789'      // Discord user ID to keep
);
```

---

## 🧪 Testing

### Unit Tests

```javascript
// Test username validation
const valid = profileValidator.validateUsername('elonmusk');
assert(valid.valid === true);

const invalid = profileValidator.validateUsername('user-name');
assert(invalid.valid === false);

// Test duplicate detection
const check = await duplicateChecker.checkForDuplicates('user1', 'twitter1');
assert(check.allowed === true);

// Test verification code generation
const code = profileManager.generateVerificationCode();
assert(code.length === 8);
assert(/^[A-Z0-9]+$/.test(code));
```

### Integration Tests

1. Link profile → Verify success
2. Link same Twitter to different user → Verify blocked
3. Link different Twitter to same user → Verify blocked (must unlink first)
4. Expired code → Verify rejected
5. Wrong author → Verify rejected

---

## 🔄 Future Enhancements

Potential additions:
- [ ] Twitter API integration for real-time verification
- [ ] Profile badges/roles based on follower count
- [ ] Profile statistics (followers, tweets)
- [ ] Multi-factor verification options
- [ ] Profile import/export
- [ ] Verification history tracking
- [ ] Admin dashboard for monitoring
- [ ] Webhook notifications on profile changes

---

## 📝 Dependencies

```javascript
// Required Node.js modules
- crypto (built-in)          // Random code generation
- discord.js                  // Discord integration

// Required internal modules
- ../../database/queries      // Database operations
- ../../config/logger         // Logging
```

---

## 🤝 Integration with Other Modules

### Raid Monitoring

The raid monitor uses profile data:

```javascript
// In raidMonitor.js
const userProfile = await db.getUserProfile(userId, guildId);

if (!userProfile || !userProfile.twitter_username) {
  // User must link profile first
  return sendLinkProfileMessage();
}

// Validate tweet is from user's linked Twitter account
const validation = await tweetValidator.validateTweet(
  tweetUrl,
  userProfile.twitter_username  // Expected author
);
```

### Reward System

The reward system needs Twitter usernames:

```javascript
// In autoReward.js
const profile = await db.getUserProfile(userId, guildId);
await distributeReward(userId, points, profile.twitter_username);
```

---

## 📄 License

Part of the X Engagement Bot project.

---

**Created:** October 28, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Dependencies:** queries.js, schema.js, migrations.js
