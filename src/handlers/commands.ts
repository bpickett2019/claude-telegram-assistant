/**
 * Command Handlers
 *
 * Handles bot commands (/start, /status, /clear, etc.)
 */

import type { Context } from 'grammy';
import { SessionManager } from '../claude/session';
import { MemorySystem } from '../memory/supabase';
import type { Config, ClaudeModel, PermissionMode } from '../types';

export class CommandHandler {
  constructor(
    private config: Config,
    private session: SessionManager,
    private memory: MemorySystem
  ) {}

  /**
   * /start - Welcome message
   */
  async handleStart(ctx: Context): Promise<void> {
    const welcome = `
🤖 **Claude Telegram Assistant**

Your personal AI assistant powered by Claude Code CLI.

**Available Commands:**
/status - Show session status
/clear - Start new session
/model - Change Claude model
/mode - Change permission mode
/help - Show help

Just send me a message to get started!
    `.trim();

    await ctx.reply(welcome);
  }

  /**
   * /help - Show help
   */
  async handleHelp(ctx: Context): Promise<void> {
    const help = `
**Commands:**

📊 **Session:**
• /status - Show current session info
• /clear - Clear session and start fresh
• /resume - Resume previous session

🤖 **Model:**
• /model - Change Claude model (opus/sonnet/haiku)

🔒 **Permission Modes:**
• /mode default - Ask for tool permissions
• /mode accept - Auto-accept file edits
• /mode plan - Require plan before actions
• /mode bypass - Skip all permissions

💬 **Messages:**
• Send text, voice, or images
• Long responses are automatically chunked
• Voice messages are transcribed

📝 **Memory:**
• Facts and goals are automatically stored
• Semantic search finds relevant context
• Workspace files provide continuity

🔧 **Advanced:**
• Use Claude Code CLI features directly
• Spawn agent teams for complex tasks
• Access workspace files and projects
    `.trim();

    await ctx.reply(help);
  }

  /**
   * /status - Show status
   */
  async handleStatus(ctx: Context): Promise<void> {
    const state = this.session.getState();
    const hasSession = !!state.sessionId;

    const status = `
**Session Status**

Session: ${hasSession ? '✅ Active' : '❌ None'}
${hasSession ? `ID: \`${state.sessionId?.substring(0, 8)}...\`` : ''}
Model: ${state.model}
Permission Mode: ${state.permissionMode}
Last Activity: ${new Date(state.lastActivity).toLocaleString()}

**Memory:**
Facts: ${(await this.memory.getFacts()).length}
Active Goals: ${(await this.memory.getActiveGoals()).length}
    `.trim();

    await ctx.reply(status);
  }

  /**
   * /clear - Clear session
   */
  async handleClear(ctx: Context): Promise<void> {
    await this.session.clear();
    await ctx.reply('✅ Session cleared. Starting fresh!');
  }

  /**
   * /model - Change model
   */
  async handleModel(ctx: Context, args?: string): Promise<void> {
    const state = this.session.getState();

    if (!args) {
      // Show current model and options
      const message = `
**Current Model:** ${state.model}

**Available Models:**
• \`/model opus\` - Most capable (default)
• \`/model sonnet\` - Balanced performance
• \`/model haiku\` - Fastest

Choose a model to switch.
      `.trim();

      await ctx.reply(message);
      return;
    }

    const model = args.toLowerCase() as ClaudeModel;

    if (!['opus', 'sonnet', 'haiku'].includes(model)) {
      await ctx.reply('❌ Invalid model. Use: opus, sonnet, or haiku');
      return;
    }

    await this.session.setModel(model);
    await ctx.reply(`✅ Model changed to: ${model}`);
  }

  /**
   * /mode - Change permission mode
   */
  async handleMode(ctx: Context, args?: string): Promise<void> {
    const state = this.session.getState();

    if (!args) {
      const message = `
**Current Mode:** ${state.permissionMode}

**Available Modes:**
• \`/mode default\` - Ask for tool permissions
• \`/mode accept\` - Auto-accept file edits
• \`/mode plan\` - Require plan before actions
• \`/mode bypass\` - Skip all permissions

Choose a mode to switch.
      `.trim();

      await ctx.reply(message);
      return;
    }

    const mode = args.toLowerCase() as PermissionMode;

    if (!['default', 'acceptEdits', 'plan', 'bypass'].includes(mode)) {
      await ctx.reply('❌ Invalid mode. Use: default, accept, plan, or bypass');
      return;
    }

    await this.session.setPermissionMode(mode === 'accept' ? 'acceptEdits' : mode);
    await ctx.reply(`✅ Permission mode changed to: ${mode}`);
  }
}
