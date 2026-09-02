#!/usr/bin/env python3
"""
ITSM Endpoint Monitoring, Activity Tracking & Screen Preview Agent
===================================================================
A lightweight background daemon for Windows, macOS, and Linux that monitors:
- System Resource Telemetry (CPU, RAM, Disk, Battery)
- User Activity & Currently Active Application / Window Title
- Live Desktop Screen Capture & Preview
- Remote Message Popups and Diagnostic Commands from the ITSM Web Portal.
"""

import os
import sys
import time
import json
import base64
import socket
import platform
import subprocess
import shutil
import urllib.request
import urllib.error

# Set OS Process Title to 'itsm-agent' in Process Table / Activity Monitor
try:
    if platform.system() == "Linux":
        import ctypes
        libc = ctypes.CDLL("libc.so.6")
        # PR_SET_NAME = 15
        libc.prctl(15, b"itsm-agent", 0, 0, 0)
except Exception:
    pass

# Server URL Resolution
def resolve_server_url():
    if len(sys.argv) > 1 and (sys.argv[1].startswith("http://") or sys.argv[1].startswith("https://")):
        return sys.argv[1].rstrip("/")
    if os.environ.get("ITSM_SERVER_URL"):
        return os.environ.get("ITSM_SERVER_URL").rstrip("/")
    token_file = os.path.expanduser("~/.itsm_device_token.json")
    if os.path.exists(token_file):
        try:
            with open(token_file, "r") as f:
                saved = json.load(f)
                if saved.get("server_url"):
                    return saved.get("server_url").rstrip("/")
        except Exception:
            pass
    return "http://localhost:8000"

SERVER_URL = resolve_server_url()
DEVICE_NAME = os.environ.get("ITSM_DEVICE_NAME", platform.node())
TOKEN_FILE = os.path.expanduser("~/.itsm_device_token.json")
HEARTBEAT_INTERVAL = int(os.environ.get("ITSM_INTERVAL", "5"))
SCREENSHOT_TEMP_FILE = "/tmp/itsm_screenshot.jpg"

def get_system_info():
    """Gathers static hardware & OS specs."""
    info = {
        "hostname": platform.node(),
        "os_name": platform.system(),
        "os_version": f"{platform.system()} {platform.release()} ({platform.version()})",
        "cpu_model": platform.processor() or platform.machine(),
        "cpu_cores": os.cpu_count() or 4,
        "total_ram_gb": 16.0,
        "total_disk_gb": 256.0,
        "ip_address": "127.0.0.1",
        "mac_address": "00:00:00:00:00:00",
    }

    # IP Address
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        info["ip_address"] = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    # Disk Space
    try:
        total, used, free = shutil.disk_usage("/")
        info["total_disk_gb"] = round(total / (1024 ** 3), 1)
    except Exception:
        pass

    # Total RAM
    try:
        if platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "hw.memsize"]).decode().strip()
            info["total_ram_gb"] = round(int(out) / (1024 ** 3), 1)
        elif platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                for line in f:
                    if "MemTotal" in line:
                        kb = int(line.split()[1])
                        info["total_ram_gb"] = round(kb / (1024 ** 2), 1)
                        break
        elif platform.system() == "Windows":
            out = subprocess.check_output(["wmic", "computersystem", "get", "totalphysicalmemory"]).decode()
            for line in out.splitlines():
                if line.strip().isdigit():
                    info["total_ram_gb"] = round(int(line.strip()) / (1024 ** 3), 1)
                    break
    except Exception:
        pass

    return info

def get_live_metrics():
    """Reads live CPU %, RAM %, Disk %, and Active Window."""
    metrics = {
        "cpu_percent": 5.0,
        "ram_percent": 45.0,
        "disk_percent": 30.0,
        "battery_percent": None,
        "is_charging": False,
        "is_idle": False,
        "idle_seconds": 0,
        "active_app": "Finder",
        "active_window": "",
    }

    # Disk usage %
    try:
        total, used, free = shutil.disk_usage("/")
        metrics["disk_percent"] = round((used / total) * 100, 1)
    except Exception:
        pass

    # CPU & RAM usage %
    if platform.system() == "Darwin":
        try:
            # CPU
            out = subprocess.check_output("ps -A -o %cpu | awk '{s+=$1} END {print s}'", shell=True).decode().strip()
            val = float(out) / (os.cpu_count() or 4)
            metrics["cpu_percent"] = round(min(100.0, max(0.5, val)), 1)
        except Exception:
            metrics["cpu_percent"] = 8.5

        # RAM
        try:
            out = subprocess.check_output("ps -A -o %mem | awk '{s+=$1} END {print s}'", shell=True).decode().strip()
            metrics["ram_percent"] = round(min(100.0, max(5.0, float(out))), 1)
        except Exception:
            metrics["ram_percent"] = 52.0

        # Active Window on macOS
        try:
            cmd = """osascript -e '
            global frontApp, windowTitle
            set windowTitle to ""
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
                try
                    tell process frontApp
                        set windowTitle to name of front window
                    end tell
                end try
            end tell
            return frontApp & "|||" & windowTitle
            '"""
            res = subprocess.check_output(cmd, shell=True, timeout=3).decode().strip()
            if "|||" in res:
                app, title = res.split("|||", 1)
                metrics["active_app"] = app.strip() or "Desktop"
                metrics["active_window"] = title.strip()
        except Exception:
            metrics["active_app"] = "Finder"

    elif platform.system() == "Windows":
        try:
            ps_script = """
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                using System.Text;
                public class Win {
                    [DllImport("user32.dll")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")]
                    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                    [DllImport("user32.dll", SetLastError = true)]
                    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
                }
"@
            $hwnd = [Win]::GetForegroundWindow()
            $sb = New-Object System.Text.StringBuilder 256
            [Win]::GetWindowText($hwnd, $sb, 256) | Out-Null
            $pid = 0
            [Win]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            Write-Output ($proc.ProcessName + "|||" + $sb.ToString())
            """
            out = subprocess.check_output(["powershell", "-NoProfile", "-Command", ps_script], timeout=3).decode().strip()
            if "|||" in out:
                app, title = out.split("|||", 1)
                metrics["active_app"] = app.strip()
                metrics["active_window"] = title.strip()
        except Exception:
            metrics["active_app"] = "explorer.exe"

    elif platform.system() == "Linux":
        try:
            out = subprocess.check_output("xdotool getactivewindow getwindowname", shell=True, timeout=2).decode().strip()
            metrics["active_window"] = out
            metrics["active_app"] = out.split()[0] if out else "Desktop"
        except Exception:
            metrics["active_app"] = "Desktop"

    return metrics

def capture_desktop_screenshot(output_path=SCREENSHOT_TEMP_FILE):
    """Captures the current desktop screen silently."""
    system = platform.system()
    try:
        if system == "Darwin":
            subprocess.run(["/usr/sbin/screencapture", "-x", "-t", "jpg", output_path], timeout=4, check=True)
            return os.path.exists(output_path) and os.path.getsize(output_path) > 1000

        elif system == "Windows":
            ps = f"""
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
            $bitmap.Save('{output_path}', [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $graphics.Dispose()
            $bitmap.Dispose()
            """
            subprocess.run(["powershell", "-NoProfile", "-Command", ps], timeout=5, check=True)
            return os.path.exists(output_path) and os.path.getsize(output_path) > 1000

        elif system == "Linux":
            if shutil.which("scrot"):
                subprocess.run(["scrot", "-z", "-q", "75", output_path], timeout=4, check=True)
            elif shutil.which("import"):
                subprocess.run(["import", "-window", "root", output_path], timeout=4, check=True)
            return os.path.exists(output_path) and os.path.getsize(output_path) > 1000
    except Exception:
        return False

def display_popup_notification(title, message):
    """Shows native desktop pop-up message to the user."""
    system = platform.system()
    print(f"\n📢 [ALERT DARI IT]: {title} - {message}\n")
    try:
        if system == "Darwin":
            script = f'display alert "{title}" message "{message}" as informational'
            subprocess.Popen(["osascript", "-e", script])
        elif system == "Windows":
            ps = f'[System.Windows.Forms.MessageBox]::Show("{message}", "{title}")'
            subprocess.Popen(["powershell", "-Command", f"Add-Type -AssemblyName PresentationFramework; {ps}"])
        elif system == "Linux":
            subprocess.Popen(["notify-send", title, message])
    except Exception as e:
        print(f"Failed to display popup: {e}")

class ITSMAgent:
    def __init__(self, server_url=SERVER_URL):
        self.server_url = server_url.rstrip("/")
        self.device_token = self.load_token()
        self.heartbeat_count = 0

    def load_token(self):
        if os.path.exists(TOKEN_FILE):
            try:
                with open(TOKEN_FILE, "r") as f:
                    data = json.load(f)
                    return data.get("device_token")
            except Exception:
                pass
        return None

    def save_token(self, token):
        self.device_token = token
        try:
            with open(TOKEN_FILE, "w") as f:
                json.dump({
                    "device_token": token,
                    "server_url": self.server_url,
                    "updated_at": time.time()
                }, f)
        except Exception:
            pass

    def register(self):
        url = f"{self.server_url}/api/agent/register"
        info = get_system_info()
        info["device_name"] = DEVICE_NAME
        if self.device_token:
            info["device_token"] = self.device_token

        req = urllib.request.Request(
            url,
            data=json.dumps(info).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                token = data.get("device_token")
                if token:
                    self.save_token(token)
                    print(f"✅ Device terdaftar dengan Token: {token}")
                    return True
        except Exception as e:
            print(f"❌ Gagal mendaftar ke server: {e}")
            return False

    def upload_screen(self):
        """Captures and uploads the current desktop screenshot."""
        if not self.device_token:
            return False

        if not capture_desktop_screenshot():
            return False

        try:
            with open(SCREENSHOT_TEMP_FILE, "rb") as f:
                img_data = f.read()
                b64_str = base64.b64encode(img_data).decode("utf-8")

            url = f"{self.server_url}/api/agent/screenshot"
            payload = {
                "device_token": self.device_token,
                "screenshot_base64": b64_str,
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Device-Token": self.device_token,
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print("📸 [Screen] Tangkapan layar berhasil diunggah ke server")
                return True
        except Exception as e:
            print(f"⚠️ Gagal mengunggah screenshot: {e}")
            return False

    def send_heartbeat(self):
        if not self.device_token:
            if not self.register():
                return

        self.heartbeat_count += 1
        url = f"{self.server_url}/api/agent/heartbeat"
        metrics = get_live_metrics()
        metrics["device_token"] = self.device_token

        req = urllib.request.Request(
            url,
            data=json.dumps(metrics).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Device-Token": self.device_token,
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                print(f"📡 [Heartbeat #{self.heartbeat_count}] CPU: {metrics['cpu_percent']}% | RAM: {metrics['ram_percent']}% | Buka: {metrics['active_app']} — {metrics['active_window'][:30] if metrics['active_window'] else 'Desktop'}")

                # Automatically upload screen every 2 heartbeats
                if self.heartbeat_count % 2 == 0:
                    self.upload_screen()

                # Handle remote commands
                commands = res.get("commands", [])
                for cmd in commands:
                    self.handle_command(cmd)

        except urllib.error.HTTPError as e:
            if e.code in (401, 404):
                print("⚠️ Token kedaluwarsa, mendaftar ulang...")
                self.register()
            else:
                print(f"⚠️ HTTP Error: {e.code}")
        except Exception as e:
            print(f"⚠️ Koneksi heartbeat terputus: {e}")

    def handle_command(self, cmd):
        cmd_id = cmd.get("command_id")
        cmd_type = cmd.get("type")
        payload = cmd.get("payload", {})

        print(f"⚡ Menerima Perintah Remote: {cmd_type}")

        result_text = "OK"
        status = "completed"

        if cmd_type == "capture_screen":
            ok = self.upload_screen()
            result_text = "Screenshot berhasil diambil dan diunggah" if ok else "Gagal mengambil screenshot"
            status = "completed" if ok else "failed"

        elif cmd_type == "message_popup":
            title = payload.get("title", "Pemberitahuan IT")
            msg = payload.get("message", "Pesan dari Administrator ITSM")
            display_popup_notification(title, msg)
            result_text = "Pesan popup telah ditampilkan di layar user"

        elif cmd_type == "ping":
            result_text = f"Pong from {platform.node()} at {time.strftime('%Y-%m-%d %H:%M:%S')}"

        elif cmd_type == "system_info":
            info = get_system_info()
            result_text = json.dumps(info)

        # Report command result back to server
        try:
            url = f"{self.server_url}/api/agent/command-result"
            data = {"command_id": cmd_id, "status": status, "result": result_text}
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode("utf-8"),
                headers={"Content-Type": "application/json", "X-Device-Token": self.device_token},
                method="POST"
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass

    def run(self):
        print("=" * 60)
        print("🎯 ITSM Endpoint Activity & Device Monitoring Agent")
        print(f"💻 Device: {DEVICE_NAME} ({platform.system()} {platform.release()})")
        print(f"🌐 Server: {self.server_url}")
        print("=" * 60)

        self.register()
        # Initial capture
        self.upload_screen()

        while True:
            self.send_heartbeat()
            time.sleep(HEARTBEAT_INTERVAL)

if __name__ == "__main__":
    agent = ITSMAgent()
    try:
        agent.run()
    except KeyboardInterrupt:
        print("\n👋 Agent dihentikan.")
