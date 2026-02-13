/**
 * Permission Handler
 *
 * Manages inline permission controls for tool usage approval
 */

import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { Config } from '../types';

interface PermissionRequest {
  id: string;
  userId: string;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: Date;
  resolve: (approved: boolean) => void;
  reject: (error: Error) => void;
}

export class PermissionHandler {
  private pendingRequests: Map<string, PermissionRequest> = new Map();

  constructor(private config: Config) {}

  /**
   * Request permission from user via Telegram inline buttons
   */
  async requestPermission(
    ctx: Context,
    toolName: string,
    input: Record<string, unknown>,
    description?: string
  ): Promise<boolean> {
    const requestId = this.generateRequestId();

    // Create promise to wait for user response
    const permissionPromise = new Promise<boolean>((resolve, reject) => {
      const request: PermissionRequest = {
        id: requestId,
        userId: ctx.from?.id.toString() || '',
        toolName,
        input,
        timestamp: new Date(),
        resolve,
        reject,
      };

      this.pendingRequests.set(requestId, request);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Permission request timed out'));
        }
      }, 5 * 60 * 1000);
    });

    try {
      // Send permission request with inline buttons
      await this.sendPermissionRequest(ctx, requestId, toolName, description);

      // Wait for user response
      return await permissionPromise;
    } catch (error) {
      console.error('[Permissions] Request failed:', error);
      return false;
    }
  }

  /**
   * Send permission request message with inline buttons
   */
  private async sendPermissionRequest(
    ctx: Context,
    requestId: string,
    toolName: string,
    description?: string
  ): Promise<void> {
    const keyboard = new InlineKeyboard()
      .text('✅ Allow', `perm_allow_${requestId}`)
      .text('❌ Deny', `perm_deny_${requestId}`);

    const message = [
      '🔐 **Permission Request**',
      '',
      `**Tool:** \`${toolName}\``,
      description ? `\n${description}` : '',
      '',
      '_Click a button to respond_',
    ].join('\n');

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  /**
   * Handle callback from inline buttons
   */
  async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    // Parse callback data
    const match = callbackData.match(/^perm_(allow|deny)_(.+)$/);
    if (!match) return;

    const [, action, requestId] = match;
    const approved = action === 'allow';

    // Find pending request
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      await ctx.answerCallbackQuery({
        text: '❌ This request has expired',
        show_alert: true,
      });
      return;
    }

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Resolve promise
    request.resolve(approved);

    // Update message
    const emoji = approved ? '✅' : '❌';
    const status = approved ? 'Allowed' : 'Denied';

    await ctx.editMessageText(
      `${emoji} **${status}**\n\nTool: \`${request.toolName}\``,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCallbackQuery({
      text: `${status}!`,
    });
  }

  /**
   * Check if a tool requires permission based on permission mode
   */
  requiresPermission(toolName: string, permissionMode: string): boolean {
    if (permissionMode === 'bypass') return false;
    if (permissionMode === 'plan') return true; // All tools need approval in plan mode

    // Tools that typically need permission in default mode
    const sensitiveTools = [
      'Bash',
      'Write',
      'Edit',
      'WebSearch',
      'WebFetch',
    ];

    // In acceptEdits mode, Edit and Write are auto-approved
    if (permissionMode === 'acceptEdits') {
      return sensitiveTools.includes(toolName) && !['Edit', 'Write'].includes(toolName);
    }

    return sensitiveTools.includes(toolName);
  }

  /**
   * Format tool input for display
   */
  formatToolInput(input: Record<string, unknown>): string {
    const entries = Object.entries(input)
      .filter(([key]) => !key.startsWith('_')) // Skip internal params
      .slice(0, 5); // Limit to 5 entries

    if (entries.length === 0) return '';

    const formatted = entries
      .map(([key, value]) => {
        const val = typeof value === 'string' && value.length > 100
          ? value.substring(0, 100) + '...'
          : JSON.stringify(value);
        return `• ${key}: ${val}`;
      })
      .join('\n');

    return '\n\n**Parameters:**\n' + formatted;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Get pending requests count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    for (const request of this.pendingRequests.values()) {
      request.reject(new Error('Cleared by system'));
    }
    this.pendingRequests.clear();
  }
}
