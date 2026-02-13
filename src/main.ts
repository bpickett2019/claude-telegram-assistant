/**
 * Claude Telegram Assistant
 *
 * Autonomous AI assistant via Telegram powered by Claude Code CLI
 */

import 'dotenv/config';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { loadConfig, validateConfig } from './config';
import { TelegramBot } from './bot/telegram';
import { ClaudeSpawner } from './claude/spawner';
import { SessionManager } from './claude/session';
import { MemorySystem } from './memory/supabase';
import { WorkspaceManager } from './workspace/manager';
import { MessageHandler } from './handlers/message';
import { CommandHandler } from './handlers/commands';
import { PermissionHandler } from './handlers/permissions';
import { ProjectHandler } from './handlers/projects';
import { FileBrowserHandler } from './handlers/files';
import { SkillsManager } from './skills/manager';
import { CronScheduler } from './cron/scheduler';
import { AgentTeamsManager } from './teams/manager';

const LOCK_FILE = join(process.env.HOME || '~', '.claude-assistant', 'bot.lock');

/**
 * Acquire lock to prevent multiple instances
 */
async function acquireLock(): Promise<boolean> {
  try {
    await mkdir(join(process.env.HOME || '~', '.claude-assistant'), { recursive: true });

    const existingLock = await readFile(LOCK_FILE, 'utf-8').catch(() => null);

    if (existingLock) {
      const pid = parseInt(existingLock);
      try {
        process.kill(pid, 0); // Check if process exists
        console.error(`Another instance is running (PID: ${pid})`);
        return false;
      } catch {
        console.log('Stale lock found, taking over...');
      }
    }

    await writeFile(LOCK_FILE, process.pid.toString());
    return true;
  } catch (error) {
    console.error('Lock error:', error);
    return false;
  }
}

/**
 * Release lock
 */
async function releaseLock(): Promise<void> {
  await unlink(LOCK_FILE).catch(() => {});
}

/**
 * Main entry point
 */
async function main() {
  console.log('🤖 Claude Telegram Assistant');
  console.log('============================\n');

  // Acquire lock
  if (!(await acquireLock())) {
    console.error('Could not acquire lock. Another instance may be running.');
    process.exit(1);
  }

  try {
    // Load and validate configuration
    const config = loadConfig();
    validateConfig(config);

    console.log('✓ Configuration loaded');

    // Initialize components
    console.log('Initializing components...');

    const bot = new TelegramBot(config);
    const spawner = new ClaudeSpawner(config);
    const session = new SessionManager(config);
    const memory = new MemorySystem(config);
    const workspace = new WorkspaceManager(config);
    const skills = new SkillsManager(config);
    const permissions = new PermissionHandler(config);
    const projects = new ProjectHandler(config, session);
    const fileBrowser = new FileBrowserHandler(config, projects);
    const teams = new AgentTeamsManager(config, spawner, workspace, memory);

    // Initialize all components
    await workspace.init();
    await session.init();
    await skills.init();
    await projects.init();

    console.log('✓ Components initialized');

    // Health check
    const supabaseHealthy = await memory.healthCheck();
    if (!supabaseHealthy) {
      console.warn('⚠️  Supabase connection failed. Memory features will be limited.');
    } else {
      console.log('✓ Supabase connected');
    }

    // Initialize handlers
    const messageHandler = new MessageHandler(
      config,
      spawner,
      session,
      memory,
      workspace
    );

    const commandHandler = new CommandHandler(config, session, memory, skills);

    // Initialize cron scheduler
    const sendTelegram = async (message: string) => {
      await bot.getApi().sendMessage(config.telegram.userId, message);
    };

    const scheduler = new CronScheduler(
      config,
      spawner,
      memory,
      workspace,
      sendTelegram
    );

    await scheduler.init();

    // Register command handlers
    bot.onCommand('start', (ctx) => commandHandler.handleStart(ctx));
    bot.onCommand('help', (ctx) => commandHandler.handleHelp(ctx));
    bot.onCommand('status', (ctx) => commandHandler.handleStatus(ctx));
    bot.onCommand('clear', (ctx) => commandHandler.handleClear(ctx));

    // Model command with args
    bot.onCommand('model', async (ctx) => {
      const args = ctx.message?.text?.split(' ').slice(1).join(' ');
      await commandHandler.handleModel(ctx, args);
    });

    // Mode command with args
    bot.onCommand('mode', async (ctx) => {
      const args = ctx.message?.text?.split(' ').slice(1).join(' ');
      await commandHandler.handleMode(ctx, args);
    });

    // Thinking level command with args
    bot.onCommand('think', async (ctx) => {
      const args = ctx.message?.text?.split(' ').slice(1).join(' ');
      await commandHandler.handleThink(ctx, args);
    });

    // Usage stats command
    bot.onCommand('usage', (ctx) => commandHandler.handleUsage(ctx));

    // Verbose mode toggle with args
    bot.onCommand('verbose', async (ctx) => {
      const args = ctx.message?.text?.split(' ').slice(1).join(' ');
      await commandHandler.handleVerbose(ctx, args);
    });

    // Skills management with args
    bot.onCommand('skills', async (ctx) => {
      const args = ctx.message?.text?.split(' ').slice(1).join(' ');
      await commandHandler.handleSkills(ctx, args);
    });

    // Compact context
    bot.onCommand('compact', (ctx) => commandHandler.handleCompact(ctx));

    // Ping command
    bot.onCommand('ping', (ctx) => commandHandler.handlePing(ctx));

    // Register project commands
    bot.onCommand('createproject', (ctx) => projects.handleCreateProject(ctx));
    bot.onCommand('listprojects', (ctx) => projects.handleListProjects(ctx));
    bot.onCommand('exitproject', (ctx) => projects.handleExitProject(ctx));

    // Register file browser command
    bot.onCommand('ls', (ctx) => fileBrowser.handleLsCommand(ctx));

    // Register callback handlers
    bot.onCallback(async (ctx) => {
      const data = ctx.callbackQuery?.data;
      if (data?.startsWith('perm_')) {
        await permissions.handleCallback(ctx);
      } else if (data?.startsWith('proj_')) {
        await projects.handleCallback(ctx);
      } else if (data?.startsWith('fb_')) {
        await fileBrowser.handleCallback(ctx);
      }
    });

    // Register message handlers
    bot.onText((ctx) => messageHandler.handleText(ctx));
    bot.onPhoto((ctx) => messageHandler.handlePhoto(ctx));
    bot.onVoice((ctx) => messageHandler.handleVoice(ctx));

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n\nShutting down gracefully...');
      scheduler.stopAll();
      permissions.clearPending();
      await bot.stop();
      await releaseLock();
      console.log('✓ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start bot
    console.log(`\n✓ Ready! Authorized user: ${config.telegram.userId}`);
    console.log('Listening for messages...\n');

    await bot.start();
  } catch (error) {
    console.error('Fatal error:', error);
    await releaseLock();
    process.exit(1);
  }
}

// Cleanup on exit
process.on('exit', () => {
  try {
    require('fs').unlinkSync(LOCK_FILE);
  } catch {}
});

main();
