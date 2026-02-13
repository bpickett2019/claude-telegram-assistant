/**
 * Command Handlers
 *
 * Handles bot commands (/start, /status, /clear, etc.)
 */

import type { Context } from 'grammy';
import { SessionManager } from '../claude/session';
import { MemorySystem } from '../memory/supabase';
import { SkillsManager } from '../skills/manager';
import type { Config, ClaudeModel, PermissionMode } from '../types';

export class CommandHandler {
  constructor(
    private config: Config,
    private session: SessionManager,
    private memory: MemorySystem,
    private skills: SkillsManager
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
• /usage - Show token usage and costs
• /clear - Clear session and start fresh
• /compact - Compact context (reset session)

🤖 **Model & Settings:**
• /model - Change Claude model (opus/sonnet/haiku)
• /think - Set thinking level (high/medium/low)
• /verbose - Toggle verbose mode (on/off)

🔒 **Permission Modes:**
• /mode default - Ask for tool permissions
• /mode accept - Auto-accept file edits
• /mode plan - Require plan before actions
• /mode bypass - Skip all permissions (current)

📚 **Skills:**
• /skills - List available skills
• /skills info <name> - Show skill details
• /skills enable/disable <name> - Toggle skills

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
• /ping - Test bot responsiveness
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

  /**
   * /think - Set thinking level
   */
  async handleThink(ctx: Context, args?: string): Promise<void> {
    const state = this.session.getState();

    if (!args) {
      const message = `
**Current Thinking Level:** ${state.thinkingLevel}

**Available Levels:**
• \`/think high\` - Deep reasoning (slower, more thorough)
• \`/think medium\` - Balanced (default)
• \`/think low\` - Quick responses (faster, less detailed)

Higher levels use more tokens but give better results.
      `.trim();

      await ctx.reply(message);
      return;
    }

    const level = args.toLowerCase();

    if (!['high', 'medium', 'low'].includes(level)) {
      await ctx.reply('❌ Invalid level. Use: high, medium, or low');
      return;
    }

    await this.session.setThinkingLevel(level as 'high' | 'medium' | 'low');
    await ctx.reply(`✅ Thinking level set to: ${level}`);
  }

  /**
   * /usage - Show token usage stats
   */
  async handleUsage(ctx: Context): Promise<void> {
    const usage = this.session.getTokenUsage();
    const state = this.session.getState();

    const message = `
📊 **Token Usage Statistics**

**Current Session:**
• Input: ${usage.sessionInput.toLocaleString()} tokens
• Output: ${usage.sessionOutput.toLocaleString()} tokens
• Total: ${usage.sessionTotal.toLocaleString()} tokens
• Cost: $${usage.sessionCost.toFixed(4)}

**All Time:**
• Input: ${usage.input.toLocaleString()} tokens
• Output: ${usage.output.toLocaleString()} tokens
• Total: ${usage.total.toLocaleString()} tokens
• Cost: $${usage.cost.toFixed(4)}

**Model:** ${state.model}
**Last Updated:** ${new Date(state.tokenUsage.lastUpdated).toLocaleString()}
    `.trim();

    await ctx.reply(message);
  }

  /**
   * /verbose - Toggle verbose mode
   */
  async handleVerbose(ctx: Context, args?: string): Promise<void> {
    const state = this.session.getState();

    if (!args) {
      const message = `
**Verbose Mode:** ${state.verbose ? 'ON ✅' : 'OFF ❌'}

• \`/verbose on\` - Show tool use and thinking details
• \`/verbose off\` - Clean responses only

When ON, you'll see:
- Tool invocations
- Reasoning process
- Debug information
      `.trim();

      await ctx.reply(message);
      return;
    }

    const enabled = args.toLowerCase() === 'on';

    await this.session.setVerbose(enabled);
    await ctx.reply(`✅ Verbose mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * /skills - Manage skills
   */
  async handleSkills(ctx: Context, args?: string): Promise<void> {
    if (!args) {
      // List all skills
      const allSkills = this.skills.getAllSkills();

      if (allSkills.length === 0) {
        await ctx.reply('No skills available. Add skills to the skills/ directory.');
        return;
      }

      const bundled = allSkills.filter(s => s.type === 'bundled');
      const workspace = allSkills.filter(s => s.type === 'workspace');

      let message = '📚 **Available Skills**\n\n';

      if (bundled.length > 0) {
        message += '**Bundled:**\n';
        for (const skill of bundled) {
          const status = skill.enabled ? '✅' : '❌';
          message += `${status} \`${skill.name}\` - ${skill.description}\n`;
        }
      }

      if (workspace.length > 0) {
        message += '\n**Workspace:**\n';
        for (const skill of workspace) {
          const status = skill.enabled ? '✅' : '❌';
          message += `${status} \`${skill.name}\` - ${skill.description}\n`;
        }
      }

      message += '\n**Commands:**\n';
      message += '• `/skills info <name>` - Show skill details\n';
      message += '• `/skills enable <name>` - Enable skill\n';
      message += '• `/skills disable <name>` - Disable skill';

      await ctx.reply(message);
      return;
    }

    const [command, skillName] = args.split(' ');

    if (command === 'info' && skillName) {
      const skill = this.skills.getSkill(skillName);
      if (!skill) {
        await ctx.reply(`❌ Skill '${skillName}' not found`);
        return;
      }

      const message = `
**${skill.name}**
${skill.description}

**Type:** ${skill.type}
**Status:** ${skill.enabled ? 'Enabled ✅' : 'Disabled ❌'}
**Path:** \`${skill.path}\`

Use \`/skills ${skill.enabled ? 'disable' : 'enable'} ${skill.name}\` to toggle.
      `.trim();

      await ctx.reply(message);
      return;
    }

    if (command === 'enable' && skillName) {
      const success = await this.skills.enableSkill(skillName);
      if (success) {
        await ctx.reply(`✅ Skill '${skillName}' enabled`);
      } else {
        await ctx.reply(`❌ Skill '${skillName}' not found`);
      }
      return;
    }

    if (command === 'disable' && skillName) {
      const success = await this.skills.disableSkill(skillName);
      if (success) {
        await ctx.reply(`✅ Skill '${skillName}' disabled`);
      } else {
        await ctx.reply(`❌ Skill '${skillName}' not found`);
      }
      return;
    }

    await ctx.reply('❌ Invalid command. Use: /skills, /skills info <name>, /skills enable <name>, or /skills disable <name>');
  }

  /**
   * /compact - Compact session context
   */
  async handleCompact(ctx: Context): Promise<void> {
    await ctx.reply('🔄 Compacting session context...');

    // Clear session to force context reset
    await this.session.clear();

    await ctx.reply('✅ Session context compacted. Next message will start fresh.');
  }

  /**
   * /ping - Simple ping
   */
  async handlePing(ctx: Context): Promise<void> {
    await ctx.reply('🏓 Pong!');
  }
}
