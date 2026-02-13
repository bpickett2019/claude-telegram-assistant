# OpenClaw Parity Implementation Plan

**Goal:** Make Siempre functionally equivalent to OpenClaw for single-user Telegram automation

---

## Phase 1: Skills System (CRITICAL - Core OpenClaw Feature)

### 1.1 Create Bundled Skills Directory Structure
```bash
skills/
├── github/
│   └── SKILL.md
├── browser/
│   └── SKILL.md
├── notion/
│   └── SKILL.md
├── obsidian/
│   └── SKILL.md
├── slack/
│   └── SKILL.md
└── ...
```

### 1.2 Implement Skill Auto-Discovery
- [ ] `SkillsManager.discoverSkills()` - Find available skills in workspace
- [ ] Parse YAML frontmatter with metadata (emoji, requires, install)
- [ ] Validate required binaries on system
- [ ] Auto-inject skill instructions into prompts when relevant

### 1.3 Create Essential Bundled Skills
**Priority 1 (Must-Have):**
- [ ] `github` - gh CLI integration for repos, PRs, issues
- [ ] `browser` - Playwright/Puppeteer for web automation
- [ ] `notion` - Notion API integration
- [ ] `obsidian` - Vault management and note creation
- [ ] `weather` - Current weather and forecasts
- [ ] `coding-agent` - Enhanced code generation workflows

**Priority 2 (High Value):**
- [ ] `slack` - Slack webhook and API integration
- [ ] `discord` - Discord bot/webhook integration
- [ ] `email` - Gmail/SMTP for sending emails
- [ ] `calendar` - Google Calendar integration
- [ ] `spotify` - Music control
- [ ] `screenshot` - Capture screen/windows

**Priority 3 (Nice to Have):**
- [ ] `apple-notes` - Notes.app integration (macOS)
- [ ] `trello` - Board and card management
- [ ] `1password` - Secure credential retrieval
- [ ] `openai-image` - DALL-E image generation
- [ ] `summarize` - Long-form content summarization

### 1.4 Skill Installation System
- [ ] `/install <skill>` command
- [ ] Detect missing dependencies (gh, playwright, etc.)
- [ ] Guide user through installation steps
- [ ] Enable/disable skills per user preference

---

## Phase 2: Browser Automation (HIGH IMPACT)

### 2.1 Browser Control Skill
- [ ] Install Playwright as dependency
- [ ] Create `skills/browser/SKILL.md` with instructions
- [ ] Support for:
  - [ ] Navigate to URL
  - [ ] Click elements (CSS selector)
  - [ ] Fill forms
  - [ ] Take screenshots
  - [ ] Extract page content
  - [ ] Wait for elements
  - [ ] Run JavaScript

### 2.2 Browser Skill Capabilities
```yaml
name: browser
description: "Control Chrome/Chromium for web automation"
metadata:
  openclaw:
    emoji: "🌐"
    requires: { bins: ["playwright"] }
```

**Example usage from Telegram:**
> "Go to github.com, search for 'claude-code', and screenshot the first result"

---

## Phase 3: Enhanced Session Management

### 3.1 Multiple Session Support
- [ ] Track separate sessions per conversation thread
- [ ] Session history (`/sessions` command)
- [ ] Session switching (`/session <id>`)
- [ ] Per-session memory isolation

### 3.2 Session-to-Session Communication
- [ ] `sessions_list()` tool - List active sessions
- [ ] `sessions_send(session_id, message)` - Inter-session messaging
- [ ] `sessions_history(session_id)` - Fetch another session's transcript

**OpenClaw pattern:**
```typescript
// Agent A can message Agent B
await sessions_send('session-123', 'Check the GitHub PR status', { announce: true });
```

---

## Phase 4: Advanced Automation

### 4.1 Webhook Support
- [ ] Expose webhook endpoint: `/webhook/<id>`
- [ ] Trigger Siempre from external services
- [ ] Gmail Pub/Sub integration
- [ ] GitHub webhook handlers
- [ ] Custom webhook skills

**Example:**
```yaml
# GitHub webhook triggers Siempre when PR is opened
POST /webhook/github
→ Siempre analyzes PR and comments on Telegram
```

### 4.2 Enhanced Cron System
- [ ] User-defined cron jobs via `/cron add`
- [ ] Cron job listing and management
- [ ] Per-job skill execution
- [ ] Failure notifications

---

## Phase 5: Voice & Speech

### 5.1 Voice Wake Support (Optional)
- [ ] Wake word detection ("Hey Siempre")
- [ ] Continuous listening mode
- [ ] Voice-to-text with Groq Whisper
- [ ] Text-to-speech responses (ElevenLabs)

### 5.2 Voice Input Improvements
- [ ] Better transcription accuracy
- [ ] Support for multiple languages
- [ ] Voice command parsing
- [ ] Fallback to text on low confidence

---

## Phase 6: Canvas & Visual Workspace (ADVANCED)

### 6.1 Live Canvas Concept
OpenClaw has "A2UI host" - agent-driven visual workspace

**Adaptation for Telegram:**
- [ ] Send interactive HTML files via Telegram
- [ ] Markdown-based "canvas" for structured output
- [ ] Image generation for visual responses
- [ ] Diagram generation (Mermaid, etc.)

---

## Phase 7: Security & Permissions

### 7.1 Tool Allowlisting
- [ ] Per-skill permission requirements
- [ ] User-configurable tool restrictions
- [ ] Dangerous operation confirmations (even in bypass mode)

### 7.2 Credential Management
- [ ] Secure API key storage in .env
- [ ] Skills can request credentials
- [ ] Integration with 1Password/system keychain

---

## Phase 8: Multi-Platform Expansion (FUTURE)

**OpenClaw supports:**
- WhatsApp, Slack, Discord, Signal, iMessage, Teams, Matrix, Zalo

**Siempre could add:**
- [ ] Slack bot mode
- [ ] Discord bot mode
- [ ] WhatsApp via Baileys
- [ ] Signal via signal-cli
- [ ] iMessage via BlueBubbles

**Architecture:**
```typescript
// Multi-platform relay pattern
interface MessagePlatform {
  send(message: string): Promise<void>;
  receive(): Promise<Message>;
}

class TelegramPlatform implements MessagePlatform { ... }
class SlackPlatform implements MessagePlatform { ... }
class DiscordPlatform implements MessagePlatform { ... }
```

---

## Implementation Priority Ranking

### 🔴 **CRITICAL (Do First)**
1. **Skills System** - Core differentiator
2. **Bundled Skills** - github, browser, notion, obsidian
3. **Browser Automation** - Massive capability expansion

### 🟡 **HIGH VALUE (Do Next)**
4. **Webhook Support** - External trigger automation
5. **Enhanced Cron** - User-defined jobs
6. **Session Communication** - Multi-agent coordination

### 🟢 **NICE TO HAVE (Do Later)**
7. **Voice Wake** - Convenience feature
8. **Canvas System** - Visual enhancement
9. **Multi-Platform** - Reach expansion

---

## Estimated Effort

| Component | Complexity | Time Estimate |
|-----------|-----------|---------------|
| Skills System Core | Medium | 8 hours |
| 6 Bundled Skills | Medium | 12 hours |
| Browser Automation | High | 16 hours |
| Webhook System | Medium | 8 hours |
| Session Communication | Medium | 6 hours |
| Voice Wake | High | 20 hours |
| Multi-Platform | Very High | 40+ hours |
| **TOTAL (Phases 1-3)** | | **~50 hours** |

---

## Skills We Should Create First

### 1. GitHub Skill (`skills/github/SKILL.md`)
```yaml
name: github
description: "Interact with GitHub repos, PRs, issues via gh CLI"
metadata:
  openclaw:
    emoji: "🐙"
    requires: { bins: ["gh"] }
```

**Capabilities:**
- Create/list/view PRs
- Create/close/comment on issues
- Clone repos
- View commit history
- Manage workflow runs

### 2. Browser Skill (`skills/browser/SKILL.md`)
```yaml
name: browser
description: "Automate web browsing with Playwright"
metadata:
  openclaw:
    emoji: "🌐"
    requires: { bins: ["playwright"] }
```

**Capabilities:**
- Navigate to URLs
- Click/type/select elements
- Screenshot pages
- Extract content
- Fill forms
- Run JavaScript

### 3. Notion Skill (`skills/notion/SKILL.md`)
```yaml
name: notion
description: "Manage Notion pages and databases"
metadata:
  openclaw:
    emoji: "📓"
    requires: { bins: ["notion-cli"] }
```

**Capabilities:**
- Create pages
- Update databases
- Query databases
- Search workspace
- Create tasks

### 4. Obsidian Skill (`skills/obsidian/SKILL.md`)
```yaml
name: obsidian
description: "Manage Obsidian vault notes"
metadata:
  openclaw:
    emoji: "🗒️"
    requires: { bins: [] }
```

**Capabilities:**
- Create notes
- Search vault
- Link notes
- Tag management
- Daily note creation

### 5. Weather Skill (`skills/weather/SKILL.md`)
```yaml
name: weather
description: "Get weather forecasts"
metadata:
  openclaw:
    emoji: "🌤️"
    requires: { bins: ["curl"] }
```

**Capabilities:**
- Current conditions
- 7-day forecast
- Severe alerts
- Location-based

### 6. Email Skill (`skills/email/SKILL.md`)
```yaml
name: email
description: "Send emails via SMTP"
metadata:
  openclaw:
    emoji: "📧"
    requires: { bins: [] }
```

**Capabilities:**
- Send emails
- Read inbox (via IMAP)
- Search emails
- Manage drafts

---

## What This Achieves

**With these features, Siempre will be:**
- ✅ **Skill-driven** like OpenClaw (modular capabilities)
- ✅ **Browser-capable** (web automation)
- ✅ **Multi-session** (agent coordination)
- ✅ **Webhook-enabled** (external triggers)
- ✅ **Fully autonomous** (bypass mode everywhere)
- ✅ **Self-modifying** (can improve itself)

**Functional parity with OpenClaw for:**
- GitHub automation
- Web scraping/automation
- Note management (Notion, Obsidian)
- Communication (Slack, Discord via webhooks)
- Task automation
- Proactive behavior

---

## Next Steps

**Option 1: Start with Skills (Recommended)**
1. Create `skills/github/SKILL.md` first
2. Test GitHub skill integration
3. Add browser skill
4. Expand to Notion, Obsidian, etc.

**Option 2: Start with Browser (High Impact)**
1. Add Playwright dependency
2. Create browser skill
3. Test web automation
4. Build skills on top of browser capability

**Which should we prioritize?**
