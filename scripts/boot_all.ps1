# ===============================
# boot_all.ps1   (FINAL v6 - HUD + FAIL definitivo + UTF8 + R2 reinicia + tchau + input em tempo real)
# ===============================

# UTF-8 decente + força também InputEncoding (corrige Ã/Â)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::UTF8
cmd /c chcp 65001 > $null
$ErrorActionPreference = 'SilentlyContinue'

#region Banner
#
Write-Host ""

Write-Host '----------------------------------------' -ForegroundColor Gray
#endregion

# Caminhos base
$Root        = $PSScriptRoot
$StartWsl    = Join-Path $Root 'start_wsl.ps1'
$StartTars   = Join-Path $Root 'start_tars.ps1'
$FrontendDir = Resolve-Path (Join-Path $Root '..\frontend') -ErrorAction SilentlyContinue

# URLs/ports para health
$HA_URL     = 'http://localhost:8123'
$BACK_URL   = 'http://localhost:8000/status'
$FRONT_URL  = 'http://localhost:3000'
$HA_PORT    = 8123
$BACK_PORT  = 8000
$FRONT_PORT = 3000

# Logs/arquivos
$FrontLog = Join-Path $env:TEMP 'tars_frontend.log'
$psExe    = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

# Estado
$procWSL = $null; $procBACK = $null; $procFRONT = $null
$openedBrowser = $false
$stableCount   = 0
$frontendFailed = $false
$inputBuffer = ''

function Test-Http($url) {
  try { $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) } catch { return $false }
}
function StatusLine($label, $ok, $port, $proc) {
  $tag = "[$label]".PadRight(10)
  if ($proc -and $proc.HasExited) { $code = try { $proc.ExitCode } catch { '?' }; Write-Host ("{0} FAIL  [SIGKILL / EXIT {1}]" -f $tag,$code) -ForegroundColor Red; return $false }
  if ($ok) { Write-Host ("{0} OK    :{1}" -f $tag,$port) -ForegroundColor Green; return $true }
  else     { Write-Host ("{0} ...   :{1}" -f $tag,$port) -ForegroundColor DarkYellow; return $false }
}
function Tail-Log($path, $lines = 20) { if (Test-Path $path) { return (Get-Content $path -Tail $lines -ErrorAction SilentlyContinue) } return @('sem log disponível') }

function Start-All {
  param([switch]$Fresh)
  # WSL
  if (Test-Path $StartWsl) { $script:procWSL  = Start-Process $psExe -PassThru -WindowStyle Normal -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$StartWsl`"" }
  Start-Sleep -Milliseconds 1000
  # Backend
  if (Test-Path $StartTars) { $script:procBACK = Start-Process $psExe -PassThru -WindowStyle Normal -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$StartTars`"" }
  Start-Sleep -Milliseconds 1000
  # Frontend (sem cd; usa WorkingDirectory) + variável de ambiente via .NET
  if ($FrontendDir) {
    try { Remove-Item $FrontLog -ErrorAction SilentlyContinue } catch {}
    $frontCmd = "[System.Environment]::SetEnvironmentVariable('REACT_APP_BACKEND_URL','http://localhost:8000','Process'); [System.Environment]::SetEnvironmentVariable('NODE_OPTIONS','--no-warnings','Process'); npm start 2>&1 | Tee-Object -FilePath `"$FrontLog`" -Append"
    $script:procFRONT = Start-Process $psExe -PassThru -WindowStyle Normal -WorkingDirectory $FrontendDir -ArgumentList "-NoExit -ExecutionPolicy Bypass -Command $frontCmd"
  }
  $script:openedBrowser = $false
  $script:stableCount   = 0
  $script:frontendFailed = $false
}

function Stop-Proc($p) { if ($p) { try { $p.CloseMainWindow() | Out-Null } catch {}; Start-Sleep -Milliseconds 200; try { if (-not $p.HasExited) { $p.Kill() } } catch {} } }
function Stop-All { Stop-Proc $script:procFRONT; Stop-Proc $script:procBACK; Stop-Proc $script:procWSL }

# Boot inicial
Start-All -Fresh

while ($true) {
  # Entrada não bloqueante
  while ([Console]::KeyAvailable) {
    $key = [Console]::ReadKey($true)
    if ($key.Key -eq 'Enter') {
      $cmd = $inputBuffer.Trim().ToLower()
      $inputBuffer = ''
      if ($cmd -eq 'reinicia') {
        Write-Host '> reinicia' -ForegroundColor DarkCyan
        Write-Host '[HUD] acknowledged — system rebooting...' -ForegroundColor Cyan
        Stop-All; Start-Sleep -Milliseconds 500; Start-All -Fresh; continue
      }
      if ($cmd -eq 'tchau') {
        Write-Host '> tchau' -ForegroundColor DarkCyan
        Write-Host '[HUD] acknowledged — shutting down...' -ForegroundColor Cyan
        Stop-All; Start-Sleep -Milliseconds 200
        break 2
      }
    } elseif ($key.Key -eq 'Backspace') {
      if ($inputBuffer.Length -gt 0) { $inputBuffer = $inputBuffer.Substring(0,$inputBuffer.Length-1) }
    } else {
      $inputBuffer += $key.KeyChar
    }
  }

  $okHA    = Test-Http $HA_URL
  $okBack  = Test-Http $BACK_URL
  $okFront = Test-Http $FRONT_URL

  
  Write-Host ""
  
  

  $sHA    = StatusLine 'WSL/HA'   $okHA    $HA_PORT    $procWSL
  $sBACK  = StatusLine 'Backend'  $okBack  $BACK_PORT  $procBACK
  $sFRONT = StatusLine 'Frontend' $okFront $FRONT_PORT $procFRONT

  if ($procFRONT -and $procFRONT.HasExited -and -not $frontendFailed) {
    $frontendFailed = $true
    
    Write-Host '╔═══════ LOG (Frontend) ═══════' -ForegroundColor Yellow
    (Tail-Log $FrontLog 22) | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
    Write-Host '╚══════════════════════════════' -ForegroundColor Yellow
    Write-Host '[HUD] frontend crash detectado — FALHA DEFINITIVA' -ForegroundColor Red
  }

  Write-Host ''
  if (-not $frontendFailed -and $sHA -and $sBACK -and $sFRONT) {
    if (-not $onlineShown) {
      $onlineShown = $true
      Write-Host ""; Write-Host '  T A R S   S Y S T E M   O N L I N E' -ForegroundColor Green
      Write-Host '----------------------------------------' -ForegroundColor Gray
    }
    Write-Host ("WSL/HA      : ONLINE    : {0}" -f $HA_PORT)   -ForegroundColor Green
    Write-Host ("Backend     : RUNNING   : {0}" -f $BACK_PORT) -ForegroundColor Green
    Write-Host ("Frontend    : RUNNING   : {0}" -f $FRONT_PORT) -ForegroundColor Green
    Write-Host '' -ForegroundColor DarkGray
    Write-Host 'Comandos disponíveis:' -ForegroundColor DarkGray
    Write-Host '  - reinicia   => reinicia TARS (WSL + backend + frontend)' -ForegroundColor DarkGray
    Write-Host '  - tchau      => encerra todos os serviços e fecha' -ForegroundColor DarkGray
  } else {
    Write-Host 'Inicializando módulos... monitorando processos e portas.' -ForegroundColor DarkYellow
  }

  # prompt visual
  Write-Host ''
  Write-Host ''
Write-Host '> reinicia / tchau' -ForegroundColor DarkGray
Write-Host ('> ' + $inputBuffer) -NoNewline

  Start-Sleep -Milliseconds 1000
}

Write-Host ''
Write-Host '[HUD] encerrado.' -ForegroundColor DarkGray
