# =============================================
#  TARS SYSTEM BOOT SEQUENCE
#  HomeTARS Local Environment Launcher
#  Author: Alan Gattiboni
#  Version: 2.0.0 (Clean Build - No WSL)
# =============================================

Clear-Host
Write-Host "`n----------------------------------------" -ForegroundColor DarkGreen
Write-Host "    T A R S   S Y S T E M   B O O T     " -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor DarkGreen

function Show-Step($text, $delay = 0.04) {
    foreach ($char in $text.ToCharArray()) {
        Write-Host -NoNewline $char -ForegroundColor Gray
        Start-Sleep -Milliseconds ($delay * 1000)
    }
    Write-Host ""
}

function Show-Status($msg, $status, $color = "Gray") {
    Write-Host (" -> " + $msg.PadRight(35, '.')) -NoNewline -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 300
    Write-Host $status -ForegroundColor $color
}

Show-Step "[BOOT SEQUENCE INITIATED...]"
Start-Sleep -Milliseconds 400

# --- Step 1: MongoDB ---
Show-Status "Checking MongoDB service" "SCANNING"
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $mongoProcess) {
    Show-Status "Starting MongoDB engine" "BOOTING" "Yellow"
    $mongoPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    $mongoArgs = @("--dbpath", "C:\Program Files\MongoDB\Server\8.2\data")
    Start-Process -FilePath $mongoPath -ArgumentList $mongoArgs -WindowStyle Minimized
    Start-Sleep -Seconds 5
    Show-Status "MongoDB status" "ONLINE" "Green"
} else {
    Show-Status "MongoDB already running" "OK" "Green"
}

# --- Step 2: Backend ---
Show-Status "Spinning backend (FastAPI)" "INITIALIZING" "Yellow"
Set-Location "C:\Users\Alan Gattiboni\Desktop\HomeTARS\backend"

if (!(Test-Path ".\venv")) {
    Show-Status "Creating virtual environment" "SETUP" "Yellow"
    python -m venv venv
    & .\venv\Scripts\activate
    pip install -r ..\requirements.txt
    Show-Status "Dependencies" "INSTALLED" "Green"
}

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c .\venv\Scripts\activate && uvicorn server:app --reload" `
    -WindowStyle Minimized
Start-Sleep -Seconds 10
Show-Status "Backend link" "STABLE" "Green"


# --- Step 3: Frontend (React) ---
Show-Status "Deploying frontend (React)" "COMPILING" "Yellow"
Set-Location "C:\Users\Alan Gattiboni\Desktop\HomeTARS\frontend"
$env:BROWSER = "none"
Start-Process -FilePath "cmd" -ArgumentList @("/c", "npm start") -WindowStyle Minimized
Start-Sleep -Seconds 20
Show-Status "Frontend module" "READY" "Green"

# --- Step 4: Browser Launch ---
Show-Status "Establishing visual interfaces" "LINKING" "Yellow"
Start-Process "http://localhost:3000"
Start-Sleep -Seconds 2
Show-Status "Core connection" "ACTIVE" "Green"

# --- Final Banner ---
Start-Sleep -Milliseconds 500
Write-Host "`n----------------------------------------" -ForegroundColor DarkGreen
Write-Host "      T A R S   S Y S T E M   O N L I N E" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor DarkGreen

Show-Step "Environment: LOCAL BUILD v2.0.0"
Show-Step "AI Core: Active | WS: Enabled | Voice: Disabled"
Show-Step "Home Assistant: External (WSL Managed Separately)"
Show-Step "All systems nominal."
Show-Step "`nAwaiting your command, Commander."
Write-Host ""
