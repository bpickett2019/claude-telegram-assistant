# OpenClaw Missing Features - Complete Analysis

This document details ALL features from OpenClaw that Siempre doesn't have yet, organized by priority.

---

## 🔴 CRITICAL - Core Architecture Missing

### 1. **Command System** (Essential for UX)
OpenClaw has rich in-chat commands:

```bash
# Session control
/status          # Show session info, token usage
/think high|med  # Set thinking depth
/verbose on|off  # Toggle verbose mode
/usage          # Show token/cost stats
/restart        # Restart current session
/compact        # Compact/compress context

# Group chat specific
/activation mention|always  # When bot responds

# Skills
/skills list    # List available skills
/skills info github  # Skill details
```

**Current Siempre commands:**
- `/start`, `/help`, `/ping`
- `/new`, `/model`, `/mode`
- `/status`, `/reset`

**Missing:**
- ❌ `/think` - Thinking depth control
- ❌ `/verbose` - Verbose mode toggle
- ❌ `/usage` - Token usage tracking
- ❌ `/compact` - Context compression
- ❌ `/activation` - Group activation modes
- ❌ `/skills` - Skill management
- ❌ `/elevated` - Elevated bash toggle

### 2. **openclaw.json Configuration** (vs .env)
OpenClaw uses structured JSON config:

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-6",
    "workspace": "~/.openclaw/workspace",
    "sandbox": { "mode": "non-main" }
  },
  "gateway": {
    "bind": "127.0.0.1",
    "port": 18789,
    "auth": { "mode": "disabled" }
  },
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "allowlist": ["@user1"]
    }
  }
}
```

**Benefits over .env:**
- Nested configuration
- Per-channel settings
- Easier to manage complex setups
- Type validation
- Comments support

### 3. **ClawHub Skill Registry**
OpenClaw has automatic skill discovery:

```typescript
// Agent can search and install skills on-demand
agent: "I need GitHub integration"
→ Searches ClawHub
→ Finds 'github' skill
→ Auto-installs dependencies (gh CLI)
→ Loads skill instructions
→ Ready to use
```

**Siempre currently:**
- ✅ Loads bundled skills at startup
- ❌ No skill search/discovery
- ❌ No auto-installation
- ❌ No dependency checking
- ❌ Skills must be pre-installed

### 4. **Session-to-Session Communication**
OpenClaw agents can talk to each other:

```typescript
// Agent A can message Agent B
await sessions_send('session-123', 'Check GitHub PR status', {
  announce: true,  // Notify user
  reply: false     // Don't wait for response
});

// List all sessions
const sessions = await sessions_list();

// Get another session's history
const history = await sessions_history('session-456');
```

**This enables:**
- Multi-agent collaboration
- Delegating tasks to specialized agents
- Coordinated workflows
- Background processing

### 5. **Gateway WebSocket Architecture**
OpenClaw has a central control plane:

```
┌─────────────────────────────────────┐
│  Gateway (ws://127.0.0.1:18789)     │
│  ├─ Session Manager                 │
│  ├─ Channel Router (WhatsApp,       │
│  │                   Telegram, etc)  │
│  ├─ Tool Executor                   │
│  ├─ Webhook Handler                 │
│  └─ Cron Scheduler                  │
└─────────────────────────────────────┘
          │
          ├─→ Telegram
          ├─→ WhatsApp
          ├─→ Slack
          ├─→ Discord
          └─→ Local CLI
```

**Benefits:**
- Single control point
- Multi-platform from one instance
- Remote access via Tailscale
- Built-in web UI
- Centralized state management

---

## 🟡 HIGH VALUE - User Experience

### 6. **DM Pairing System** (Security)
OpenClaw protects against unauthorized access:

```typescript
// New user DMs bot
→ Bot sends pairing code: "ABC123"
→ User must approve via CLI: openclaw pairing approve telegram ABC123
→ Bot now responds to that user

// Or set open policy (dangerous)
"dmPolicy": "open" + allowlist: ["*"]
```

**Siempre currently:**
- Uses TELEGRAM_USER_ID whitelist
- All-or-nothing access
- No pairing flow

### 7. **Activation Modes** (Group Chats)
OpenClaw has smart group behavior:

```bash
# Mention-only mode
/activation mention
→ Bot only responds to @mentions

# Always-on mode
/activation always
→ Bot processes every message (can be noisy)
```

**Siempre currently:**
- Not designed for groups
- No activation modes
- Single-user focused

### 8. **Token Usage Tracking**
OpenClaw tracks costs:

```bash
/usage
→ Session tokens: 45,234
→ Cost: $0.23
→ Input: 38,890 tokens ($0.19)
→ Output: 6,344 tokens ($0.04)
```

**Benefits:**
- Cost awareness
- Usage optimization
- Budget tracking
- Per-session breakdown

### 9. **Thinking Depth Control**
OpenClaw lets you tune reasoning:

```bash
/think high   # Deep reasoning (slower, smarter)
/think medium # Balanced
/think low    # Quick responses (faster, cheaper)
```

**Maps to:**
- Extended thinking mode
- Tool use frequency
- Response thoroughness

### 10. **Verbose Mode Toggle**
```bash
/verbose on   # Show thinking, tool use details
/verbose off  # Clean responses only
```

Shows:
- Tool invocations
- Reasoning process
- Debug information

---

## 🟢 ADVANCED - Power Features

### 11. **A2UI Canvas System**
Agent-driven visual workspace:

```typescript
// Agent creates interactive UI
await canvas.push({
  type: 'dashboard',
  components: [
    { type: 'chart', data: [...] },
    { type: 'form', fields: [...] }
  ]
});

// User interacts, agent updates
await canvas.eval('updateChart(newData)');

// Take snapshot
await canvas.snapshot('dashboard.png');
```

**Use cases:**
- Data visualization
- Interactive forms
- Real-time dashboards
- Visual debugging

### 12. **Voice Wake + Talk Mode**
Continuous voice interaction:

```typescript
// Wake word detection
"Hey OpenClaw, what's the weather?"
→ Bot activates, responds

// Talk mode (push-to-talk)
→ Continuous listening
→ Transcribe with Whisper
→ Respond with ElevenLabs TTS
→ Hands-free interaction
```

**Platforms:**
- macOS menu bar app
- iOS companion app
- Android app

### 13. **Node System** (Distributed Execution)
Actions run on specific devices:

```typescript
// Run command on host
await system.run('git status');

// Take photo on iPhone
await node.invoke('iphone', 'camera.snap', { front: true });

// Screenshot on iPad
await node.invoke('ipad', 'screen.capture', { fullscreen: true });

// Get location from Android
await node.invoke('phone', 'location.get');
```

**Device pairing:**
```bash
openclaw node pair --device iphone
→ QR code shown
→ Scan with companion app
→ Device connected to Gateway
```

### 14. **Tailscale Integration**
Remote access to Gateway:

```typescript
// Serve on tailnet
"gateway.tailscale.mode": "serve"
→ Access from anywhere on your tailnet
→ No public exposure

// Public funnel
"gateway.tailscale.mode": "funnel"
→ Public webhook endpoint
→ Share with external services
```

### 15. **Built-in Control UI**
Web interface for management:

```bash
# Gateway serves UI at http://localhost:18789
→ Session browser
→ Token usage charts
→ Skill management
→ Configuration editor
→ Live logs
```

### 16. **Multi-Agent Routing**
Different agents per channel:

```json
{
  "channels": {
    "telegram": { "workspace": "~/.openclaw/personal" },
    "slack": { "workspace": "~/.openclaw/work" },
    "discord": { "workspace": "~/.openclaw/gaming" }
  }
}
```

**Each workspace has:**
- Separate SOUL.md (personality)
- Separate skills
- Separate memory
- Isolated sessions

---

## 🔵 INFRASTRUCTURE - Platform Features

### 17. **Webhook System**
Inbound triggers:

```json
// Receive webhooks
POST /webhook/github
→ Triggers agent
→ Agent processes payload
→ Sends result to Telegram

// GitHub PR webhook
→ New PR opened
→ Agent reviews code
→ Comments on PR
→ Notifies you on Telegram
```

**OpenClaw webhooks:**
- GitHub events
- Gmail Pub/Sub
- Custom webhooks
- Cron triggers

### 18. **Enhanced Cron System**
User-defined automation:

```bash
# Add cron job
openclaw cron add "0 9 * * *" "Check emails and summarize"

# List jobs
openclaw cron list

# Remove job
openclaw cron remove job-123
```

**OpenClaw features:**
- Cron expression parsing
- Job persistence
- Failure notifications
- Manual trigger
- Webhook integration

### 19. **Doctor Command**
System diagnostics:

```bash
openclaw doctor
→ ✓ Configuration valid
→ ✓ Gateway reachable
→ ✓ Agent model accessible
→ ⚠ Missing screen recording permission
→ ✗ gh CLI not installed
→ Suggestions: brew install gh
```

**Checks:**
- Config file validity
- Required binaries
- Permissions (macOS TCC)
- Network connectivity
- Skill dependencies

### 20. **Development Channels**
Release management:

```bash
# Switch to beta
openclaw update --channel beta

# Switch to dev (bleeding edge)
openclaw update --channel dev

# Back to stable
openclaw update --channel stable
```

**Channels:**
- `stable` - Tagged releases
- `beta` - Prerelease testing
- `dev` - Latest main branch

### 21. **Permission Gating** (macOS TCC)
Fine-grained security:

```typescript
// Check if permission granted
const hasCamera = await node.hasPermission('camera');

// Request permission
await node.requestPermission('screen-recording');

// Tool execution gated by permissions
await system.run('screencapture', {
  needsScreenRecording: true  // Enforces TCC check
});
```

**Permissions tracked:**
- Camera access
- Screen recording
- Location services
- Notifications
- Accessibility

### 22. **Elevated Bash Toggle**
Separate from TCC:

```bash
/elevated on   # Allow dangerous commands
→ rm -rf allowed
→ sudo commands allowed
→ Destructive operations enabled

/elevated off  # Safe mode (default)
→ Dangerous commands blocked
```

**Safety:**
- Per-session setting
- Requires explicit enable
- User must confirm
- Automatically logs

### 23. **Presence Indicators**
Real-time feedback:

```typescript
// Show typing indicator
→ User sees "..." while agent thinks

// Show "recording" in voice
→ User sees 🎤 while transcribing

// Custom presence
→ "Searching GitHub..."
→ "Running tests..."
```

**Platforms:**
- Telegram (typing)
- WhatsApp (typing)
- Slack (typing, presence)
- iMessage (typing bubbles)

### 24. **Rate Limiting & Quotas**
Resource management:

```json
{
  "rateLimit": {
    "messagesPerMinute": 10,
    "tokensPerDay": 1000000,
    "costPerDay": 5.00
  }
}
```

**Enforces:**
- Message rate limits
- Token budgets
- Cost caps
- Per-user quotas

---

## 📊 Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| **Command System** | Very High | Low | 🔴 P0 |
| **ClawHub Registry** | Very High | Medium | 🔴 P0 |
| **Session Communication** | High | Medium | 🟡 P1 |
| **Token Usage Tracking** | High | Low | 🟡 P1 |
| **Thinking Depth** | High | Low | 🟡 P1 |
| **Webhook System** | High | Medium | 🟡 P1 |
| **DM Pairing** | Medium | Medium | 🟢 P2 |
| **Gateway Architecture** | Very High | Very High | 🟢 P2 |
| **A2UI Canvas** | Medium | Very High | 🟢 P3 |
| **Voice Wake** | Medium | High | 🟢 P3 |
| **Node System** | Low | Very High | 🔵 P4 |
| **Tailscale** | Low | High | 🔵 P4 |

---

## 🎯 Recommended Implementation Order

### **Phase 1: Essential UX** (8-12 hours)
1. ✅ Command system (`/think`, `/usage`, `/verbose`, `/skills`)
2. ✅ Token usage tracking
3. ✅ Thinking depth control
4. ✅ openclaw.json config file

### **Phase 2: Skill Ecosystem** (12-16 hours)
1. ✅ ClawHub-style skill registry
2. ✅ Skill search/discovery
3. ✅ Dependency checking
4. ✅ Auto-installation prompts
5. ✅ 10+ more bundled skills

### **Phase 3: Multi-Agent** (16-24 hours)
1. ✅ Session-to-session tools
2. ✅ Agent coordination
3. ✅ Task delegation
4. ✅ Shared memory

### **Phase 4: Automation** (8-12 hours)
1. ✅ Webhook endpoints
2. ✅ Enhanced cron system
3. ✅ GitHub webhook handlers
4. ✅ Custom automation triggers

### **Phase 5: Advanced** (40+ hours)
1. ✅ Gateway WebSocket architecture
2. ✅ A2UI Canvas system
3. ✅ Voice wake integration
4. ✅ Multi-platform expansion

---

## 💡 Quick Wins (Can Implement Today)

### 1. **Add Missing Commands** (2 hours)
```typescript
// src/handlers/commands.ts
export async function handleThink(ctx: Context) {
  const level = ctx.message.text.split(' ')[1];
  await session.setThinkingLevel(level);
  await ctx.reply(`Thinking level set to: ${level}`);
}

export async function handleUsage(ctx: Context) {
  const usage = await session.getTokenUsage();
  await ctx.reply(
    `📊 Token Usage:\n` +
    `Input: ${usage.input} tokens\n` +
    `Output: ${usage.output} tokens\n` +
    `Cost: $${usage.cost}`
  );
}
```

### 2. **Track Token Usage** (3 hours)
```typescript
// src/claude/session.ts
interface TokenUsage {
  input: number;
  output: number;
  cost: number;
  timestamp: Date;
}

// Track after each spawn
await this.session.recordUsage({
  input: response.tokensIn,
  output: response.tokensOut,
  cost: calculateCost(response.model, response.tokensIn, response.tokensOut)
});
```

### 3. **Skill Discovery Commands** (4 hours)
```typescript
// /skills list
const skills = await skillsManager.listAvailable();
await ctx.reply(
  `📚 Available Skills:\n` +
  skills.map(s => `${s.emoji} ${s.name} - ${s.description}`).join('\n')
);

// /skills info github
const skill = await skillsManager.getSkill('github');
await ctx.reply(
  `🐙 GitHub Skill\n\n` +
  `${skill.description}\n\n` +
  `Required: ${skill.requires.bins.join(', ')}`
);
```

### 4. **Convert .env to openclaw.json** (1 hour)
```json
{
  "agent": {
    "model": "opus",
    "workspace": "~/.claude-assistant/workspace",
    "permissionMode": "bypass"
  },
  "telegram": {
    "botToken": "...",
    "dmPolicy": "whitelist",
    "allowlist": ["user_id"]
  },
  "supabase": {
    "url": "...",
    "anonKey": "..."
  },
  "proactive": {
    "enabled": true,
    "checkinInterval": 30,
    "briefingTime": "09:00"
  }
}
```

---

## 🎯 What This Achieves

**After implementing these features, Siempre will be:**

**95%+ functionally equivalent to OpenClaw** for:
- ✅ Single-user Telegram automation
- ✅ Skill-based capabilities
- ✅ Autonomous operation
- ✅ Self-modification
- ✅ Multi-agent coordination
- ✅ Webhook automation
- ✅ Rich command system
- ✅ Usage tracking & cost control

**Still missing (by design):**
- Multi-platform (OpenClaw has 10+ platforms)
- Gateway architecture (overkill for single-user)
- Voice wake (convenience feature)
- Node system (no multi-device need)
- Tailscale (no remote access need)

---

**Ready to implement? Which phase should we start with?**
