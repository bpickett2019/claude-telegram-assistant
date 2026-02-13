/**
 * Project Handler
 *
 * Manages isolated project workspaces
 */

import { readFile, writeFile, mkdir, readdir, access } from 'fs/promises';
import { join } from 'path';
import { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import { SessionManager } from '../claude/session';
import type { Config, Project } from '../types';

export class ProjectHandler {
  private projectsFile: string;
  private projects: Map<string, Project> = new Map();

  constructor(
    private config: Config,
    private session: SessionManager
  ) {
    this.projectsFile = join(config.workspace.dataDir, 'projects.json');
  }

  /**
   * Initialize projects
   */
  async init(): Promise<void> {
    await mkdir(this.config.workspace.projectsDir, { recursive: true });
    await this.loadProjects();
    console.log(`[Projects] Loaded ${this.projects.size} projects`);
  }

  /**
   * Load projects from file
   */
  private async loadProjects(): Promise<void> {
    try {
      const content = await readFile(this.projectsFile, 'utf-8');
      const projectsArray = JSON.parse(content) as Project[];

      for (const project of projectsArray) {
        this.projects.set(project.id, project);
      }
    } catch {
      // File doesn't exist yet
    }
  }

  /**
   * Save projects to file
   */
  private async saveProjects(): Promise<void> {
    const projectsArray = Array.from(this.projects.values());
    await writeFile(this.projectsFile, JSON.stringify(projectsArray, null, 2));
  }

  /**
   * Create a new project
   */
  async createProject(
    name: string,
    type: 'git' | 'local',
    remote?: string
  ): Promise<Project> {
    const id = this.generateProjectId();
    const path = join(this.config.workspace.projectsDir, id);

    await mkdir(path, { recursive: true });

    const project: Project = {
      id,
      name,
      path,
      type,
      remote,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    this.projects.set(id, project);
    await this.saveProjects();

    return project;
  }

  /**
   * Get a project by ID
   */
  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /**
   * List all projects
   */
  listProjects(): Project[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    );
  }

  /**
   * Switch to a project
   */
  async switchProject(projectId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;

    // Update last accessed
    project.lastAccessed = new Date().toISOString();
    await this.saveProjects();

    // Update session
    await this.session.setProject(projectId);

    return true;
  }

  /**
   * Exit current project (return to default workspace)
   */
  async exitProject(): Promise<void> {
    await this.session.setProject(null);
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;

    this.projects.delete(projectId);
    await this.saveProjects();

    // If this was the current project, exit it
    const state = this.session.getState();
    if (state.currentProject === projectId) {
      await this.exitProject();
    }

    return true;
  }

  /**
   * Get current project working directory
   */
  getCurrentProjectPath(): string {
    const state = this.session.getState();

    if (state.currentProject) {
      const project = this.projects.get(state.currentProject);
      if (project) {
        return project.path;
      }
    }

    // Default to workspace directory
    return this.config.workspace.dir;
  }

  /**
   * Handle /createproject command
   */
  async handleCreateProject(ctx: Context): Promise<void> {
    const args = ctx.message?.text?.split(' ').slice(1);

    if (!args || args.length === 0) {
      await ctx.reply(
        '**Create Project**\n\n' +
        'Usage: `/createproject <name> [git-url]`\n\n' +
        'Examples:\n' +
        '• `/createproject my-app` - Create local project\n' +
        '• `/createproject my-repo https://github.com/user/repo` - Clone git repo',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const name = args[0];
    const gitUrl = args[1];

    try {
      const project = await this.createProject(
        name,
        gitUrl ? 'git' : 'local',
        gitUrl
      );

      // If git URL provided, clone it
      if (gitUrl) {
        await ctx.reply('🔄 Cloning repository...');

        try {
          const { spawn } = await import('bun');
          const proc = spawn([
            'git',
            'clone',
            gitUrl,
            project.path
          ], {
            stdout: 'pipe',
            stderr: 'pipe',
          });

          const exitCode = await proc.exited;

          if (exitCode !== 0) {
            const errorOutput = await new Response(proc.stderr).text();
            throw new Error(`Git clone failed: ${errorOutput}`);
          }

          await ctx.reply(
            `✅ **Project Created & Cloned**\n\n` +
            `Name: ${project.name}\n` +
            `Type: ${project.type}\n` +
            `Remote: ${gitUrl}\n` +
            `ID: \`${project.id}\`\n\n` +
            `Use \`/listprojects\` to switch to it.`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          await ctx.reply(
            `⚠️ Project created but git clone failed: ${error}\n\n` +
            `You can manually clone into: \`${project.path}\``,
            { parse_mode: 'Markdown' }
          );
        }
      } else {
        await ctx.reply(
          `✅ **Project Created**\n\n` +
          `Name: ${project.name}\n` +
          `Type: ${project.type}\n` +
          `ID: \`${project.id}\`\n\n` +
          `Use \`/listprojects\` to switch to it.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      await ctx.reply(`❌ Failed to create project: ${error}`);
    }
  }

  /**
   * Handle /listprojects command
   */
  async handleListProjects(ctx: Context): Promise<void> {
    const projects = this.listProjects();
    const state = this.session.getState();

    if (projects.length === 0) {
      await ctx.reply(
        'No projects yet.\n\nUse `/createproject` to create one.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Create inline keyboard
    const keyboard = new InlineKeyboard();

    for (const project of projects.slice(0, 10)) { // Limit to 10
      const isCurrent = project.id === state.currentProject;
      const label = isCurrent ? `✓ ${project.name}` : project.name;

      keyboard.text(label, `proj_switch_${project.id}`).row();
    }

    await ctx.reply(
      '**Your Projects**\n\n' +
      'Select a project to switch:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  }

  /**
   * Handle /exitproject command
   */
  async handleExitProject(ctx: Context): Promise<void> {
    const state = this.session.getState();

    if (!state.currentProject) {
      await ctx.reply('No active project to exit.');
      return;
    }

    const project = this.projects.get(state.currentProject);
    const projectName = project?.name || 'unknown';

    await this.exitProject();
    await ctx.reply(`✅ Exited project: **${projectName}**`, {
      parse_mode: 'Markdown',
    });
  }

  /**
   * Handle callback for project switching
   */
  async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData?.startsWith('proj_')) return;

    const match = callbackData.match(/^proj_switch_(.+)$/);
    if (!match) return;

    const projectId = match[1];
    const project = this.projects.get(projectId);

    if (!project) {
      await ctx.answerCallbackQuery({
        text: '❌ Project not found',
        show_alert: true,
      });
      return;
    }

    await this.switchProject(projectId);

    await ctx.editMessageText(
      `✅ **Switched to Project**\n\n` +
      `Name: ${project.name}\n` +
      `Type: ${project.type}\n` +
      `Path: \`${project.path}\``,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCallbackQuery({
      text: `Switched to: ${project.name}`,
    });
  }

  /**
   * Generate unique project ID
   */
  private generateProjectId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
