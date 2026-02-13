# Claude Telegram Assistant

**Your personal autonomous AI assistant via Telegram, powered by Claude Code CLI**

This project combines the best aspects of three mature systems to create a truly autonomous assistant:
- **godagoo/claude-telegram-relay**: Memory, relay pattern, proactive behavior
- **openclaw/openclaw**: Autonomy model with workspace files, skills, agent coordination
- **Nickqiaoo/chatcode**: Mature Telegram UX with inline controls and project management

```
You ──▶ Telegram ──▶ Bot ──▶ Claude Code CLI ──▶ Response
                              │
                         Supabase (memory)
                         Workspace (persistence)
                         Agent Teams (complex tasks)
```

## Features

### 🧠 **Persistent Memory**
- Semantic search over conversation history
- Facts and goals stored in Supabase
- Long-term memory files (MEMORY.md)
- Daily logs for session continuity

### 🤖 **Full Claude Code Power**
- Direct access to Claude Code CLI
- All tools available: files, git, web search, MCP servers
- Session continuity via --resume
- Multiple model support (Opus, Sonnet, Haiku)

### 🔄 **Proactive Behavior**
- Smart check-ins that know when to reach out
- Daily morning briefings
- Scheduled tasks via cron
- Context-aware interruptions

### 👥 **Agent Teams**
- Spawn parallel Claude Code sessions
- Coordinate complex multi-part tasks
- Shared task lists
- Inter-agent communication

### 🎤 **Multimodal Input**
- Text messages
- Voice transcription (Groq or local Whisper)
- Image analysis
- Document processing

### 🏗️ **Workspace System**
- AGENTS.md - Session startup guide
- SOUL.md - Personality and behavior
- TOOLS.md - Local environment notes
- Skills system for specialized capabilities

### 🔒 **Security**
- User ID whitelist (only you can use it)
- Lock file prevents multiple instances
- No data exfiltration
- MCP servers from ~/.claude/settings.json

## Prerequisites

- **[Bun](https://bun.sh)** runtime
- **[Claude Code](https://claude.ai/claude-code)** CLI installed and authenticated
- A **Telegram** account
- **Supabase** account (free tier works)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url> claude-telegram-assistant
cd claude-telegram-assistant
bun install
```

### 2. Create Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Get your user ID from **@userinfobot**

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to **Project Settings** → **API**
3. Copy **Project URL** and **anon public key**
4. Run the schema: Copy contents of `supabase/schema.sql` to SQL Editor and execute

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
```bash
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_USER_ID=<from @userinfobot>
SUPABASE_URL=<from Supabase dashboard>
SUPABASE_ANON_KEY=<from Supabase dashboard>
USER_NAME=<your first name>
USER_TIMEZONE=<e.g., America/New_York>
```

### 5. Start the Bot

```bash
bun run dev    # Development (with auto-reload)
# or
bun start      # Production
```

### 6. Test It!

Open Telegram and send a message to your bot. It should respond with Claude's intelligence!

## Project Structure

```
claude-telegram-assistant/
├── src/
│   ├── main.ts              # Entry point
│   ├── config/              # Configuration
│   ├── types/               # TypeScript types
│   ├── bot/                 # Telegram bot
│   │   └── telegram.ts
│   ├── claude/              # Claude Code integration
│   │   ├── spawner.ts       # CLI spawner
│   │   └── session.ts       # Session management
│   ├── memory/              # Persistent memory
│   │   └── supabase.ts
│   ├── workspace/           # Workspace files
│   │   └── manager.ts
│   ├── handlers/            # Message & command handlers
│   │   ├── message.ts
│   │   └── commands.ts
│   ├── skills/              # Skills system
│   ├── cron/                # Proactive scheduler
│   └── teams/               # Agent teams
├── templates/               # Workspace templates
│   ├── AGENTS.md
│   ├── SOUL.md
│   └── TOOLS.md
├── supabase/
│   ├── schema.sql           # Database schema
│   └── functions/           # Edge Functions
│       ├── embed/           # Auto-embedding
│       └── search/          # Semantic search
├── scripts/                 # Setup scripts
└── config/                  # Config files
```

## Commands

### Bot Commands

- `/start` - Welcome message
- `/help` - Show help
- `/status` - Session status and stats
- `/clear` - Clear session and start fresh
- `/model [opus|sonnet|haiku]` - Change Claude model
- `/mode [default|accept|plan|bypass]` - Change permission mode

### Permission Modes

- **default** - Ask for tool permissions
- **accept** - Auto-accept file edits
- **plan** - Require plan before actions
- **bypass** - Skip all permissions (use carefully!)

## Advanced Features

### Voice Transcription

**Option A: Groq (Recommended)**
```bash
# In .env:
VOICE_PROVIDER=groq
GROQ_API_KEY=<from console.groq.com>
```

**Option B: Local Whisper**
```bash
# Install whisper-cpp
brew install whisper-cpp  # macOS
# or build from source

# In .env:
VOICE_PROVIDER=whisper
WHISPER_BINARY=whisper-cpp
WHISPER_MODEL=/path/to/model
```

### Proactive Behavior

Enable smart check-ins and morning briefings:

```bash
# In .env:
ENABLE_PROACTIVE=true
CHECKIN_INTERVAL=30      # minutes
BRIEFING_TIME=09:00      # HH:MM
```

### Agent Teams

For complex tasks, Claude can spawn parallel sessions:

```bash
# In .env:
ENABLE_AGENT_TEAMS=true
```

Then in Telegram:
```
Create an agent team to analyze this codebase from three angles:
- Security review
- Performance optimization
- Code quality
```

### MCP Servers

Claude Code CLI reads `~/.claude/settings.json`, so MCP servers configured there work automatically.

Example:
```bash
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --access-token TOKEN
```

## Always-On Daemon

### Linux (systemd)

```bash
# Create service file
sudo nano /etc/systemd/system/claude-assistant.service
```

```ini
[Unit]
Description=Claude Telegram Assistant
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/path/to/claude-telegram-assistant
ExecStart=/path/to/bun start
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable claude-assistant
sudo systemctl start claude-assistant
sudo systemctl status claude-assistant
```

### macOS (launchd)

Coming soon in scripts/

## Memory System

### How Memory Works

1. **Conversation History** - All messages stored in Supabase with embeddings
2. **Facts & Goals** - Extracted from your conversations automatically
3. **Semantic Search** - Relevant past context injected into prompts
4. **Workspace Files** - MEMORY.md for curated long-term memory

### Memory Tags

Claude can use special tags to manage memory:

```
[REMEMBER: User prefers TypeScript over JavaScript]
[GOAL: Finish the API integration | DEADLINE: 2026-02-15]
[DONE: API integration]
```

These are automatically processed and hidden from you.

## Workspace Files

### AGENTS.md
Session startup guide - read every time Claude starts

### SOUL.md
Defines Claude's personality and core behavior

### TOOLS.md
Local environment notes (SSH hosts, API keys location, etc.)

### MEMORY.md
Your curated long-term memory file

### Daily Logs
`memory/YYYY-MM-DD.md` - Raw logs of what happened each day

## Skills System

Coming soon - modular capabilities loaded on demand.

## Troubleshooting

### Bot not responding?
- Check `.env` has correct bot token and user ID
- Verify Claude Code CLI is in PATH: `which claude`
- Check bot is running: `ps aux | grep claude-assistant`

### Memory not working?
- Test Supabase connection: `bun run test:supabase`
- Verify schema is deployed
- Check Supabase logs in dashboard

### Voice transcription failing?
- Groq: Verify API key is valid
- Local: Check `whisper-cpp` is installed and model exists

## Contributing

This project is inspired by three excellent open-source projects. If you find value, consider contributing to them:
- [godagoo/claude-telegram-relay](https://github.com/godagoo/claude-telegram-relay)
- [openclaw/openclaw](https://github.com/openclaw/openclaw)
- [Nickqiaoo/chatcode](https://github.com/Nickqiaoo/chatcode)

## License

MIT

---

**Built with:**
- [Bun](https://bun.sh)
- [grammY](https://grammy.dev)
- [Claude Code](https://claude.ai/claude-code)
- [Supabase](https://supabase.com)
