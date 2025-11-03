// ============================================================================
// FILE 1: bot/src/commands/deploy-commands.js
// ============================================================================

import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import settings from '../config/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployCommands() {
  const commands = [];
  const commandFolders = ['admin', 'user', 'superadmin'];

  console.log('🔄 Loading commands...\n');

  for (const folder of commandFolders) {
    const commandsPath = join(__dirname, folder);

    try {
      const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = await import(`file://${filePath}`);

        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`  ✓ Loaded: /${command.data.name} (${folder})`);
        }
      }
    } catch (error) {
      console.log(`  ℹ Folder ${folder} not found or empty`);
    }
  }

  console.log(`\n📋 Total commands: ${commands.length}\n`);

  const rest = new REST().setToken(settings.discord.token);

  try {
    console.log('🚀 Deploying commands...\n');

    const data = await rest.put(
      Routes.applicationCommands(settings.discord.clientId),
      { body: commands }
    );

    console.log(`✅ Successfully deployed ${data.length} commands!`);
    console.log('⏰ Global commands may take up to 1 hour to appear.\n');
    console.log('✨ Deployment complete!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

deployCommands();