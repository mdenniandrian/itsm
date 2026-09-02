#!/usr/bin/env bash
# ==============================================================================
# ITSM ENTERPRISE - UNINSTALL ENDPOINT MONITORING AGENT
# ==============================================================================

set -e

echo "🛑 Menghentikan dan menghapus ITSM Endpoint Agent..."

# 1. Stop macOS LaunchAgent
if [ "$(uname)" = "Darwin" ]; then
    PLIST_PATH="$HOME/Library/LaunchAgents/com.itsm.enterprise.agent.plist"
    if [ -f "$PLIST_PATH" ]; then
        launchctl unload -w "$PLIST_PATH" 2>/dev/null || true
        rm -f "$PLIST_PATH"
        echo "✓ Service LaunchAgent macOS dihapus."
    fi
fi

# 2. Stop Linux Systemd Service
if [ "$(uname)" = "Linux" ]; then
    if command -v systemctl &>/dev/null; then
        systemctl --user stop itsm-agent.service 2>/dev/null || true
        systemctl --user disable itsm-agent.service 2>/dev/null || true
        rm -f "$HOME/.config/systemd/user/itsm-agent.service"
        systemctl --user daemon-reload 2>/dev/null || true
        echo "✓ Service Systemd Linux dihapus."
    fi
fi

# 3. Terminate running process
pkill -f "itsm-agent" 2>/dev/null || true
pkill -f "itsm-agent.py" 2>/dev/null || true

# 4. Remove agent files & saved tokens
rm -rf "$HOME/.itsm-agent"
rm -f "$HOME/.itsm_device_token.json"

echo "✅ ITSM Endpoint Agent berhasil di-uninstall dan dimatikan secara permanen dari komputer ini."
