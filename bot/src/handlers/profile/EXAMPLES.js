// ============================================================================
// INTEGRATION EXAMPLE: Complete Profile Management Flow
// ============================================================================

import profileManager from './profile/profileManager.js';
import duplicateChecker from './profile/duplicateChecker.js';
import profileValidator from './profile/profileValidator.js';

// ============================================================================
// Example 1: User Links Twitter Profile (Complete Flow)
// ============================================================================

async function linkTwitterProfileExample(discordUserId, discordUsername, twitterInput) {
  console.log('=== Starting Profile Link Process ===\n');

  // Step 1: Create/update Discord user in database
  console.log('Step 1: Creating Discord user record...');
  await profileManager.createOrUpdateUser(discordUserId, discordUsername, '0');

  // Step 2: Validate Twitter input format
  console.log('Step 2: Validating Twitter input...');
  const validation = profileValidator.validateTwitterInput(twitterInput);
  
  if (!validation.valid) {
    console.error('❌ Validation failed:', validation.error);
    return;
  }
  
  console.log('✅ Valid Twitter username:', validation.twitterUsername);
  console.log('   Normalized URL:', validation.twitterUrl);

  // Step 3: Check for duplicates
  console.log('\nStep 3: Checking for duplicates...');
  const dupCheck = await duplicateChecker.checkForDuplicates(
    discordUserId,
    validation.twitterUsername
  );

  if (!dupCheck.allowed) {
    console.error('❌ Duplicate found:', dupCheck.error);
    console.error('   Type:', dupCheck.duplicateType);
    console.error('   Info:', dupCheck.duplicateInfo);
    return;
  }

  console.log('✅ No duplicates found');

  // Step 4: Initiate verification
  console.log('\nStep 4: Generating verification code...');
  const initResult = await profileManager.initiateTwitterLink(
    discordUserId,
    twitterInput
  );

  if (!initResult.success) {
    console.error('❌ Failed to initiate:', initResult.error);
    return;
  }

  console.log('✅ Verification initiated!');
  console.log('   Code:', initResult.verificationCode);
  console.log('   Expires:', new Date(initResult.expiresAt).toLocaleString());
  console.log('\n📋 Instructions for user:');
  Object.entries(initResult.instructions).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  // Step 5: User tweets the code (simulated delay)
  console.log('\n⏳ Waiting for user to tweet and submit URL...\n');

  // Step 6: Verify tweet submission
  const tweetUrl = `https://x.com/${validation.twitterUsername}/status/1234567890`;
  console.log('Step 6: Verifying tweet submission...');
  console.log('   Tweet URL:', tweetUrl);

  const verifyResult = await profileManager.verifyTwitterLink(
    discordUserId,
    tweetUrl
  );

  if (!verifyResult.success) {
    console.error('❌ Verification failed:', verifyResult.error);
    return;
  }

  console.log('\n✅ SUCCESS! Twitter profile linked and verified!');
  console.log('   Twitter:', `@${verifyResult.twitterUsername}`);
  console.log('   Verified:', verifyResult.verified);
}

// ============================================================================
// Example 2: Check User Profile Status
// ============================================================================

async function checkProfileStatusExample(discordUserId) {
  console.log('=== Checking Profile Status ===\n');

  // Get full profile
  const profile = await profileManager.getUserProfile(discordUserId);

  if (!profile.success) {
    console.log('❌ No profile found');
    return;
  }

  console.log('Discord User:');
  console.log('  User ID:', profile.profile.userId);
  console.log('  Username:', profile.profile.username);

  if (profile.profile.twitterUsername) {
    console.log('\nTwitter Profile:');
    console.log('  Username:', profile.profile.twitterUsername);
    console.log('  URL:', profile.profile.twitterUrl);
    console.log('  Verified:', profile.profile.twitterVerified ? '✅' : '❌');
    console.log('  Linked:', new Date(profile.profile.createdAt).toLocaleString());
  } else {
    console.log('\nNo Twitter profile linked');
  }

  // Check pending verification
  const pending = profileManager.getPendingVerification(discordUserId);
  
  if (pending) {
    console.log('\n⏳ Pending Verification:');
    console.log('  Code:', pending.code);
    console.log('  Twitter:', pending.twitterUsername);
    console.log('  Time Remaining:', pending.timeRemaining);
  }
}

// ============================================================================
// Example 3: Unlink Twitter Profile
// ============================================================================

async function unlinkProfileExample(discordUserId) {
  console.log('=== Unlinking Twitter Profile ===\n');

  const result = await profileManager.unlinkTwitterProfile(discordUserId);

  if (!result.success) {
    console.error('❌', result.error);
    return;
  }

  console.log('✅', result.message);
  console.log('   Previously linked:', `@${result.previousUsername}`);
}

// ============================================================================
// Example 4: Update Twitter Profile
// ============================================================================

async function updateProfileExample(discordUserId, newTwitterInput) {
  console.log('=== Updating Twitter Profile ===\n');

  // This will:
  // 1. Unlink old profile
  // 2. Initiate new verification
  const result = await profileManager.updateTwitterProfile(
    discordUserId,
    newTwitterInput
  );

  if (!result.success) {
    console.error('❌', result.error);
    return;
  }

  console.log('✅ Update initiated!');
  console.log('   New verification code:', result.verificationCode);
  console.log('   Tweet from:', result.twitterUsername);
}

// ============================================================================
// Example 5: Admin - Find Duplicates
// ============================================================================

async function findDuplicatesExample() {
  console.log('=== Admin: Finding Duplicates ===\n');

  const result = await duplicateChecker.batchCheckDuplicates();

  console.log('Statistics:');
  console.log('  Total profiles:', result.totalProfiles);
  console.log('  Duplicates found:', result.duplicateCount);

  if (result.duplicateCount > 0) {
    console.log('\n⚠️ Duplicate Twitter Accounts:');
    result.duplicates.forEach(dup => {
      console.log(`  @${dup.twitterUsername}:`);
      console.log(`    Linked to ${dup.count} Discord users`);
      console.log(`    User IDs:`, dup.discordUsers.join(', '));
    });
  } else {
    console.log('  ✅ No duplicates found!');
  }
}

// ============================================================================
// Example 6: Admin - Validate Database Constraints
// ============================================================================

async function validateConstraintsExample() {
  console.log('=== Admin: Validating Database Constraints ===\n');

  const validation = await duplicateChecker.validateDatabaseConstraints();

  if (validation.valid) {
    console.log('✅', validation.message);
  } else {
    console.log('❌ Constraint violations detected!');
    
    if (validation.issues.duplicateUserIds.length > 0) {
      console.log('\n  Duplicate user_ids:');
      validation.issues.duplicateUserIds.forEach(issue => {
        console.log(`    User ${issue.user_id}: ${issue.count} profiles`);
      });
    }

    if (validation.issues.duplicateTwitterUsernames.length > 0) {
      console.log('\n  Duplicate twitter_usernames:');
      validation.issues.duplicateTwitterUsernames.forEach(issue => {
        console.log(`    @${issue.twitter_username}: ${issue.count} users`);
      });
    }
  }
}

// ============================================================================
// Example 7: Batch Validation
// ============================================================================

function batchValidationExample() {
  console.log('=== Batch Twitter Username Validation ===\n');

  const usernames = [
    'elonmusk',
    '@jack',
    'user-invalid',
    'https://x.com/valid_user',
    'a'.repeat(20),  // Too long
    'twitter',       // Reserved
    'valid_user_123'
  ];

  const results = profileValidator.validateBatch(usernames);

  console.log('Summary:');
  console.log('  Total:', results.summary.total);
  console.log('  Valid:', results.summary.validCount);
  console.log('  Invalid:', results.summary.invalidCount);

  console.log('\n✅ Valid Usernames:');
  results.valid.forEach(item => {
    console.log(`  ${item.input} → @${item.username}`);
  });

  console.log('\n❌ Invalid Usernames:');
  results.invalid.forEach(item => {
    console.log(`  ${item.input}: ${item.error}`);
  });
}

// ============================================================================
// Example 8: Profile Statistics
// ============================================================================

async function getProfileStatsExample() {
  console.log('=== Profile Statistics ===\n');

  const stats = await profileManager.getProfileStats();

  if (!stats.success) {
    console.error('❌ Failed to get stats');
    return;
  }

  console.log('Global Statistics:');
  console.log('  Total Discord users:', stats.stats.totalUsers);
  console.log('  Linked Twitter profiles:', stats.stats.linkedProfiles);
  console.log('  Verified profiles:', stats.stats.verifiedProfiles);
  console.log('  Pending verifications:', stats.stats.pendingVerifications);

  const linkRate = (stats.stats.linkedProfiles / stats.stats.totalUsers * 100).toFixed(1);
  const verifyRate = (stats.stats.verifiedProfiles / stats.stats.linkedProfiles * 100).toFixed(1);

  console.log('\nRates:');
  console.log('  Link rate:', `${linkRate}%`);
  console.log('  Verification rate:', `${verifyRate}%`);
}

// ============================================================================
// Example 9: Find Who Has a Twitter Account
// ============================================================================

function findUserByTwitterExample(twitterUsername) {
  console.log(`=== Finding User with @${twitterUsername} ===\n`);

  const result = duplicateChecker.findUsersWithTwitterAccount(twitterUsername);

  if (!result.found) {
    console.log('❌', result.message);
    return;
  }

  console.log('✅ Found!');
  console.log('  Discord User ID:', result.userId);
  console.log('  Twitter Username:', result.profile.twitterUsername);
  console.log('  Twitter URL:', result.profile.twitterUrl);
  console.log('  Verified:', result.profile.verified ? '✅' : '❌');
  console.log('  Linked:', new Date(result.profile.linkedAt).toLocaleString());
}

// ============================================================================
// Example 10: Complete Discord Command Handler
// ============================================================================

async function handleSetProfileCommand(interaction) {
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const twitterInput = interaction.options.getString('twitter');

  // Create user record
  await profileManager.createOrUpdateUser(userId, username, '0');

  // Check existing profile
  const existing = await profileManager.getUserProfile(userId);
  if (existing.success && existing.profile.twitterUsername) {
    return interaction.reply({
      content: `You already have @${existing.profile.twitterUsername} linked. Use \`/unlink-profile\` first to change it.`,
      ephemeral: true
    });
  }

  // Initiate linking
  const result = await profileManager.initiateTwitterLink(userId, twitterInput);

  if (!result.success) {
    return interaction.reply({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
  }

  // Send verification instructions
  return interaction.reply({
    content: [
      '🔐 **Twitter Verification Required**',
      '',
      '**Step 1:** Tweet this code from your Twitter account:',
      `\`\`\`${result.verificationCode}\`\`\``,
      '',
      `**Step 2:** Tweet from: [@${result.twitterUsername}](${result.twitterUrl})`,
      '',
      '**Step 3:** Use `/verify-profile <tweet-url>` with your tweet URL',
      '',
      `⏰ Code expires in ${Math.floor((result.expiresAt - Date.now()) / 60000)} minutes`
    ].join('\n'),
    ephemeral: true
  });
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('\n'.repeat(2));
  console.log('='.repeat(70));
  console.log('  PROFILE MANAGEMENT EXAMPLES');
  console.log('='.repeat(70));
  console.log('\n');

  // Example 1: Link profile (complete flow)
  await linkTwitterProfileExample('123456789', 'TestUser', '@elonmusk');
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Example 2: Check status
  await checkProfileStatusExample('123456789');
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Example 7: Batch validation
  batchValidationExample();
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Example 8: Statistics
  await getProfileStatsExample();
  
  console.log('\n' + '='.repeat(70) + '\n');
}

// Uncomment to run:
// runExamples().catch(console.error);

export default {
  linkTwitterProfileExample,
  checkProfileStatusExample,
  unlinkProfileExample,
  updateProfileExample,
  findDuplicatesExample,
  validateConstraintsExample,
  batchValidationExample,
  getProfileStatsExample,
  findUserByTwitterExample,
  handleSetProfileCommand
};
