/**
 * Telegram Bot
 *
 * Core Telegram bot using grammY with security and message routing
 */

import { Bot, Context } from 'grammy';
import type { Config } from '../types';

export class TelegramBot {
  private bot: Bot;
  private allowedUserId: string;

  constructor(private config: Config) {
    this.bot = new Bot(config.telegram.botToken);
    this.allowedUserId = config.telegram.userId;
    this.setupMiddleware();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security: Only allow configured user
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id.toString();

      if (userId !== this.allowedUserId) {
        console.warn(`[Bot] Unauthorized access attempt from ${userId}`);
        await ctx.reply('This bot is private.');
        return;
      }

      await next();
    });

    // Logging middleware
    this.bot.use(async (ctx, next) => {
      const type = ctx.message?.text ? 'text' :
                   ctx.message?.photo ? 'photo' :
                   ctx.message?.voice ? 'voice' :
                   ctx.message?.document ? 'document' :
                   ctx.callbackQuery ? 'callback' : 'unknown';

      console.debug(`[Bot] Received ${type} from ${ctx.from?.id}`);
      await next();
    });
  }

  /**
   * Register command handler
   */
  onCommand(command: string, handler: (ctx: Context) => Promise<void>): void {
    this.bot.command(command, handler);
  }

  /**
   * Register text message handler
   */
  onText(handler: (ctx: Context) => Promise<void>): void {
    this.bot.on('message:text', handler);
  }

  /**
   * Register photo message handler
   */
  onPhoto(handler: (ctx: Context) => Promise<void>): void {
    this.bot.on('message:photo', handler);
  }

  /**
   * Register voice message handler
   */
  onVoice(handler: (ctx: Context) => Promise<void>): void {
    this.bot.on('message:voice', handler);
  }

  /**
   * Register document message handler
   */
  onDocument(handler: (ctx: Context) => Promise<void>): void {
    this.bot.on('message:document', handler);
  }

  /**
   * Register callback query handler
   */
  onCallback(handler: (ctx: Context) => Promise<void>): void {
    this.bot.on('callback_query', handler);
  }

  /**
   * Start bot (polling mode)
   */
  async start(): Promise<void> {
    console.log('[Bot] Starting in polling mode...');
    await this.bot.start({
      onStart: () => {
        console.log('[Bot] Running!');
      },
    });
  }

  /**
   * Stop bot gracefully
   */
  async stop(): Promise<void> {
    console.log('[Bot] Stopping...');
    await this.bot.stop();
  }

  /**
   * Get bot API
   */
  getApi() {
    return this.bot.api;
  }

  /**
   * Get bot instance for advanced operations
   */
  getInstance(): Bot {
    return this.bot;
  }
}
