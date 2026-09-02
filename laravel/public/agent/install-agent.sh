#!/bin/bash
# ==============================================================================
# ITSM ENDPOINT AGENT AUTO-INSTALLER & DAEMON SERVICE REGISTER (macOS & Linux)
# ==============================================================================
# - Automatically installs agent as dedicated 'itsm-agent' binary
# - Registers permanent background daemon service (LaunchAgent on macOS / Systemd on Linux)
# - Guarantees AUTO-START on system reboot / user login & AUTO-RESTART if killed
# - Displays as 'itsm-agent' in OS Activity Monitor / Process List (NOT generic python)
# ==============================================================================

set -e

SERVER_URL="${1:-${ITSM_SERVER_URL:-http://localhost:8000}}"
SERVER_URL="${SERVER_URL%/}"
AGENT_DIR="$HOME/.itsm-agent"
OS_TYPE="$(uname -s)"
PYTHON_BIN="$(command -v python3 || echo "/usr/bin/python3")"

echo "=================================================================="
echo "🎯 Menginstall & Mendaftarkan ITSM Endpoint Background Service"
echo "💻 Platform Detected: $OS_TYPE"
echo "🌐 Target Server: $SERVER_URL"
echo "⚙️ Service Name: itsm-agent"
echo "=================================================================="

mkdir -p "$AGENT_DIR/bin"

# 1. Download or Copy the agent script
echo "📥 Mengunduh script agent..."
if [ -f "$(dirname "$0")/itsm-agent.py" ]; then
    cp "$(dirname "$0")/itsm-agent.py" "$AGENT_DIR/itsm-agent.py"
elif command -v curl >/dev/null 2>&1; then
    curl -sSL "$SERVER_URL/agent/itsm-agent.py" -o "$AGENT_DIR/itsm-agent.py"
elif command -v wget >/dev/null 2>&1; then
    wget -q "$SERVER_URL/agent/itsm-agent.py" -O "$AGENT_DIR/itsm-agent.py"
else
    echo "❌ Error: Gagal mengunduh itsm-agent.py dari $SERVER_URL"
    exit 1
fi

# Create dedicated itsm-agent executable & binary launcher so it displays as 'itsm-agent' in Activity Monitor
cp "$AGENT_DIR/itsm-agent.py" "$AGENT_DIR/itsm-agent"
chmod +x "$AGENT_DIR/itsm-agent.py" "$AGENT_DIR/itsm-agent"
ln -sf "$PYTHON_BIN" "$AGENT_DIR/bin/itsm-agent"

echo "✅ File agent terpasang sebagai executable 'itsm-agent'"

# Save persistent configuration
cat <<EOF > "$AGENT_DIR/config.json"
{
  "service_name": "itsm-agent",
  "server_url": "$SERVER_URL",
  "python_bin": "$PYTHON_BIN",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Stop previous process if any
pkill -f "itsm-agent" 2>/dev/null || true

# 2. Register Permanent OS Background Service (Auto-start on boot & restart)
if [ "$OS_TYPE" = "Darwin" ]; then
    echo "🍎 Mendaftarkan macOS LaunchAgent Service (Auto-Start saat Login/Reboot)..."
    LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$LAUNCH_AGENTS_DIR/com.itsm.enterprise.agent.plist"
    OLD_PLIST="$LAUNCH_AGENTS_DIR/com.itsm.agent.plist"
    mkdir -p "$LAUNCH_AGENTS_DIR"

    # Unload older plists if loaded
    launchctl unload "$OLD_PLIST" 2>/dev/null || true
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    rm -f "$OLD_PLIST" 2>/dev/null || true

    # Generate LaunchAgent Plist with 'itsm-agent' binary
    cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.itsm.enterprise.agent</string>
    <key>ProcessType</key>
    <string>Background</string>
    <key>ProgramArguments</key>
    <array>
        <string>$AGENT_DIR/bin/itsm-agent</string>
        <string>$AGENT_DIR/itsm-agent</string>
        <string>$SERVER_URL</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>NetworkState</key>
        <true/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>$AGENT_DIR/agent.log</string>
    <key>StandardErrorPath</key>
    <string>$AGENT_DIR/agent.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>ITSM_SERVER_URL</key>
        <string>$SERVER_URL</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH</string>
    </dict>
</dict>
</plist>
EOF

    # Load and activate LaunchAgent
    launchctl load -w "$PLIST_FILE"
    echo "✅ macOS LaunchAgent berhasil dimuat: $PLIST_FILE"
    echo "🚀 Service 'itsm-agent' sekarang BERJALAN di Activity Monitor dan otomatis start setiap Mac reboot/login!"

elif [ "$OS_TYPE" = "Linux" ]; then
    echo "🐧 Mendaftarkan Linux Systemd User Service..."
    SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="$SYSTEMD_USER_DIR/itsm-agent.service"
    
    if command -v systemctl >/dev/null 2>&1; then
        mkdir -p "$SYSTEMD_USER_DIR"
        cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=ITSM Enterprise Endpoint Background Agent
After=network.target

[Service]
Type=simple
ExecStart=$AGENT_DIR/bin/itsm-agent $AGENT_DIR/itsm-agent $SERVER_URL
Restart=always
RestartSec=5
SyslogIdentifier=itsm-agent
StandardOutput=append:$AGENT_DIR/agent.log
StandardError=append:$AGENT_DIR/agent.log
Environment="ITSM_SERVER_URL=$SERVER_URL"

[Install]
WantedBy=default.target
EOF

        systemctl --user daemon-reload
        systemctl --user enable --now itsm-agent.service
        echo "✅ Systemd service berhasil diaktifkan: $SERVICE_FILE"
        echo "🚀 Service 'itsm-agent' otomatis start setiap Linux dinyalakan/login!"
    else
        echo "⚠️ Systemd tidak terdeteksi. Mendaftarkan crontab @reboot..."
        (crontab -l 2>/dev/null | grep -v "itsm-agent" ; echo "@reboot $AGENT_DIR/bin/itsm-agent $AGENT_DIR/itsm-agent $SERVER_URL > $AGENT_DIR/agent.log 2>&1 &") | crontab -
        export ITSM_SERVER_URL="$SERVER_URL"
        nohup "$AGENT_DIR/bin/itsm-agent" "$AGENT_DIR/itsm-agent" "$SERVER_URL" > "$AGENT_DIR/agent.log" 2>&1 &
        echo "✅ Crontab auto-start ditambahkan."
    fi
else
    # Generic Unix fallback
    export ITSM_SERVER_URL="$SERVER_URL"
    nohup "$AGENT_DIR/bin/itsm-agent" "$AGENT_DIR/itsm-agent" "$SERVER_URL" > "$AGENT_DIR/agent.log" 2>&1 &
fi

echo ""
echo "=================================================================="
echo "🎉 INSTALASI SELESAI!"
echo "📋 Service Name: itsm-agent (muncul sebagai 'itsm-agent' di Activity Monitor/Task Manager)"
echo "📋 File Log: $AGENT_DIR/agent.log"
echo "🌐 Perangkat Anda sekarang terdaftar dan aktif di Portal ITSM!"
echo "🔄 Saat komputer Anda di-restart, agent akan OTOMATIS BERJALAN kembali."
echo "=================================================================="
