/**
 * Workspace Manager
 *
 * Manages workspace files (AGENTS.md, TOOLS.md, SOUL.md, MEMORY.md)
 * and daily memory logs
 */

import { readFile, writeFile, mkdir, copyFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import type { Config, WorkspaceFiles } from '../types';

export class WorkspaceManager {
  private workspaceDir: string;
  private memoryDir: string;
  private templateDir: string;

  constructor(private config: Config) {
    this.workspaceDir = config.workspace.dir;
    this.memoryDir = join(this.workspaceDir, 'memory');
    this.templateDir = join(dirname(dirname(__dirname)), 'templates');
  }

  /**
   * Initialize workspace
   */
  async init(): Promise<void> {
    await mkdir(this.workspaceDir, { recursive: true });
    await mkdir(this.memoryDir, { recursive: true });

    // Copy template files if they don't exist
    await this.ensureFile('AGENTS.md');
    await this.ensureFile('TOOLS.md');
    await this.ensureFile('SOUL.md');

    // Create MEMORY.md if it doesn't exist
    const memoryFile = join(this.memoryDir, 'MEMORY.md');
    try {
      await access(memoryFile);
    } catch {
      await writeFile(
        memoryFile,
        '# Long-Term Memory\n\nThis file contains your curated long-term memory.\nUpdate it with important insights, decisions, and learnings.\n\n'
      );
    }

    // Create today's log if it doesn't exist
    await this.getTodayLogPath();
  }

  /**
   * Ensure a workspace file exists (copy from template if needed)
   */
  private async ensureFile(filename: string): Promise<void> {
    const targetPath = join(this.workspaceDir, filename);
    const templatePath = join(this.templateDir, filename);

    try {
      await access(targetPath);
    } catch {
      try {
        await copyFile(templatePath, targetPath);
        console.log(`[Workspace] Created ${filename} from template`);
      } catch (error) {
        console.error(`[Workspace] Error copying template ${filename}:`, error);
      }
    }
  }

  /**
   * Load all workspace files for injection into prompts
   */
  async loadWorkspaceFiles(): Promise<WorkspaceFiles> {
    const [agents, tools, soul, memory] = await Promise.all([
      this.readFileOrEmpty('AGENTS.md'),
      this.readFileOrEmpty('TOOLS.md'),
      this.readFileOrEmpty('SOUL.md'),
      this.readFileOrEmpty(join('memory', 'MEMORY.md')),
    ]);

    return { agents, tools, soul, memory };
  }

  /**
   * Read a file or return empty string if it doesn't exist
   */
  private async readFileOrEmpty(relativePath: string): Promise<string> {
    try {
      return await readFile(join(this.workspaceDir, relativePath), 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Get today's log file path (creates if doesn't exist)
   */
  async getTodayLogPath(): Promise<string> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logPath = join(this.memoryDir, `${today}.md`);

    try {
      await access(logPath);
    } catch {
      const header = `# Daily Log - ${today}\n\n`;
      await writeFile(logPath, header);
    }

    return logPath;
  }

  /**
   * Append to today's log
   */
  async appendToTodayLog(content: string): Promise<void> {
    const logPath = await this.getTodayLogPath();
    const timestamp = new Date().toLocaleTimeString();
    const entry = `\n## ${timestamp}\n${content}\n`;

    try {
      const existing = await readFile(logPath, 'utf-8');
      await writeFile(logPath, existing + entry);
    } catch (error) {
      console.error('[Workspace] Error appending to log:', error);
    }
  }

  /**
   * Load today's log
   */
  async loadTodayLog(): Promise<string> {
    try {
      const logPath = await this.getTodayLogPath();
      return await readFile(logPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Update MEMORY.md
   */
  async updateMemory(content: string): Promise<void> {
    const memoryPath = join(this.memoryDir, 'MEMORY.md');
    await writeFile(memoryPath, content);
  }

  /**
   * Create USER.md with profile information
   */
  async createUserProfile(profileData: Record<string, string>): Promise<void> {
    const userPath = join(this.workspaceDir, 'USER.md');

    const sections = [
      '# User Profile',
      '',
      `**Name**: ${profileData.name || 'User'}`,
      `**Timezone**: ${profileData.timezone || 'UTC'}`,
      '',
      '## About',
      profileData.about || 'No additional information provided.',
      '',
      '## Preferences',
      profileData.preferences || 'No preferences specified.',
      '',
      '## Work & Schedule',
      profileData.schedule || 'No schedule information provided.',
      '',
    ];

    await writeFile(userPath, sections.join('\n'));
  }

  /**
   * Get workspace directory
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }
}
