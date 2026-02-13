/**
 * File Browser Handler
 *
 * Navigate project files via Telegram inline keyboards
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, dirname, basename, relative } from 'path';
import { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import type { Config } from '../types';
import { ProjectHandler } from './projects';

interface BrowserState {
  currentPath: string;
  page: number;
}

export class FileBrowserHandler {
  private browserStates: Map<string, BrowserState> = new Map();
  private readonly itemsPerPage = 10;

  constructor(
    private config: Config,
    private projects: ProjectHandler
  ) {}

  /**
   * Handle /ls command - list files in current directory
   */
  async handleLsCommand(ctx: Context): Promise<void> {
    const args = ctx.message?.text?.split(' ').slice(1);
    const userId = ctx.from?.id.toString() || '';

    // Get current working directory
    const basePath = this.projects.getCurrentProjectPath();
    const requestedPath = args?.[0] || '.';
    const fullPath = join(basePath, requestedPath);

    await this.showDirectory(ctx, userId, fullPath, 0);
  }

  /**
   * Show directory listing with pagination
   */
  async showDirectory(
    ctx: Context,
    userId: string,
    path: string,
    page: number
  ): Promise<void> {
    try {
      const entries = await readdir(path, { withFileTypes: true });

      // Filter out hidden files
      const visible = entries.filter(e => !e.name.startsWith('.'));

      // Sort: directories first, then files alphabetically
      visible.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      // Pagination
      const totalPages = Math.ceil(visible.length / this.itemsPerPage);
      const start = page * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      const pageItems = visible.slice(start, end);

      if (pageItems.length === 0) {
        await ctx.reply('📁 Empty directory');
        return;
      }

      // Build keyboard
      const keyboard = new InlineKeyboard();

      for (const entry of pageItems) {
        const icon = entry.isDirectory() ? '📁' : '📄';
        const label = `${icon} ${entry.name}`;
        const action = entry.isDirectory() ? 'dir' : 'file';
        const data = `fb_${action}_${Buffer.from(join(path, entry.name)).toString('base64')}`;

        keyboard.text(label, data).row();
      }

      // Navigation buttons
      const navRow = [];
      if (page > 0) {
        navRow.push({ text: '⬅️ Prev', callback_data: `fb_page_${page - 1}_${Buffer.from(path).toString('base64')}` });
      }
      if (page < totalPages - 1) {
        navRow.push({ text: 'Next ➡️', callback_data: `fb_page_${page + 1}_${Buffer.from(path).toString('base64')}` });
      }
      if (navRow.length > 0) {
        keyboard.row(...navRow.map(b => InlineKeyboard.text(b.text, b.callback_data)));
      }

      // Parent directory button
      const parentPath = dirname(path);
      const basePath = this.projects.getCurrentProjectPath();
      if (path !== basePath) {
        keyboard.row(
          InlineKeyboard.text('⬆️ Parent', `fb_dir_${Buffer.from(parentPath).toString('base64')}`)
        );
      }

      // Update state
      this.browserStates.set(userId, { currentPath: path, page });

      const relativePath = relative(basePath, path) || '.';
      const message = [
        `📁 **${relativePath}**`,
        '',
        `Files: ${visible.length}`,
        `Page: ${page + 1}/${totalPages}`,
      ].join('\n');

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      await ctx.reply(`❌ Error reading directory: ${error}`);
    }
  }

  /**
   * Show file content with syntax highlighting hint
   */
  async showFile(ctx: Context, filePath: string): Promise<void> {
    try {
      const stats = await stat(filePath);

      // Check file size
      if (stats.size > 100000) { // 100KB
        await ctx.reply(
          `📄 **${basename(filePath)}**\n\n` +
          `File is too large (${(stats.size / 1024).toFixed(1)}KB) to display directly.\n\n` +
          `Use Claude to read it: "Read the file ${filePath}"`
        );
        return;
      }

      const content = await readFile(filePath, 'utf-8');

      // Try to detect language for syntax highlighting
      const ext = filePath.split('.').pop()?.toLowerCase();
      const language = this.detectLanguage(ext);

      // Split into chunks if needed
      const maxLength = 3800; // Leave room for formatting
      if (content.length <= maxLength) {
        const message = [
          `📄 **${basename(filePath)}**`,
          ``,
          `\`\`\`${language}`,
          content,
          `\`\`\``,
        ].join('\n');

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } else {
        // Too long, show preview
        const preview = content.substring(0, maxLength);
        const message = [
          `📄 **${basename(filePath)}**`,
          ``,
          `File is ${content.length} characters. Showing first ${maxLength}:`,
          ``,
          `\`\`\`${language}`,
          preview,
          `\`\`\``,
          ``,
          `_Use Claude to read the full file_`,
        ].join('\n');

        await ctx.reply(message, { parse_mode: 'Markdown' });
      }

      // Show actions
      const keyboard = new InlineKeyboard()
        .text('✏️ Edit', `fb_edit_${Buffer.from(filePath).toString('base64')}`)
        .text('🗑️ Delete', `fb_delete_${Buffer.from(filePath).toString('base64')}`);

      await ctx.reply('**File Actions:**', {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      if ((error as any).code === 'EISDIR') {
        await this.showDirectory(ctx, ctx.from?.id.toString() || '', filePath, 0);
      } else {
        await ctx.reply(`❌ Error reading file: ${error}`);
      }
    }
  }

  /**
   * Handle callback queries for file browser
   */
  async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData?.startsWith('fb_')) return;

    const userId = ctx.from?.id.toString() || '';

    try {
      const parts = callbackData.substring(3).split('_');
      const action = parts[0];

      switch (action) {
        case 'dir': {
          const pathBase64 = parts[1];
          const path = Buffer.from(pathBase64, 'base64').toString('utf-8');
          await this.showDirectory(ctx, userId, path, 0);
          await ctx.answerCallbackQuery();
          break;
        }

        case 'file': {
          const pathBase64 = parts[1];
          const path = Buffer.from(pathBase64, 'base64').toString('utf-8');
          await this.showFile(ctx, path);
          await ctx.answerCallbackQuery();
          break;
        }

        case 'page': {
          const page = parseInt(parts[1]);
          const pathBase64 = parts[2];
          const path = Buffer.from(pathBase64, 'base64').toString('utf-8');
          await this.showDirectory(ctx, userId, path, page);
          await ctx.answerCallbackQuery();
          break;
        }

        case 'edit': {
          const pathBase64 = parts[1];
          const path = Buffer.from(pathBase64, 'base64').toString('utf-8');
          await ctx.reply(
            `To edit **${basename(path)}**, tell Claude:\n\n` +
            `"Edit ${path} and change..."`
          );
          await ctx.answerCallbackQuery({ text: 'Ask Claude to edit' });
          break;
        }

        case 'delete': {
          const pathBase64 = parts[1];
          const path = Buffer.from(pathBase64, 'base64').toString('utf-8');
          await ctx.reply(
            `⚠️ To delete **${basename(path)}**, tell Claude:\n\n` +
            `"Delete ${path}"\n\n` +
            `_Claude will ask for confirmation_`
          );
          await ctx.answerCallbackQuery({ text: 'Ask Claude to delete' });
          break;
        }

        default:
          await ctx.answerCallbackQuery({ text: 'Unknown action' });
      }
    } catch (error) {
      console.error('[FileBrowser] Callback error:', error);
      await ctx.answerCallbackQuery({ text: '❌ Error', show_alert: true });
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(ext?: string): string {
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      sh: 'bash',
      bash: 'bash',
      zsh: 'zsh',
      sql: 'sql',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      txt: 'text',
    };

    return ext ? languageMap[ext] || 'text' : 'text';
  }

  /**
   * Show diff view for git changes
   */
  async showDiff(ctx: Context, filePath?: string): Promise<void> {
    const message = filePath
      ? `To see diff for **${filePath}**, ask Claude:\n\n"Show git diff for ${filePath}"`
      : `To see git diff, ask Claude:\n\n"Show git diff"`;

    await ctx.reply(message);
  }

  /**
   * Search files by name
   */
  async searchFiles(ctx: Context, query: string): Promise<void> {
    await ctx.reply(
      `To search for files matching "${query}", ask Claude:\n\n` +
      `"Find files matching ${query}"`
    );
  }
}
