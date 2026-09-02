# ==============================================================================
# ITSM ENTERPRISE - UNINSTALL WINDOWS ENDPOINT MONITORING AGENT
# ==============================================================================

Write-Host "🛑 Stopping and uninstalling ITSM Endpoint Agent from Windows..." -ForegroundColor Yellow

# 1. Unregister Scheduled Task
try {
    Unregister-ScheduledTask -TaskName "ITSMEndpointAgent" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "✓ Windows Scheduled Task 'ITSMEndpointAgent' removed." -ForegroundColor Green
} catch {}

# 2. Stop running process
try {
    Stop-Process -Name "itsm-agent" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "pythonw" -ErrorAction SilentlyContinue
} catch {}

# 3. Remove agent folder and tokens
$AgentDir = "$env:USERPROFILE\.itsm-agent"
if (Test-Path $AgentDir) {
    Remove-Item -Path $AgentDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Agent files removed." -ForegroundColor Green
}

$TokenFile = "$env:USERPROFILE\.itsm_device_token.json"
if (Test-Path $TokenFile) {
    Remove-Item -Path $TokenFile -Force -ErrorAction SilentlyContinue
}

Write-Host "✅ ITSM Endpoint Agent successfully uninstalled from Windows." -ForegroundColor Green
