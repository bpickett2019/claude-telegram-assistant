# Architecture Overview

## Project Structure

```
claude-telegram-assistant/
├── src/
│   ├── main.ts                          # Entry point & orchestration
│   ├── config/
│   │   └── index.ts                     # Configuration loader
│   ├── types/
│   │   └── index.ts                     # TypeScript definitions
│   ├── bot/
│   │   └── telegram.ts                  # grammY bot wrapper
│   ├── claude/
│   │   ├── spawner.ts                   # CLI spawner
│   │   └── session.ts                   # Session state
│   ├── memory/
│   │   └── supabase.ts                  # Persistent memory
│   ├── workspace/
│   │   └── manager.ts                   # Workspace files
│   ├── skills/
│   │   └── manager.ts                   # Skills system
│   ├── cron/
│   │   └── scheduler.ts                 # Proactive tasks
│   ├── handlers/
│   │   ├── message.ts                   # Message routing
│   │   ├── commands.ts                  # Bot commands
│   │   ├── permissions.ts               # Permission controls
│   │   └── projects.ts                  # Project management
│   └── teams/                           # Agent teams (future)
├── templates/                           # Workspace templates
│   ├── AGENTS.md
│   ├── SOUL.md
│   └── TOOLS.md
├── supabase/
│   ├── schema.sql                       # Database schema
│   └── functions/                       # Edge Functions
└── skills/                              # Bundled skills
```

## Component Flow

### 1. Message Flow

```
Telegram Message
    ↓
TelegramBot (security check)
    ↓
MessageHandler
    ↓
[Load Context]
- Workspace files (AGENTS.md, SOUL.md, TOOLS.md)
- Memory context (facts, goals from Supabase)
- Semantic search (relevant past messages)
- Skills context
    ↓
ClaudeSpawner (build enriched prompt)
    ↓
Spawn Claude CLI with:
- --resume <session-id>
- --model <opus|sonnet|haiku>
- --mode <permission-mode>
- Context-enriched prompt
    ↓
Parse response:
- Extract session ID
- Process memory tags ([REMEMBER:], [GOAL:], [DONE:])
- Clean response
    ↓
Send to Telegram (with chunking)
    ↓
Update session state
```

### 2. Permission Flow

```
Claude attempts tool use
    ↓
PermissionHandler.requiresPermission()
    ├─ bypass mode → allow
    ├─ plan mode → require approval for all
    ├─ acceptEdits → auto-approve Edit/Write
    └─ default → require for sensitive tools
        ↓
Send Telegram inline buttons
    ↓
User clicks Allow/Deny
    ↓
Resolve promise → continue/block
```

### 3. Proactive Behavior Flow

```
CronScheduler initialized
    ↓
Register jobs:
- Smart check-in (every N minutes)
- Morning briefing (daily at HH:MM)
    ↓
Job triggered
    ↓
Gather context:
- Time of day
- Active goals
- Recent activity
- Workspace memory
    ↓
Spawn Claude with decision prompt
    ↓
Parse decision (YES/NO)
    ↓
If YES: Send message via Telegram
```

### 4. Project Flow

```
User: /createproject my-app
    ↓
ProjectHandler creates:
- New directory in projects/
- Project metadata
- Project ID
    ↓
User: /switchproject
    ↓
Shows inline keyboard with projects
    ↓
User selects project
    ↓
SessionManager updates currentProject
    ↓
All Claude spawns use project directory
```

## Key Design Patterns

### 1. **Workspace Injection**
Every Claude spawn gets context files injected into the prompt:
- AGENTS.md - Startup instructions
- SOUL.md - Personality definition
- TOOLS.md - Local environment
- MEMORY.md - Long-term memory

### 2. **Session Continuity**
- Session ID extracted from Claude CLI output
- Stored in `~/.claude-assistant/data/session.json`
- Passed via `--resume` flag on next spawn
- Maintains conversation continuity across restarts

### 3. **Memory Intent Tags**
Claude can embed tags in responses:
```
[REMEMBER: User prefers TypeScript]
[GOAL: Finish API | DEADLINE: 2026-02-15]
[DONE: API integration]
```
These are automatically parsed, stored in Supabase, and stripped from output.

### 4. **Semantic Search**
- All messages get embeddings (via Supabase Edge Function)
- On new message, semantic search finds relevant past context
- Injected into prompt automatically

### 5. **Modular Skills**
- Skills are SKILL.md files in directories
- Bundled skills (shipped with project)
- Workspace skills (user-created)
- Loaded on demand when mentioned

## Data Flow

### Storage Locations

```
~/.claude-assistant/
├── data/
│   ├── session.json              # Current session state
│   ├── projects.json             # Project metadata
│   └── cron-jobs.json            # Scheduled jobs
├── workspace/
│   ├── AGENTS.md                 # Startup guide
│   ├── SOUL.md                   # Personality
│   ├── TOOLS.md                  # Local notes
│   ├── USER.md                   # User profile
│   ├── .skills/                  # Workspace skills
│   └── memory/
│       ├── MEMORY.md             # Long-term memory
│       └── YYYY-MM-DD.md         # Daily logs
└── projects/
    └── <project-id>/             # Isolated project dirs

Supabase:
├── messages                      # Conversation history
├── memory                        # Facts & goals
└── logs                          # Observability
```

### State Management

**Session State** (SessionManager):
- sessionId: Current Claude session
- lastActivity: Timestamp
- currentProject: Active project ID
- permissionMode: default|acceptEdits|plan|bypass
- model: opus|sonnet|haiku

**Project State** (ProjectHandler):
- Projects list with paths
- Current project tracking
- Last accessed timestamps

**Cron State** (CronScheduler):
- Active cron jobs
- Last run timestamps
- Next run schedule

## Security Model

### 1. User Authentication
- Single user ID whitelist
- Checked on every message
- No OAuth, no tokens

### 2. Lock File
- `~/.claude-assistant/bot.lock`
- Prevents multiple instances
- PID-based with stale detection

### 3. Permission Controls
- Tool-level permission checks
- Inline Telegram buttons
- Timeout after 5 minutes
- Different modes for different trust levels

### 4. Data Isolation
- Projects have isolated directories
- Workspace files separate from projects
- Memory tagged by channel

## Extension Points

### Adding New Features

**New Command:**
```typescript
// In handlers/commands.ts
async handleMyCommand(ctx: Context) { ... }

// In main.ts
bot.onCommand('mycommand', (ctx) => commandHandler.handleMyCommand(ctx));
```

**New Message Type:**
```typescript
// In handlers/message.ts
async handleDocument(ctx: Context) { ... }

// In main.ts
bot.onDocument((ctx) => messageHandler.handleDocument(ctx));
```

**New Skill:**
```
workspace/.skills/my-skill/
└── SKILL.md          # With frontmatter: name, description
```

**New Cron Job:**
```typescript
scheduler.addJob('job-id', 'Job Name', '*/30 * * * *', 'task-name');
```

## Performance Considerations

### 1. Claude CLI Spawning
- Each message spawns a new process
- Context files loaded every time
- Can be slow for large workspaces
- Mitigated by --resume (session continuity)

### 2. Supabase Queries
- Embeddings generation is async
- Semantic search limited to 5 results
- Facts/goals cached during prompt building

### 3. Message Chunking
- Telegram limit: 4096 characters
- Automatic splitting at natural boundaries
- Multiple API calls for long responses

### 4. Cron Jobs
- Run in main process (not spawned)
- Can slow down bot if tasks take too long
- Consider background jobs for heavy tasks

## Future Enhancements

1. **Agent Teams** - Spawn parallel Claude Code sessions
2. **File Browser** - Navigate directories via Telegram
3. **Local Whisper** - Complete local transcription
4. **Daemon Scripts** - systemd/launchd service files
5. **MCP Integration** - Deep integration with MCP servers
6. **Voice Response** - TTS via ElevenLabs
7. **Web Dashboard** - Monitor bot status via browser

## Testing Strategy

- Unit tests for handlers
- Integration tests for memory system
- E2E tests for Telegram flows
- Mock Claude CLI for testing
