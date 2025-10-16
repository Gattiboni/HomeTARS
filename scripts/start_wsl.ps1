# =============================================
#  start_wsl.ps1 — WSL Initializer (robust)
#  Purpose: reliably detect / start WSL Ubuntu and launch ~/start_ha.sh
#  Keep-it-simple, safe parsing and clear status outputs.
# =============================================

Clear-Host
Write-Host "`n----------------------------------------" -ForegroundColor DarkGreen
Write-Host "   W S L   I N I T I A L I Z E R" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor DarkGreen

function Show-Step($text, $delay = 0.02) {
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

Show-Step "[WSL BOOT INITIATED...]"
Start-Sleep -Milliseconds 200

# locate wsl.exe
$wslExe = Join-Path $env:SystemRoot 'System32\wsl.exe'
if (-not (Test-Path $wslExe)) { $wslExe = 'wsl.exe' }

Show-Status "Checking WSL availability" "SCANNING"
try {
    $raw = & $wslExe --list --verbose 2>&1
} catch {
    $raw = $null
}

if (-not $raw) {
    Show-Status "WSL availability" "NOT FOUND" "Red"
    Show-Status "Suggestion" "Run: wsl --install" "Yellow"
    return
} else {
    Show-Status "WSL detected" "OK" "Green"
}

# Normalize lines and ignore headers
$lines = ($raw -split "`n") | ForEach-Object { $_.Trim() } | Where-Object { ($_ -ne "") -and ($_ -notmatch "^NAME") }
if (-not $lines -or $lines.Count -eq 0) {
    Show-Status "WSL distros" "NONE" "Red"
    Show-Status "Ubuntu distro" "NOT FOUND" "Red"
    return
}

# Parse lines into simple objects: Name, State, Version
$distroEntries = @()
foreach ($ln in $lines) {
    # remove leading '*' marker for default
    $clean = $ln -replace '^[*]\s*', ''
    # split by two or more spaces if available, otherwise fallback to whitespace split
    $parts = [regex]::Split($clean, '\s{2,}')
    if ($parts.Count -lt 2) { $parts = $clean -split '\s+' }
    $name = $parts[0].Trim()
    $state = if ($parts.Count -ge 2) { $parts[1].Trim() } else { 'Unknown' }
    $version = if ($parts.Count -ge 3) { $parts[2].Trim() } else { '' }
    $distroEntries += [PSCustomObject]@{ Name = $name; State = $state; Version = $version }
}

# Prefer any distro that starts with 'Ubuntu', else prefer default (the one originally prefixed with *), else first
$selected = $distroEntries | Where-Object { $_.Name -like 'Ubuntu*' } | Select-Object -First 1
if (-not $selected) {
    # try to find the default (line that originally started with *) by rechecking raw text
    $defaultLine = ($raw -split "`n") | Where-Object { $_ -match '^\*' } | Select-Object -First 1
    if ($defaultLine) {
        $defaultClean = $defaultLine -replace '^[*]\s*',''
        $tok = ($defaultClean -split '\s+')[0]
        $selected = $distroEntries | Where-Object { $_.Name -eq $tok } | Select-Object -First 1
    }
}
if (-not $selected) { $selected = $distroEntries | Select-Object -First 1 }

if (-not $selected) {
    Show-Status "Ubuntu distro" "NOT FOUND" "Red"
    Show-Status "Suggestion" "Install a distro (Ubuntu recommended)" "Yellow"
    return
}

$ubuntuName = $selected.Name
Show-Status "Ubuntu distro found" $ubuntuName "Green"

# If stopped, start
if ($selected.State -match 'Stopped|stopped') {
    Show-Status ("Starting Ubuntu (" + $ubuntuName + ")") "BOOTING" "Yellow"
    try {
        & $wslExe -d $ubuntuName -- bash -lc "echo 'Booting $ubuntuName...'" | Out-Null
        Start-Sleep -Seconds 3
        Show-Status "Ubuntu status" "RUNNING" "Green"
    } catch {
        Show-Status "Ubuntu start" "FAILED" "Red"
        return
    }
} else {
    Show-Status ("Starting Ubuntu (" + $ubuntuName + ")") "ALREADY" "Green"
}

# Check presence of ~/start_ha.sh inside WSL
Show-Status "Checking start_ha.sh" "PROBING" "Gray"
$hasScript = & $wslExe -d $ubuntuName -- bash -lc "if [ -f ~/start_ha.sh ]; then echo 'YES'; else echo 'NO'; fi" 2>$null
$hasScript = $hasScript.Trim()
if ($hasScript -ne 'YES') {
    Show-Status "start_ha.sh" "NOT FOUND" "Red"
    Show-Status "Info" "Place ~/start_ha.sh in WSL home and chmod +x" "Yellow"
    return
}
Show-Status "start_ha.sh" "FOUND" "Green"

# Launch the HA starter script (runs in background inside WSL)
Show-Status "Launching Home Assistant" "BOOTING" "Yellow"
try {
    # use nohup to background the process in WSL
    & $wslExe -d $ubuntuName -- bash -lc "nohup bash ~/start_ha.sh >/dev/null 2>&1 &"
} catch {
    Show-Status "Launch command" "FAILED" "Red"
}

# Wait and verify HA listens on 8123 (retry up to 6 times)
$maxTries = 6
$ok = $false
for ($i = 1; $i -le $maxTries; $i++) {
    Start-Sleep -Seconds 2
    $portCheck = & $wslExe -d $ubuntuName -- bash -lc "ss -tuln 2>/dev/null | grep 8123 || true" 2>$null
    if ($portCheck -and $portCheck.Trim() -ne '') {
        $ok = $true
        break
    }
    Show-Status ("Home Assistant status") ("INITIALIZING (retry $i)") "Yellow"
}

if ($ok) {
    Show-Status "Home Assistant status" "ONLINE" "Green"
} else {
    Show-Status "Home Assistant status" "FAILED (not listening on 8123)" "Red"
    Show-Status "Tip" "Check logs: ~/.tars_ha.log or run 'hass' manually inside WSL" "Yellow"
}

Show-Status "Ubuntu status" "RUNNING" "Green"
Write-Host "`nâœ…  WSL environment ready and Ubuntu detected: $ubuntuName`n" -ForegroundColor Cyan

# End — do not forcibly close; leave the caller in control

