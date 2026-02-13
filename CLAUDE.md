# Development Guide

This is a development guide for contributing to the Claude Telegram Assistant project.

## Project Structure

```
claude-telegram-assistant/
├── src/
│   ├── bot/          # Telegram bot (grammY)
│   ├── claude/       # Claude CLI spawner & session
│   ├── config/       # Configuration loader
│   ├── cron/         # Proactive scheduler
│   ├── handlers/     # Message, command, permission handlers
│   ├── memory/       # Supabase memory system
│   ├── skills/       # Skills manager
│   ├── teams/        # Agent teams manager
│   ├── workspace/    # Workspace file manager
│   ├── types/        # TypeScript type definitions
│   └── main.ts       # Entry point
├── templates/        # Workspace templates (AGENTS.md, SOUL.md, TOOLS.md)
├── supabase/         # Database schema
├── scripts/          # Setup scripts (systemd, launchd)
└── node_modules/     # Dependencies (not in git)
```

## Development Workflow

### Setup
```bash
bun install           # Install dependencies
cp .env.example .env  # Create config file
# Edit .env with your credentials
```

### Development
```bash
bun run dev           # Hot reload development mode
bun run start         # Production mode
bun run build         # Build for distribution
```

### Code Style
- TypeScript with strict mode
- Async/await for all I/O operations
- Error handling with try/catch
- Console logging with prefixes: `[Component]`
- Type safety throughout

## Key Concepts

### Session Continuity
- Claude CLI session IDs are extracted from stdout
- Sessions are resumed with `--resume` flag
- Session state persisted in `~/.claude-assistant/data/session.json`

### Memory System
- Messages stored in Supabase with embeddings
- Memory intent tags: `[REMEMBER:]`, `[GOAL:]`, `[DONE:]`
- Semantic search via Edge Function
- Workspace files provide continuity

### Permission System
- Telegram inline buttons for approval
- Modes: default, acceptEdits, plan, bypass
- 5-minute timeout on permission requests

### Workspace Injection
All prompts are enriched with:
- `AGENTS.md` - Session startup guide
- `SOUL.md` - Personality definition
- `TOOLS.md` - Local environment notes
- `MEMORY.md` - Long-term curated memory
- Database facts and goals
- Semantic search results

## Adding Features

### New Command
1. Add handler in `src/handlers/commands.ts`
2. Register in `src/main.ts`
3. Add to help text

### New Message Type
1. Add handler in `src/handlers/message.ts`
2. Register in `src/bot/telegram.ts`
3. Test with real Telegram messages

### New Skill
1. Create directory in `workspace/.skills/`
2. Add `SKILL.md` with frontmatter
3. Use OpenClaw pattern

## Testing

```bash
# Test individual components
bun scripts/test-telegram.ts   # Test Telegram connection
bun scripts/test-supabase.ts   # Test database
bun scripts/test-voice.ts      # Test voice transcription
```

## Deployment

### Linux (systemd)
```bash
sudo scripts/setup-systemd.sh
sudo systemctl status claude-telegram-assistant
```

### macOS (launchd)
```bash
scripts/setup-launchd.sh
launchctl list | grep claude
```

## Troubleshooting

### Bot won't start
- Check `.env` file exists and has all required fields
- Verify Telegram bot token is valid
- Test Supabase connection

### Permission errors
- Ensure `TELEGRAM_USER_ID` matches your account
- Check file permissions in workspace directory

### Memory not working
- Verify Supabase credentials
- Check database schema is created
- Test with `/status` command

## Architecture Decisions

### Why Bun?
- Fast startup time
- Built-in TypeScript support
- Native spawn() for subprocess management

### Why grammY?
- Modern Telegram bot framework
- Type-safe API
- Excellent inline keyboard support

### Why Supabase?
- Postgres with vector embeddings
- Easy semantic search
- Free tier is generous

### Why Claude Code CLI?
- Uses your Max subscription
- No OAuth harness needed
- Full tool access
- MCP servers work automatically
- Session continuity with --resume

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT
