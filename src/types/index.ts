/**
 * Core type definitions for Claude Telegram Assistant
 */

export interface SessionState {
  sessionId: string | null;
  lastActivity: string;
  currentProject: string | null;
  permissionMode: PermissionMode;
  model: ClaudeModel;
  thinkingLevel: ThinkingLevel;
  verbose: boolean;
  tokenUsage: TokenUsage;
}

export interface TokenUsage {
  totalInput: number;
  totalOutput: number;
  sessionInput: number;
  sessionOutput: number;
  lastUpdated: string;
}

export type ThinkingLevel = 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'git' | 'local';
  remote?: string;
  branch?: string;
  createdAt: string;
  lastAccessed: string;
}

export interface Memory {
  id: string;
  type: 'fact' | 'goal' | 'completed_goal' | 'preference';
  content: string;
  deadline?: string;
  completedAt?: string;
  priority: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  type: 'bundled' | 'workspace';
  enabled: boolean;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  task: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypass';

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface PermissionRequest {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  timestamp: Date;
}

export interface WorkspaceFiles {
  agents: string;
  tools: string;
  soul: string;
  memory: string;
}

export interface ClaudeSpawnOptions {
  prompt: string;
  resume?: boolean;
  sessionId?: string;
  workingDir?: string;
  model?: ClaudeModel;
  permissionMode?: PermissionMode;
  imagePath?: string;
  teamMode?: boolean;
}

export interface ClaudeResponse {
  content: string;
  sessionId?: string;
  toolUse?: ToolUse;
  error?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface ToolUse {
  name: string;
  input: Record<string, unknown>;
  requiresPermission: boolean;
}

export interface Config {
  telegram: {
    botToken: string;
    userId: string;
  };
  claude: {
    path: string;
    model: ClaudeModel;
    permissionMode: PermissionMode;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  user: {
    name: string;
    timezone: string;
  };
  workspace: {
    dir: string;
    projectsDir: string;
    dataDir: string;
  };
  voice: {
    provider: 'groq' | 'whisper' | 'none';
    groqApiKey?: string;
    whisperBinary?: string;
    whisperModel?: string;
  };
  proactive: {
    enabled: boolean;
    checkinInterval: number;
    briefingTime: string;
  };
  agentTeams: {
    enabled: boolean;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
