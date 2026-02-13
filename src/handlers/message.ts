/**
 * Message Handlers
 *
 * Handles all types of messages from Telegram and routes them to Claude
 */

import type { Context } from 'grammy';
import { ClaudeSpawner } from '../claude/spawner';
import { SessionManager } from '../claude/session';
import { MemorySystem } from '../memory/supabase';
import { WorkspaceManager } from '../workspace/manager';
import { VoiceHandler } from './voice';
import type { Config } from '../types';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export class MessageHandler {
  private voiceHandler: VoiceHandler;

  constructor(
    private config: Config,
    private spawner: ClaudeSpawner,
    private session: SessionManager,
    private memory: MemorySystem,
    private workspace: WorkspaceManager
  ) {
    this.voiceHandler = new VoiceHandler(config);
  }

  /**
   * Handle text messages
   */
  async handleText(ctx: Context): Promise<void> {
    const text = ctx.message?.text;
    if (!text) return;

    await ctx.replyWithChatAction('typing');

    console.log(`[Message] Text: ${text.substring(0, 50)}...`);

    // Save user message
    await this.memory.saveMessage('user', text);

    // Get enriched context
    const [workspaceFiles, memoryContext, relevantContext] = await Promise.all([
      this.workspace.loadWorkspaceFiles(),
      this.memory.getMemoryContext(),
      this.memory.getRelevantContext(text),
    ]);

    // Build enriched prompt
    const enrichedPrompt = this.spawner.buildEnrichedPrompt(
      text,
      workspaceFiles,
      memoryContext,
      relevantContext
    );

    // Get session state
    const state = this.session.getState();

    // Spawn Claude with bot's codebase as working directory
    const response = await this.spawner.spawn({
      prompt: enrichedPrompt,
      resume: !!state.sessionId,
      sessionId: state.sessionId || undefined,
      model: state.model,
      permissionMode: state.permissionMode,
      workingDir: process.cwd(), // Bot's codebase, not workspace
    });

    if (response.error) {
      await ctx.reply(`⚠️ Error: ${response.error}`);
      return;
    }

    // Update session ID if present
    if (response.sessionId) {
      await this.session.updateSessionId(response.sessionId);
    }

    // Process memory intents and strip tags
    const cleanResponse = await this.memory.processMemoryIntents(response.content);

    // Save assistant response
    await this.memory.saveMessage('assistant', cleanResponse);

    // Send response (handle chunking for long messages)
    await this.sendResponse(ctx, cleanResponse);

    // Touch session activity
    await this.session.touch();
  }

  /**
   * Handle photo messages
   */
  async handlePhoto(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');

    console.log('[Message] Photo received');

    try {
      const photos = ctx.message?.photo;
      if (!photos || photos.length === 0) return;

      // Get highest resolution
      const photo = photos[photos.length - 1];
      const file = await ctx.api.getFile(photo.file_id);

      // Download
      const url = `https://api.telegram.org/file/bot${this.config.telegram.botToken}/${file.file_path}`;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();

      // Save temporarily
      const tempPath = join(this.config.workspace.dataDir, 'temp', `image_${Date.now()}.jpg`);
      await writeFile(tempPath, Buffer.from(buffer));

      // Build prompt
      const caption = ctx.message?.caption || 'Analyze this image.';
      const text = `[Image: ${tempPath}]\n\n${caption}`;

      // Save to memory
      await this.memory.saveMessage('user', `[Image]: ${caption}`);

      // Get context
      const [workspaceFiles, memoryContext] = await Promise.all([
        this.workspace.loadWorkspaceFiles(),
        this.memory.getMemoryContext(),
      ]);

      const enrichedPrompt = this.spawner.buildEnrichedPrompt(
        text,
        workspaceFiles,
        memoryContext
      );

      // Spawn Claude
      const state = this.session.getState();
      const claudeResponse = await this.spawner.spawn({
        prompt: enrichedPrompt,
        resume: !!state.sessionId,
        sessionId: state.sessionId || undefined,
        model: state.model,
        permissionMode: state.permissionMode,
        workingDir: process.cwd(), // Bot's codebase
        imagePath: tempPath,
      });

      // Cleanup
      await unlink(tempPath).catch(() => {});

      if (claudeResponse.error) {
        await ctx.reply(`⚠️ Error: ${claudeResponse.error}`);
        return;
      }

      if (claudeResponse.sessionId) {
        await this.session.updateSessionId(claudeResponse.sessionId);
      }

      const cleanResponse = await this.memory.processMemoryIntents(
        claudeResponse.content
      );
      await this.memory.saveMessage('assistant', cleanResponse);
      await this.sendResponse(ctx, cleanResponse);
      await this.session.touch();
    } catch (error) {
      console.error('[Message] Photo error:', error);
      await ctx.reply('⚠️ Error processing image.');
    }
  }

  /**
   * Handle voice messages
   */
  async handleVoice(ctx: Context): Promise<void> {
    await ctx.replyWithChatAction('typing');

    const voice = ctx.message?.voice;
    if (!voice) return;

    console.log(`[Message] Voice: ${voice.duration}s`);

    if (!this.voiceHandler.isConfigured()) {
      await ctx.reply(this.voiceHandler.getConfigMessage());
      return;
    }

    try {
      const file = await ctx.api.getFile(voice.file_id);
      const url = `https://api.telegram.org/file/bot${this.config.telegram.botToken}/${file.file_path}`;
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe
      const transcription = await this.voiceHandler.transcribe(buffer);
      if (!transcription) {
        await ctx.reply('⚠️ Could not transcribe voice message.');
        return;
      }

      console.log(`[Message] Transcribed: ${transcription}`);

      // Process as text
      await this.memory.saveMessage('user', `[Voice ${voice.duration}s]: ${transcription}`);

      const [workspaceFiles, memoryContext, relevantContext] = await Promise.all([
        this.workspace.loadWorkspaceFiles(),
        this.memory.getMemoryContext(),
        this.memory.getRelevantContext(transcription),
      ]);

      const enrichedPrompt = this.spawner.buildEnrichedPrompt(
        `[Voice message transcribed]: ${transcription}`,
        workspaceFiles,
        memoryContext,
        relevantContext
      );

      const state = this.session.getState();
      const claudeResponse = await this.spawner.spawn({
        prompt: enrichedPrompt,
        resume: !!state.sessionId,
        sessionId: state.sessionId || undefined,
        model: state.model,
        permissionMode: state.permissionMode,
        workingDir: process.cwd(), // Bot's codebase
      });

      if (claudeResponse.error) {
        await ctx.reply(`⚠️ Error: ${claudeResponse.error}`);
        return;
      }

      if (claudeResponse.sessionId) {
        await this.session.updateSessionId(claudeResponse.sessionId);
      }

      const cleanResponse = await this.memory.processMemoryIntents(
        claudeResponse.content
      );
      await this.memory.saveMessage('assistant', cleanResponse);
      await this.sendResponse(ctx, cleanResponse);
      await this.session.touch();
    } catch (error) {
      console.error('[Message] Voice error:', error);
      await ctx.reply('⚠️ Error processing voice message.');
    }
  }


  /**
   * Send response to Telegram (with chunking for long messages)
   */
  private async sendResponse(ctx: Context, text: string): Promise<void> {
    const MAX_LENGTH = 4000; // Telegram limit is 4096, leave some margin

    if (text.length <= MAX_LENGTH) {
      await ctx.reply(text);
      return;
    }

    // Split into chunks
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= MAX_LENGTH) {
        chunks.push(remaining);
        break;
      }

      // Try to split at natural boundaries
      let splitIndex = remaining.lastIndexOf('\n\n', MAX_LENGTH);
      if (splitIndex === -1) splitIndex = remaining.lastIndexOf('\n', MAX_LENGTH);
      if (splitIndex === -1) splitIndex = remaining.lastIndexOf(' ', MAX_LENGTH);
      if (splitIndex === -1) splitIndex = MAX_LENGTH;

      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex).trim();
    }

    // Send chunks
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  }
}
