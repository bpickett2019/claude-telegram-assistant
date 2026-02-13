/**
 * Skills Manager
 *
 * Manages modular skills (SKILL.md files) inspired by OpenClaw
 */

import { readFile, readdir, mkdir, access } from 'fs/promises';
import { join } from 'path';
import type { Config, Skill } from '../types';

export class SkillsManager {
  private skillsDir: string;
  private bundledSkillsDir: string;
  private skills: Map<string, Skill> = new Map();

  constructor(private config: Config) {
    this.skillsDir = join(config.workspace.dir, '.skills');
    this.bundledSkillsDir = join(process.cwd(), 'skills');
  }

  /**
   * Initialize skills system
   */
  async init(): Promise<void> {
    await mkdir(this.skillsDir, { recursive: true });
    await this.loadSkills();
    console.log(`[Skills] Loaded ${this.skills.size} skills`);
  }

  /**
   * Load all skills from workspace and bundled directories
   */
  private async loadSkills(): Promise<void> {
    // Load bundled skills
    try {
      const bundledSkills = await this.loadSkillsFromDir(
        this.bundledSkillsDir,
        'bundled'
      );
      for (const skill of bundledSkills) {
        this.skills.set(skill.name, skill);
      }
    } catch {
      // Bundled skills directory might not exist yet
    }

    // Load workspace skills (override bundled if same name)
    try {
      const workspaceSkills = await this.loadSkillsFromDir(
        this.skillsDir,
        'workspace'
      );
      for (const skill of workspaceSkills) {
        this.skills.set(skill.name, skill);
      }
    } catch {
      // Workspace skills might not exist yet
    }
  }

  /**
   * Load skills from a directory
   */
  private async loadSkillsFromDir(
    dir: string,
    type: 'bundled' | 'workspace'
  ): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      await access(dir);
    } catch {
      return skills;
    }

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = join(dir, entry.name);
      const skillFile = join(skillPath, 'SKILL.md');

      try {
        await access(skillFile);
        const skill = await this.parseSkillFile(skillFile, entry.name, type);
        if (skill) {
          skills.push(skill);
        }
      } catch {
        // SKILL.md doesn't exist or can't be read
        continue;
      }
    }

    return skills;
  }

  /**
   * Parse a SKILL.md file
   */
  private async parseSkillFile(
    filePath: string,
    name: string,
    type: 'bundled' | 'workspace'
  ): Promise<Skill | null> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
      let description = '';

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        description = descMatch?.[1]?.trim() || '';
      }

      return {
        name,
        description: description || `Skill: ${name}`,
        path: filePath,
        type,
        enabled: true,
      };
    } catch (error) {
      console.error(`[Skills] Error parsing ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get a skill's content
   */
  async getSkillContent(name: string): Promise<string | null> {
    const skill = this.skills.get(name);
    if (!skill) return null;

    try {
      return await readFile(skill.path, 'utf-8');
    } catch (error) {
      console.error(`[Skills] Error reading ${name}:`, error);
      return null;
    }
  }

  /**
   * List all available skills
   */
  listSkills(): Skill[] {
    return Array.from(this.skills.values()).filter(s => s.enabled);
  }

  /**
   * Search skills by name or description
   */
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.listSkills().filter(
      skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all skills (enabled and disabled)
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a specific skill by name
   */
  getSkill(name: string): Skill | null {
    return this.skills.get(name) || null;
  }

  /**
   * Enable a skill
   */
  async enableSkill(name: string): Promise<boolean> {
    const skill = this.skills.get(name);
    if (!skill) return false;

    skill.enabled = true;
    return true;
  }

  /**
   * Disable a skill
   */
  async disableSkill(name: string): Promise<boolean> {
    const skill = this.skills.get(name);
    if (!skill) return false;

    skill.enabled = false;
    return true;
  }

  /**
   * Get skills context for prompt injection
   */
  async getSkillsContext(): Promise<string> {
    const enabledSkills = this.listSkills();

    if (enabledSkills.length === 0) {
      return '';
    }

    const skillList = enabledSkills
      .map(s => `- **${s.name}**: ${s.description}`)
      .join('\n');

    return `## AVAILABLE SKILLS\n\n${skillList}\n\nTo use a skill, mention its name and I'll load its instructions.`;
  }

  /**
   * Reload all skills
   */
  async reload(): Promise<void> {
    this.skills.clear();
    await this.loadSkills();
    console.log(`[Skills] Reloaded ${this.skills.size} skills`);
  }
}
