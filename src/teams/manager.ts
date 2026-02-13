/**
 * Agent Teams Manager
 *
 * Manages Claude Code agent teams for complex multi-part tasks
 */

import { ClaudeSpawner } from '../claude/spawner';
import { WorkspaceManager } from '../workspace/manager';
import { MemorySystem } from '../memory/supabase';
import type { Config } from '../types';

interface TeamMember {
  name: string;
  agentId: string;
  role: string;
  status: 'idle' | 'working' | 'completed';
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  taskList: string[];
  createdAt: Date;
  completedAt?: Date;
}

export class AgentTeamsManager {
  private activeTeams: Map<string, Team> = new Map();

  constructor(
    private config: Config,
    private spawner: ClaudeSpawner,
    private workspace: WorkspaceManager,
    private memory: MemorySystem
  ) {}

  /**
   * Check if agent teams are enabled
   */
  isEnabled(): boolean {
    return this.config.agentTeams.enabled;
  }

  /**
   * Create a new agent team
   */
  async createTeam(
    name: string,
    description: string,
    roles: string[]
  ): Promise<Team | null> {
    if (!this.isEnabled()) {
      console.warn('[Teams] Agent teams not enabled');
      return null;
    }

    const teamId = this.generateTeamId();

    const team: Team = {
      id: teamId,
      name,
      members: [],
      taskList: [],
      createdAt: new Date(),
    };

    // Create team via Claude CLI
    const workspaceFiles = await this.workspace.loadWorkspaceFiles();
    const memoryContext = await this.memory.getMemoryContext();

    const prompt = `
Create an agent team named "${name}" for: ${description}

Team structure:
${roles.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Use the TeamCreate tool to set up the team, then spawn teammates for each role.
Coordinate work through the shared task list.
    `.trim();

    const enrichedPrompt = this.spawner.buildEnrichedPrompt(
      prompt,
      workspaceFiles,
      memoryContext
    );

    const response = await this.spawner.spawn({
      prompt: enrichedPrompt,
      workingDir: this.workspace.getWorkspaceDir(),
      teamMode: true,
    });

    if (response.error) {
      console.error('[Teams] Failed to create team:', response.error);
      return null;
    }

    // Store team
    this.activeTeams.set(teamId, team);

    console.log(`[Teams] Created team: ${name} (${teamId})`);
    return team;
  }

  /**
   * Spawn a teammate
   */
  async spawnTeammate(
    teamId: string,
    name: string,
    role: string,
    task: string
  ): Promise<boolean> {
    const team = this.activeTeams.get(teamId);
    if (!team) {
      console.error(`[Teams] Team not found: ${teamId}`);
      return false;
    }

    const workspaceFiles = await this.workspace.loadWorkspaceFiles();

    const prompt = `
You are "${name}" on team "${team.name}".

Your role: ${role}

Your task: ${task}

Work independently and coordinate through the task list.
When done, report your findings.
    `.trim();

    const enrichedPrompt = this.spawner.buildEnrichedPrompt(
      prompt,
      workspaceFiles
    );

    const response = await this.spawner.spawn({
      prompt: enrichedPrompt,
      workingDir: this.workspace.getWorkspaceDir(),
      teamMode: true,
    });

    if (response.error) {
      console.error(`[Teams] Failed to spawn teammate ${name}:`, response.error);
      return false;
    }

    // Add to team
    team.members.push({
      name,
      agentId: response.sessionId || this.generateAgentId(),
      role,
      status: 'working',
    });

    console.log(`[Teams] Spawned teammate: ${name} (${role})`);
    return true;
  }

  /**
   * Get team status
   */
  getTeamStatus(teamId: string): Team | null {
    return this.activeTeams.get(teamId) || null;
  }

  /**
   * List all active teams
   */
  listTeams(): Team[] {
    return Array.from(this.activeTeams.values());
  }

  /**
   * Complete a team (cleanup)
   */
  async completeTeam(teamId: string): Promise<boolean> {
    const team = this.activeTeams.get(teamId);
    if (!team) return false;

    team.completedAt = new Date();

    // Send completion message to Claude to cleanup
    const prompt = `
Clean up the agent team "${team.name}".

Shut down all teammates gracefully and remove team resources.
    `.trim();

    const response = await this.spawner.spawn({
      prompt,
      workingDir: this.workspace.getWorkspaceDir(),
    });

    if (response.error) {
      console.error('[Teams] Cleanup failed:', response.error);
    }

    // Remove from active teams
    this.activeTeams.delete(teamId);

    console.log(`[Teams] Completed team: ${team.name}`);
    return true;
  }

  /**
   * Get team summary for display
   */
  getTeamSummary(teamId: string): string {
    const team = this.activeTeams.get(teamId);
    if (!team) return 'Team not found';

    const summary = [
      `**Team: ${team.name}**`,
      `ID: ${teamId}`,
      `Members: ${team.members.length}`,
      '',
      'Members:',
      ...team.members.map(m => `- ${m.name} (${m.role}) - ${m.status}`),
      '',
      `Created: ${team.createdAt.toLocaleString()}`,
    ];

    if (team.completedAt) {
      summary.push(`Completed: ${team.completedAt.toLocaleString()}`);
    }

    return summary.join('\n');
  }

  /**
   * Generate unique team ID
   */
  private generateTeamId(): string {
    return 'team_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return 'agent_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
