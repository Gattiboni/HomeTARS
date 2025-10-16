# =============================================
#  TARS SYSTEM BOOT — ORQUESTRADOR GERAL
#  Arquivo: boot_all.ps1
#  Objetivo: subir WSL/HA + Backend + Frontend em janelas separadas,
#            aceitar comandos "tchau" e "reiniciar" e manter a janela aberta.
#  Observação: sem logs em disco.
# =============================================

Clear-Host
Write-Host "`n----------------------------------------" -ForegroundColor DarkGreen
Write-Host "   T A R S   S Y S T E M   L A U N C H E R" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor DarkGreen

function Show-Step($text, $delay = 0.03) {
    foreach ($c in $text.ToCharArray()) { Write-Host -NoNewline $c -ForegroundColor Gray; Start-Sleep -Milliseconds ($delay*1000) }
    Write-Host ""
}

function Show-Status($msg, $status, $color = "Gray") {
    Write-Host (" -> " + $msg.PadRight(35, '.')) -NoNewline -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 200
    Write-Host $status -ForegroundColor $color
}

# --- Caminhos (AJUSTE SE NECESSÁRIO) ---
$Root    = "C:\Users\Alan Gattiboni\Desktop\HomeTARS"
$Scripts = Join-Path $Root "scripts"
$WslPs1  = Join-Path $Scripts "start_wsl.ps1"
$TarsPs1 = Join-Path $Scripts "start_tars.ps1"

# --- Estado dos filhos ---
$Global:Child = @{ WSL = $null; TARS = $null }

function Start-ChildWindow($title, $ps1Path) {
    if (-not (Test-Path -LiteralPath $ps1Path)) {
        Show-Status $title "SCRIPT NOT FOUND" "Red"
        return $null
    }
    # Abre uma nova janela do PowerShell, mantém aberta (-NoExit) e executa o script com ExecutionPolicy liberado.
    $args = @("-NoExit","-ExecutionPolicy","Bypass","-File","`"$ps1Path`"")
    $p = Start-Process -FilePath "powershell.exe" -ArgumentList $args -WindowStyle Normal -PassThru
    # Tenta dar um título (nem sempre respeitado por políticas/hosts)
    try { $p | Out-Null } catch {}
    return $p
}

function Stop-ChildIfAlive($proc) {
    if ($null -ne $proc) {
        try {
            $p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
            if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
        } catch {}
    }
}

function Wsl-HardShutdown() {
    # Fecha distros WSL (garante que o HA pare também)
    try { Start-Process -FilePath "wsl.exe" -ArgumentList @("--shutdown") -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue } catch {}
}

# --- Bootstrap ---
Show-Step "[BOOT ALL INITIATED]"

Show-Status "Abrindo WSL/HA" "STARTING" "Yellow"
$Global:Child.WSL  = Start-ChildWindow -title "WSL/HA" -ps1Path $WslPs1
Start-Sleep -Seconds 1

Show-Status "Abrindo Backend/Frontend" "STARTING" "Yellow"
$Global:Child.TARS = Start-ChildWindow -title "TARS"  -ps1Path $TarsPs1
Start-Sleep -Seconds 1

Write-Host ""; Show-Status "Estado" "SISTEMAS INICIADOS" "Green"; Write-Host ""
Write-Host "Comandos:  tchau  |  reiniciar  |  help" -ForegroundColor DarkCyan

# --- Loop interativo ---
while ($true) {
    $userCmd = Read-Host -Prompt "Command"
    switch ($userCmd.ToLower()) {
        'help' {
            Write-Host "Comandos disponíveis:" -ForegroundColor Gray
            Write-Host "  tchau      -> encerra WSL/HA e Backend/Frontend" -ForegroundColor Gray
            Write-Host "  reiniciar  -> encerra tudo e sobe novamente" -ForegroundColor Gray
        }
        'tchau' {
            Write-Host "Shutting down systems..." -ForegroundColor DarkYellow
            Stop-ChildIfAlive $Global:Child.TARS
            Stop-ChildIfAlive $Global:Child.WSL
            Wsl-HardShutdown
            Write-Host "All systems safely powered down." -ForegroundColor Green
            break
        }
        'reiniciar' {
            Write-Host "Restarting systems..." -ForegroundColor DarkYellow
            Stop-ChildIfAlive $Global:Child.TARS
            Stop-ChildIfAlive $Global:Child.WSL
            Wsl-HardShutdown
            Start-Sleep -Seconds 2
            $Global:Child.WSL  = Start-ChildWindow -title "WSL/HA" -ps1Path $WslPs1
            Start-Sleep -Seconds 1
            $Global:Child.TARS = Start-ChildWindow -title "TARS"  -ps1Path $TarsPs1
            Start-Sleep -Seconds 1
            Write-Host "Systems back online." -ForegroundColor Green
        }
        default {
            if ([string]::IsNullOrWhiteSpace($userCmd)) { continue }
            Write-Host "Unknown command. Type 'help'." -ForegroundColor DarkGray
        }
    }
}

Write-Host "`nGoodbye, Commander." -ForegroundColor DarkCyan
