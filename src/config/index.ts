/**
 * Configuration loader and validator
 */

import { homedir } from 'os';
import { join } from 'path';
import type { Config } from '../types';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

export function loadConfig(): Config {
  return {
    telegram: {
      botToken: required('TELEGRAM_BOT_TOKEN'),
      userId: required('TELEGRAM_USER_ID'),
    },
    claude: {
      path: optional('CLAUDE_PATH', 'claude'),
      model: (optional('CLAUDE_MODEL', 'opus') as 'opus' | 'sonnet' | 'haiku'),
    },
    supabase: {
      url: required('SUPABASE_URL'),
      anonKey: required('SUPABASE_ANON_KEY'),
    },
    user: {
      name: optional('USER_NAME', 'User'),
      timezone: optional('USER_TIMEZONE', Intl.DateTimeFormat().resolvedOptions().timeZone),
    },
    workspace: {
      dir: expandPath(optional('WORKSPACE_DIR', '~/.claude-assistant/workspace')),
      projectsDir: expandPath(optional('PROJECTS_DIR', '~/.claude-assistant/projects')),
      dataDir: expandPath(optional('DATA_DIR', '~/.claude-assistant/data')),
    },
    voice: {
      provider: (optional('VOICE_PROVIDER', 'none') as 'groq' | 'whisper' | 'none'),
      groqApiKey: optional('GROQ_API_KEY'),
      whisperBinary: optional('WHISPER_BINARY', 'whisper-cpp'),
      whisperModel: optional('WHISPER_MODEL'),
    },
    proactive: {
      enabled: optional('ENABLE_PROACTIVE', 'true') === 'true',
      checkinInterval: parseInt(optional('CHECKIN_INTERVAL', '30')),
      briefingTime: optional('BRIEFING_TIME', '09:00'),
    },
    agentTeams: {
      enabled: optional('ENABLE_AGENT_TEAMS', 'true') === 'true',
    },
    logLevel: (optional('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'),
  };
}

export function validateConfig(config: Config): void {
  // Validate Telegram
  if (!config.telegram.botToken.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
    throw new Error('Invalid Telegram bot token format');
  }

  if (!config.telegram.userId.match(/^\d+$/)) {
    throw new Error('Invalid Telegram user ID format');
  }

  // Validate Supabase URLs
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error('Invalid Supabase URL');
  }

  // Validate model
  if (!['opus', 'sonnet', 'haiku'].includes(config.claude.model)) {
    throw new Error('Invalid Claude model. Must be: opus, sonnet, or haiku');
  }

  // Validate voice provider
  if (!['groq', 'whisper', 'none'].includes(config.voice.provider)) {
    throw new Error('Invalid voice provider. Must be: groq, whisper, or none');
  }

  // Validate briefing time format
  if (!config.proactive.briefingTime.match(/^\d{2}:\d{2}$/)) {
    throw new Error('Invalid briefing time format. Must be HH:MM');
  }

  console.log('✓ Configuration validated successfully');
}
