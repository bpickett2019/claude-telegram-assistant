# TOOLS.md - Local Environment Notes

This file contains environment-specific information unique to this setup.

Skills define **how** tools work. This file is for **your** specifics.

## What Goes Here

- SSH hosts and aliases
- API keys location (not the keys themselves!)
- Device names and identifiers
- Preferred settings
- Environment quirks
- Anything setup-specific

## Examples

### SSH Hosts
```
- home-server → 192.168.1.100, user: admin
- vps → ssh key at ~/.ssh/vps_key
```

### Voice Preferences
```
- Provider: Groq Whisper
- Fallback: Local whisper-cpp
```

### Project Locations
```
- Main projects: ~/projects
- Experiments: ~/sandbox
```

### MCP Servers (if configured)
```
- Neon (Postgres) - configured in ~/.claude/settings.json
- Memory MCP - for claude-mem integration
```

## Why Separate?

Skills are portable and shared. Your environment is unique to you.

Keeping them separate means:
- Skills can be updated without losing local notes
- Environment-specific info stays private
- Skills can be shared without exposing infrastructure

---

**Add whatever helps you work effectively. This is your cheat sheet.**
