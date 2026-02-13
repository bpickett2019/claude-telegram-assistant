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
        permissionMode: 'default',
        model: this.config.claude.model,
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
}
