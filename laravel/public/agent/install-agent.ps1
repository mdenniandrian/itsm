# ==============================================================================
# ITSM ENDPOINT AGENT AUTO-INSTALLER & SCHEDULED TASK (Windows PowerShell)
# ==============================================================================
# - Automatically installs Python agent
# - Registers persistent Scheduled Task (Auto-start on Windows Logon & Reboot)
# ==============================================================================

param (
    [string]$ServerUrl = ""
)

if (-not $ServerUrl) {
    if ($env:ITSM_SERVER_URL) {
        $ServerUrl = $env:ITSM_SERVER_URL
    } else {
        $ServerUrl = "http://localhost:8000"
    }
}

$ServerUrl = $ServerUrl.TrimEnd('/')
$AgentDir = "$HOME\.itsm-agent"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🎯 Menginstall & Mendaftarkan ITSM Endpoint Background Service (Windows)" -ForegroundColor Green
Write-Host "🌐 Target Server: $ServerUrl" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan

if (-not (Test-Path $AgentDir)) {
    New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
}

Write-Host "📥 Mengunduh script agent dari server..." -ForegroundColor Yellow
$AgentFile = "$AgentDir\itsm-agent.py"
Invoke-WebRequest -Uri "$ServerUrl/agent/itsm-agent.py" -OutFile $AgentFile -UseBasicParsing

Write-Host "✅ File agent tersimpan di $AgentFile" -ForegroundColor Green

# Save persistent config
$Config = @{
    server_url = $ServerUrl
    installed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Set-Content -Path "$AgentDir\config.json" -Value $Config

# Kill existing agent process if running
Get-Process -Name python, pythonw -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*itsm-agent.py*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Find pythonw or python and create dedicated itsm-agent.exe
$PythonExe = (Get-Command pythonw.exe -ErrorAction SilentlyContinue).Source
if (-not $PythonExe) {
    $PythonExe = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
}
if (-not $PythonExe) {
    $PythonExe = "pythonw.exe"
}

$AgentExe = "$AgentDir\itsm-agent.exe"
try {
    Copy-Item -Path $PythonExe -Destination $AgentExe -Force -ErrorAction SilentlyContinue
} catch {
    $AgentExe = $PythonExe
}

# Register Windows Scheduled Task for Auto-Start on Boot/Logon
Write-Host "⚙️ Mendaftarkan Scheduled Task Auto-Start (Windows Logon)..." -ForegroundColor Yellow
$TaskName = "ITSMEndpointAgent"

try {
    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    
    $Action = New-ScheduledTaskAction -Execute $AgentExe -Argument "`"$AgentFile`" `"$ServerUrl`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "ITSM Enterprise Endpoint Background Monitoring Service" | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "✅ Windows Scheduled Task '$TaskName' (itsm-agent.exe) berhasil diaktifkan!" -ForegroundColor Green
} catch {
    # Fallback to Startup folder shortcut if scheduled task permissions are restricted
    Write-Host "⚠️ Mendaftarkan ke Windows Startup folder..." -ForegroundColor Yellow
    $WshShell = New-Object -ComObject WScript.Shell
    $StartupDir = [Environment]::GetFolderPath("Startup")
    $Shortcut = $WshShell.CreateShortcut("$StartupDir\ITSMEndpointAgent.lnk")
    $Shortcut.TargetPath = $AgentExe
    $Shortcut.Arguments = "`"$AgentFile`" `"$ServerUrl`""
    $Shortcut.WindowStyle = 7 # Minimized/Hidden
    $Shortcut.Description = "ITSM Enterprise Endpoint Background Monitoring Agent"
    $Shortcut.Save()
    
    # Start immediately
    $env:ITSM_SERVER_URL = $ServerUrl
    Start-Process -FilePath $AgentExe -ArgumentList "`"$AgentFile`" `"$ServerUrl`"" -WindowStyle Hidden
    Write-Host "✅ Startup shortcut berhasil dibuat di folder Startup." -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🎉 INSTALASI SELESAI!" -ForegroundColor Green
Write-Host "📋 Service Name: itsm-agent.exe (muncul sebagai 'itsm-agent.exe' di Task Manager)" -ForegroundColor Yellow
Write-Host "🌐 Status device aktif dapat dipantau di portal ITSM (Device Monitoring)" -ForegroundColor Cyan
Write-Host "🔄 Saat Windows di-restart, agent akan OTOMATIS BERJALAN kembali." -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
