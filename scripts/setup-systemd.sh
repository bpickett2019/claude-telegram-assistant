#!/bin/bash
# Setup script for systemd service (Linux)

set -e

echo "🤖 Claude Telegram Assistant - systemd Setup"
echo "=============================================="
echo

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is for Linux systems only"
    echo "For macOS, use setup-launchd.sh"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Don't run this script as root. It will use sudo when needed."
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

# Create service file
SERVICE_FILE="/etc/systemd/system/claude-assistant.service"

echo "Creating systemd service file..."
echo "This will require sudo password."
echo

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Claude Telegram Assistant
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$BUN_PATH start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.bun/bin"

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Service file created: $SERVICE_FILE"
echo

# Reload systemd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable service
echo "Enabling service..."
sudo systemctl enable claude-assistant.service

echo
echo "✅ Setup complete!"
echo
echo "To manage the service:"
echo "  Start:   sudo systemctl start claude-assistant"
echo "  Stop:    sudo systemctl stop claude-assistant"
echo "  Restart: sudo systemctl restart claude-assistant"
echo "  Status:  sudo systemctl status claude-assistant"
echo "  Logs:    sudo journalctl -u claude-assistant -f"
echo
echo "Start the service now? (y/n)"
read -r response

if [[ "$response" == "y" ]]; then
    echo "Starting service..."
    sudo systemctl start claude-assistant
    echo
    echo "Checking status..."
    sleep 2
    sudo systemctl status claude-assistant --no-pager
    echo
    echo "✓ Service started!"
    echo "View logs: sudo journalctl -u claude-assistant -f"
else
    echo "Service not started. Start it manually when ready:"
    echo "  sudo systemctl start claude-assistant"
fi
