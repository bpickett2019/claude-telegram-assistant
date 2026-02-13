#!/bin/bash
# Setup script for launchd (macOS)

set -e

echo "🤖 Claude Telegram Assistant - launchd Setup"
echo "=============================================="
echo

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    echo "For Linux, use setup-systemd.sh"
    exit 1
fi

# Get project directory
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
echo "Project directory: $PROJECT_DIR"
echo

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Install it: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

BUN_PATH=$(which bun)
echo "✓ Bun found at: $BUN_PATH"

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code CLI is not installed"
    echo "Visit: https://claude.ai/claude-code"
    exit 1
fi

echo "✓ Claude Code CLI found"

# Check if .env exists
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    echo "❌ .env file not found"
    echo "Copy .env.example to .env and configure it first"
    exit 1
fi

echo "✓ .env file found"
echo

# Create LaunchAgent
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.claude.telegram-assistant.plist"

mkdir -p "$PLIST_DIR"

echo "Creating launchd plist..."

cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.telegram-assistant</string>

    <key>ProgramArguments</key>
    <array>
        <string>$BUN_PATH</string>
        <string>start</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>$HOME/.claude-assistant/logs/stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$HOME/.claude-assistant/logs/stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:$HOME/.bun/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "✓ plist created: $PLIST_FILE"

# Create logs directory
mkdir -p "$HOME/.claude-assistant/logs"

echo "✓ Logs directory created"
echo

# Load the LaunchAgent
echo "Loading LaunchAgent..."
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"

echo
echo "✅ Setup complete!"
echo
echo "To manage the service:"
echo "  Start:   launchctl start com.claude.telegram-assistant"
echo "  Stop:    launchctl stop com.claude.telegram-assistant"
echo "  Restart: launchctl stop com.claude.telegram-assistant && launchctl start com.claude.telegram-assistant"
echo "  Status:  launchctl list | grep claude"
echo "  Logs:    tail -f ~/.claude-assistant/logs/stdout.log"
echo
echo "The service will:"
echo "  • Start automatically on login"
echo "  • Restart automatically if it crashes"
echo "  • Log to ~/.claude-assistant/logs/"
echo
echo "✓ Service is now running!"
echo "Check logs: tail -f ~/.claude-assistant/logs/stdout.log"
