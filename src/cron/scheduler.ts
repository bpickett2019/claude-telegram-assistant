/**
 * Cron Scheduler
 *
 * Manages scheduled tasks for proactive behavior
 */

import cron from 'node-cron';
import { ClaudeSpawner } from '../claude/spawner';
import { MemorySystem } from '../memory/supabase';
import { WorkspaceManager } from '../workspace/manager';
import type { Config, CronJob } from '../types';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobsFile: string;

  constructor(
    private config: Config,
    private spawner: ClaudeSpawner,
    private memory: MemorySystem,
    private workspace: WorkspaceManager,
    private sendTelegram: (message: string) => Promise<void>
  ) {
    this.jobsFile = join(config.workspace.dataDir, 'cron-jobs.json');
  }

  /**
   * Initialize scheduler
   */
  async init(): Promise<void> {
    await mkdir(this.config.workspace.dataDir, { recursive: true });

    if (!this.config.proactive.enabled) {
      console.log('[Cron] Proactive behavior disabled');
      return;
    }

    // Load saved jobs
    const savedJobs = await this.loadJobs();

    // Setup default jobs
    await this.setupDefaultJobs();

    // Restore saved jobs
    for (const job of savedJobs.filter(j => j.enabled)) {
      this.addJob(job.id, job.name, job.schedule, job.task);
    }

    console.log(`[Cron] Initialized with ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Setup default proactive jobs
   */
  private async setupDefaultJobs(): Promise<void> {
    // Smart check-in (periodic)
    if (this.config.proactive.checkinInterval > 0) {
      const interval = this.config.proactive.checkinInterval;
      const schedule = `*/${interval} * * * *`; // Every N minutes

      this.addJob(
        'smart-checkin',
        'Smart Check-in',
        schedule,
        'checkin'
      );
    }

    // Morning briefing (daily)
    if (this.config.proactive.briefingTime) {
      const [hour, minute] = this.config.proactive.briefingTime.split(':');
      const schedule = `${minute} ${hour} * * *`; // Daily at HH:MM

      this.addJob(
        'morning-briefing',
        'Morning Briefing',
        schedule,
        'briefing'
      );
    }
  }

  /**
   * Add a cron job
   */
  addJob(id: string, name: string, schedule: string, task: string): boolean {
    try {
      const cronTask = cron.schedule(schedule, async () => {
        await this.executeTask(id, task);
      }, {
        scheduled: false, // Don't start immediately
      });

      this.jobs.set(id, cronTask);
      cronTask.start();

      console.log(`[Cron] Added job: ${name} (${schedule})`);
      return true;
    } catch (error) {
      console.error(`[Cron] Failed to add job ${id}:`, error);
      return false;
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(jobId: string, task: string): Promise<void> {
    console.log(`[Cron] Executing task: ${jobId} (${task})`);

    try {
      switch (task) {
        case 'checkin':
          await this.smartCheckin();
          break;
        case 'briefing':
          await this.morningBriefing();
          break;
        default:
          console.warn(`[Cron] Unknown task: ${task}`);
      }
    } catch (error) {
      console.error(`[Cron] Task ${jobId} failed:`, error);
    }
  }

  /**
   * Smart check-in - Claude decides whether to reach out
   */
  private async smartCheckin(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();

    // Quiet hours (11pm - 8am)
    if (hour >= 23 || hour < 8) {
      console.log('[Cron] Smart check-in: Quiet hours, skipping');
      return;
    }

    // Build context
    const [workspaceFiles, memoryContext, goals] = await Promise.all([
      this.workspace.loadWorkspaceFiles(),
      this.memory.getMemoryContext(),
      this.memory.getActiveGoals(),
    ]);

    const timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const prompt = `
You are a proactive AI assistant. Decide if you should check in with the user.

CONTEXT:
- Current time: ${now.toLocaleString()} (${timeContext})
- Active goals: ${goals.map(g => g.content).join(', ') || 'None'}
- Timezone: ${this.config.user.timezone}

RULES:
1. Don't be annoying - max 2-3 check-ins per day
2. Only check in if there's a REASON (goal deadline, important context)
3. Be brief and helpful, not intrusive
4. Consider time of day (don't interrupt deep work hours)
5. If nothing important, respond with exactly: NO_CHECKIN

RESPOND IN THIS FORMAT:
DECISION: YES or NO
MESSAGE: [Your brief message if YES, or "none" if NO]
REASON: [Why you decided this]
    `.trim();

    const enrichedPrompt = this.spawner.buildEnrichedPrompt(
      prompt,
      workspaceFiles,
      memoryContext
    );

    const response = await this.spawner.spawn({
      prompt: enrichedPrompt,
      workingDir: this.workspace.getWorkspaceDir(),
    });

    if (response.error) {
      console.error('[Cron] Smart check-in failed:', response.error);
      return;
    }

    // Parse Claude's decision
    const decisionMatch = response.content.match(/DECISION:\s*(YES|NO)/i);
    const messageMatch = response.content.match(/MESSAGE:\s*(.+?)(?=\nREASON:|$)/is);

    const shouldCheckin = decisionMatch?.[1]?.toUpperCase() === 'YES';
    const message = messageMatch?.[1]?.trim();

    if (shouldCheckin && message && message !== 'none') {
      console.log('[Cron] Smart check-in: Sending message');
      await this.sendTelegram(message);
      await this.workspace.appendToTodayLog(`[Smart Check-in]\n${message}`);
    } else {
      console.log('[Cron] Smart check-in: No action needed');
    }
  }

  /**
   * Morning briefing - Daily summary
   */
  private async morningBriefing(): Promise<void> {
    console.log('[Cron] Generating morning briefing');

    const [workspaceFiles, memoryContext, goals] = await Promise.all([
      this.workspace.loadWorkspaceFiles(),
      this.memory.getMemoryContext(),
      this.memory.getActiveGoals(),
    ]);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `
Generate a brief morning briefing for ${this.config.user.name}.

CONTEXT:
- Date: ${dateStr}
- Timezone: ${this.config.user.timezone}
- Active goals: ${goals.map(g => {
      const deadline = g.deadline ? ` (deadline: ${new Date(g.deadline).toLocaleDateString()})` : '';
      return `${g.content}${deadline}`;
    }).join('; ') || 'None'}

Create a concise briefing (2-3 sentences max) that:
1. Greets them appropriately for the time
2. Highlights any urgent goals or deadlines today
3. Sets a positive, focused tone for the day

Keep it brief and actionable. No fluff.
    `.trim();

    const enrichedPrompt = this.spawner.buildEnrichedPrompt(
      prompt,
      workspaceFiles,
      memoryContext
    );

    const response = await this.spawner.spawn({
      prompt: enrichedPrompt,
      workingDir: this.workspace.getWorkspaceDir(),
    });

    if (response.error) {
      console.error('[Cron] Morning briefing failed:', response.error);
      return;
    }

    const briefing = response.content.trim();
    await this.sendTelegram(`🌅 ${briefing}`);
    await this.workspace.appendToTodayLog(`[Morning Briefing]\n${briefing}`);
  }

  /**
   * Remove a job
   */
  removeJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    job.stop();
    this.jobs.delete(id);
    console.log(`[Cron] Removed job: ${id}`);
    return true;
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    for (const [id, job] of this.jobs) {
      job.stop();
      console.log(`[Cron] Stopped job: ${id}`);
    }
    this.jobs.clear();
  }

  /**
   * List all jobs
   */
  listJobs(): CronJob[] {
    const jobs: CronJob[] = [];

    for (const [id, task] of this.jobs) {
      // Note: cron library doesn't expose schedule directly
      // We'd need to store this separately or parse from the task
      jobs.push({
        id,
        name: id,
        schedule: '', // Would need to be stored separately
        task: '',
        enabled: true,
      });
    }

    return jobs;
  }

  /**
   * Load jobs from file
   */
  private async loadJobs(): Promise<CronJob[]> {
    try {
      const content = await readFile(this.jobsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Save jobs to file
   */
  private async saveJobs(jobs: CronJob[]): Promise<void> {
    await writeFile(this.jobsFile, JSON.stringify(jobs, null, 2));
  }
}
