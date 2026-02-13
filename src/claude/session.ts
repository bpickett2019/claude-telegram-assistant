/**
 * Session Manager
 *
 * Manages Claude Code CLI session state and continuity
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { SessionState, Config } from '../types';

export class SessionManager {
  private sessionFile: string;
  private state: SessionState | null = null;

  constructor(private config: Config) {
    this.sessionFile = join(config.workspace.dataDir, 'session.json');
  }

  /**
   * Initialize session manager
   */
  async init(): Promise<void> {
    await mkdir(this.config.workspace.dataDir, { recursive: true });
    await this.load();
  }

  /**
   * Load session state from disk
   */
  async load(): Promise<SessionState> {
    try {
      const content = await readFile(this.sessionFile, 'utf-8');
      this.state = JSON.parse(content);
    } catch {
      this.state = {
        sessionId: null,
        lastActivity: new Date().toISOString(),
        currentProject: null,
        permissionMode: this.config.claude.permissionMode,
        model: this.config.claude.model,
        thinkingLevel: 'medium',
        verbose: false,
        tokenUsage: {
          totalInput: 0,
          totalOutput: 0,
          sessionInput: 0,
          sessionOutput: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    return this.state;
  }

  /**
   * Save session state to disk
   */
  async save(): Promise<void> {
    if (!this.state) return;

    await writeFile(this.sessionFile, JSON.stringify(this.state, null, 2));
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    if (!this.state) {
      throw new Error('Session not initialized. Call init() first.');
    }
    return this.state;
  }

  /**
   * Update session ID (from Claude CLI output)
   */
  async updateSessionId(sessionId: string): Promise<void> {
    if (!this.state) return;

    this.state.sessionId = sessionId;
    this.state.lastActivity = new Date().toISOString();
    await this.save();
  }

  /**
   * Update current project
   */
  async setProject(projectId: string | null): Promise<void> {
    if (!this.state) return;

    this.state.currentProject = projectId;
    await this.save();
  }

  /**
   * Update permission mode
   */
  async setPermissionMode(mode: SessionState['permissionMode']): Promise<void> {
    if (!this.state) return;

    this.state.permissionMode = mode;
    await this.save();
  }

  /**
   * Update model
   */
  async setModel(model: SessionState['model']): Promise<void> {
    if (!this.state) return;

    this.state.model = model;
    await this.save();
  }

  /**
   * Clear session (start fresh)
   */
  async clear(): Promise<void> {
    if (!this.state) return;

    this.state.sessionId = null;
    this.state.lastActivity = new Date().toISOString();
    await this.save();
  }

  /**
   * Update activity timestamp
   */
  async touch(): Promise<void> {
    if (!this.state) return;

    this.state.lastActivity = new Date().toISOString();
    await this.save();
  }

  /**
   * Set thinking level
   */
  async setThinkingLevel(level: 'high' | 'medium' | 'low'): Promise<void> {
    if (!this.state) return;

    this.state.thinkingLevel = level;
    await this.save();
  }

  /**
   * Toggle verbose mode
   */
  async setVerbose(verbose: boolean): Promise<void> {
    if (!this.state) return;

    this.state.verbose = verbose;
    await this.save();
  }

  /**
   * Record token usage from a Claude response
   */
  async recordUsage(tokensIn: number, tokensOut: number, newSession: boolean = false): Promise<void> {
    if (!this.state) return;

    // If new session, reset session counters
    if (newSession) {
      this.state.tokenUsage.sessionInput = 0;
      this.state.tokenUsage.sessionOutput = 0;
    }

    // Update totals
    this.state.tokenUsage.totalInput += tokensIn;
    this.state.tokenUsage.totalOutput += tokensOut;
    this.state.tokenUsage.sessionInput += tokensIn;
    this.state.tokenUsage.sessionOutput += tokensOut;
    this.state.tokenUsage.lastUpdated = new Date().toISOString();

    await this.save();
  }

  /**
   * Get token usage stats
   */
  getTokenUsage(): {
    input: number;
    output: number;
    total: number;
    sessionInput: number;
    sessionOutput: number;
    sessionTotal: number;
    cost: number;
    sessionCost: number;
  } {
    if (!this.state) {
      return {
        input: 0,
        output: 0,
        total: 0,
        sessionInput: 0,
        sessionOutput: 0,
        sessionTotal: 0,
        cost: 0,
        sessionCost: 0,
      };
    }

    const model = this.state.model;
    const pricing = {
      opus: { input: 15 / 1_000_000, output: 75 / 1_000_000 },
      sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      haiku: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    };

    const price = pricing[model];
    const cost = (this.state.tokenUsage.totalInput * price.input) + (this.state.tokenUsage.totalOutput * price.output);
    const sessionCost = (this.state.tokenUsage.sessionInput * price.input) + (this.state.tokenUsage.sessionOutput * price.output);

    return {
      input: this.state.tokenUsage.totalInput,
      output: this.state.tokenUsage.totalOutput,
      total: this.state.tokenUsage.totalInput + this.state.tokenUsage.totalOutput,
      sessionInput: this.state.tokenUsage.sessionInput,
      sessionOutput: this.state.tokenUsage.sessionOutput,
      sessionTotal: this.state.tokenUsage.sessionInput + this.state.tokenUsage.sessionOutput,
      cost,
      sessionCost,
    };
  }
}
