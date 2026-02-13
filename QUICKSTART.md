# Quick Start Guide

Get your autonomous AI assistant running in 10 minutes.

## Step 1: Prerequisites

Install required tools:

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Claude Code CLI (if not already installed)
# Visit: https://claude.ai/claude-code

# Verify installations
bun --version
claude --version
```

## Step 2: Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url> claude-telegram-assistant
cd claude-telegram-assistant

# Install dependencies
bun install

# Create environment file
cp .env.example .env
```

## Step 3: Configure Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Choose a name (e.g., "My AI Assistant")
4. Choose a username (e.g., "my_ai_assistant_bot")
5. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

Get your user ID:
1. Search for **@userinfobot** on Telegram
2. Send `/start`
3. Copy your user ID (a number like: `123456789`)

## Step 4: Setup Supabase

1. Go to [supabase.com](https://supabase.com)
2. Sign up (free) and create a new project
3. Wait ~2 minutes for provisioning
4. Go to **Project Settings** → **API**
5. Copy:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

6. Go to **SQL Editor** in Supabase dashboard
7. Copy the contents of `supabase/schema.sql`
8. Paste and click **Run**
9. Verify tables created: messages, memory, logs

## Step 5: Configure Environment

Edit `.env` file with your credentials:

```bash
# Required
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_USER_ID=123456789
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Recommended
USER_NAME=YourName
USER_TIMEZONE=America/New_York

# Optional - Voice transcription (Groq)
VOICE_PROVIDER=groq
GROQ_API_KEY=<get from console.groq.com>

# Optional - Proactive behavior
ENABLE_PROACTIVE=true
CHECKIN_INTERVAL=30
BRIEFING_TIME=09:00
```

## Step 6: Start the Bot

```bash
# Development mode (with auto-reload)
bun run dev

# Or production mode
bun start
```

You should see:
```
🤖 Claude Telegram Assistant
============================

✓ Configuration loaded
Initializing components...
✓ Components initialized
✓ Supabase connected
✓ Ready! Authorized user: 123456789
Listening for messages...
```

## Step 7: Test It!

1. Open Telegram
2. Find your bot (search for the username you chose)
3. Send `/start` command
4. Try: "Hello! Can you help me with something?"
5. The bot should respond with Claude's intelligence!

## Available Commands

Try these commands in Telegram:

```
/start          - Welcome message
/help           - Show all commands
/status         - Session and memory stats
/clear          - Start fresh session
/model          - Change Claude model (opus/sonnet/haiku)
/mode           - Change permission mode
/createproject  - Create a new project
/listprojects   - Show all projects
```

## What's Next?

### Enable Voice Messages

Get a free Groq API key:
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free)
3. Create an API key
4. Add to `.env`: `GROQ_API_KEY=...`
5. Set `VOICE_PROVIDER=groq`
6. Restart bot

Now you can send voice messages!

### Setup Proactive Behavior

Edit `.env`:
```bash
ENABLE_PROACTIVE=true
CHECKIN_INTERVAL=30      # Check in every 30 minutes
BRIEFING_TIME=09:00      # Morning briefing at 9 AM
```

Your assistant will now:
- Smart check-ins throughout the day (when appropriate)
- Morning briefings with goals and context
- Proactive reminders

### Create Projects

Projects give you isolated workspaces:

```
/createproject my-app
/createproject my-repo https://github.com/user/repo
/listprojects
```

Switch between projects to keep work organized.

### Customize Personality

Edit workspace files:
- `~/.claude-assistant/workspace/SOUL.md` - Personality
- `~/.claude-assistant/workspace/AGENTS.md` - Behavior
- `~/.claude-assistant/workspace/TOOLS.md` - Local notes

Changes apply to all future conversations.

### Add Skills

Create custom skills:

```bash
mkdir -p ~/.claude-assistant/workspace/.skills/my-skill
nano ~/.claude-assistant/workspace/.skills/my-skill/SKILL.md
```

Format:
```markdown
---
name: my-skill
description: What this skill does
---

# My Skill

Instructions for Claude on how to use this skill...
```

## Troubleshooting

### Bot not responding?

Check:
- Bot token is correct (test: `/start`)
- User ID matches yours
- Claude CLI is in PATH: `which claude`
- Bot process is running: `ps aux | grep claude`

### "Unauthorized" message?

Your Telegram user ID doesn't match `.env`. Get correct ID from @userinfobot.

### Memory not working?

Test Supabase:
```bash
# In Supabase SQL Editor:
SELECT * FROM messages LIMIT 1;
```

If empty or error, re-run `supabase/schema.sql`.

### Voice not working?

Check `.env`:
- `VOICE_PROVIDER=groq`
- `GROQ_API_KEY=<your-key>`

Test: Send a voice message. Should transcribe.

## Running in Production

### Keep it running (Linux)

```bash
# Create systemd service
sudo nano /etc/systemd/system/claude-assistant.service
```

Paste:
```ini
[Unit]
Description=Claude Telegram Assistant
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/claude-telegram-assistant
ExecStart=/usr/local/bin/bun start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable claude-assistant
sudo systemctl start claude-assistant
sudo systemctl status claude-assistant
```

View logs:
```bash
sudo journalctl -u claude-assistant -f
```

## Getting Help

- Check logs: Bot prints debug info to console
- Read `README.md` for detailed docs
- Read `ARCHITECTURE.md` for technical details
- Open an issue if you find a bug

## What You Can Do

Your assistant can:
- ✅ Read and write files
- ✅ Execute commands (with permission)
- ✅ Search the web
- ✅ Analyze images
- ✅ Transcribe voice
- ✅ Remember facts and goals
- ✅ Work on projects
- ✅ Use Claude Code tools
- ✅ Access MCP servers
- ✅ Proactive check-ins

And more! It has the full power of Claude Code CLI.

---

**You're all set!** Your autonomous AI assistant is now running. Enjoy! 🎉
