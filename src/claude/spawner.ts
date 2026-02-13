/**
 * Claude Code CLI Spawner
 *
 * Handles spawning Claude Code CLI with proper configuration,
 * workspace injection, and session management.
 */

import { spawn } from 'bun';
import type { ClaudeSpawnOptions, ClaudeResponse, Config } from '../types';

export class ClaudeSpawner {
  constructor(private config: Config) {}

  /**
   * Spawn Claude Code CLI with the given options
   */
  async spawn(options: ClaudeSpawnOptions): Promise<ClaudeResponse> {
    const args = this.buildArgs(options);

    console.debug(`[Claude] Spawning: ${this.config.claude.path} ${args.join(' ')}`);

    try {
      // Prepare environment - remove CLAUDECODE to allow nested spawning
      const env = { ...process.env };
      delete env.CLAUDECODE;

      // Add agent teams flag if enabled
      if (this.config.agentTeams.enabled) {
        env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
      }

      const proc = spawn([this.config.claude.path, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
        cwd: options.workingDir || this.config.workspace.dir,
        env,
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        console.error(`[Claude] Error: ${stderr}`);
        return {
          content: '',
          error: stderr || `Claude exited with code ${exitCode}`,
        };
      }

      // Extract session ID if present
      const sessionMatch = stdout.match(/Session ID:\s*([a-f0-9-]+)/i);
      const sessionId = sessionMatch?.[1] || options.sessionId;

      return {
        content: stdout.trim(),
        sessionId,
      };
    } catch (error) {
      console.error('[Claude] Spawn error:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown spawn error',
      };
    }
  }

  /**
   * Build CLI arguments for Claude
   */
  private buildArgs(options: ClaudeSpawnOptions): string[] {
    const args: string[] = [];

    // Prompt
    args.push('-p', options.prompt);

    // Resume session if available
    if (options.resume && options.sessionId) {
      args.push('--resume', options.sessionId);
    }

    // Model selection
    if (options.model) {
      args.push('--model', options.model);
    }

    // Permission mode
    if (options.permissionMode && options.permissionMode !== 'default') {
      args.push('--mode', options.permissionMode);
    }

    // Output format (always text for parsing)
    args.push('--output-format', 'text');

    // Team mode flags (if enabled and requested)
    if (this.config.agentTeams.enabled && options.teamMode) {
      args.push('--teammate-mode', 'in-process');
    }

    return args;
  }

  /**
   * Build enriched prompt with workspace context
   */
  buildEnrichedPrompt(
    userMessage: string,
    workspaceFiles: {
      agents?: string;
      tools?: string;
      soul?: string;
      memory?: string;
    },
    memoryContext?: string,
    relevantMessages?: string,
  ): string {
    const parts: string[] = [];

    // System instruction
    parts.push(
      'You are a personal AI assistant responding via Telegram.',
      'You have full Claude Code capabilities: tools, file access, web search, git, and more.',
      'Keep responses concise and conversational for Telegram.'
    );

    // User info
    if (this.config.user.name) {
      parts.push(`\nYou are assisting ${this.config.user.name}.`);
    }

    // Current time
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      timeZone: this.config.user.timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    parts.push(`Current time: ${timeStr}`);

    // Workspace files
    if (workspaceFiles.soul) {
      parts.push('\n## WHO YOU ARE\n', workspaceFiles.soul);
    }

    if (workspaceFiles.agents) {
      parts.push('\n## WORKSPACE GUIDE\n', workspaceFiles.agents);
    }

    if (workspaceFiles.tools) {
      parts.push('\n## LOCAL ENVIRONMENT\n', workspaceFiles.tools);
    }

    // Memory context
    if (workspaceFiles.memory) {
      parts.push('\n## YOUR MEMORY\n', workspaceFiles.memory);
    }

    if (memoryContext) {
      parts.push('\n## FACTS & GOALS\n', memoryContext);
    }

    if (relevantMessages) {
      parts.push('\n## RELEVANT PAST CONTEXT\n', relevantMessages);
    }

    // Memory management instructions
    parts.push(
      '\n## MEMORY MANAGEMENT',
      'When the user shares important information, use these tags in your response:',
      '- [REMEMBER: fact to store] — for facts to remember',
      '- [GOAL: task | DEADLINE: optional date] — for goals',
      '- [DONE: search text] — to mark a goal as completed',
      '',
      'These tags are automatically processed and hidden from the user.',
    );

    // User message
    parts.push(`\n## USER MESSAGE\n${userMessage}`);

    return parts.join('\n');
  }
}
