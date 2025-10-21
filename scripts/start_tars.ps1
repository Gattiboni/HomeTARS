# ===============================
# start_tars.ps1   (FINAL v3 - backend + .env + STT preflight via curl.exe)
# ===============================

#region Banner
Write-Host "`n----------------------------------------" -ForegroundColor Gray
Write-Host "    B A C K E N D   S E R V E R" -ForegroundColor Cyan
Write-Host "----------------------------------------`n" -ForegroundColor Gray
#endregion

# Base: este script está em HomeTARS\scripts\
$Root = $PSScriptRoot

# Caminho real do backend: um nível acima
$BackendDirPath = Join-Path $Root "..\backend"
try {
    $BackendDir = Resolve-Path $BackendDirPath -ErrorAction Stop
} catch {
    Write-Host "Backend dir não encontrado: $BackendDirPath" -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# .env do backend
$EnvFile = Join-Path $BackendDir ".env"

function Import-Dotenv([string]$path) {
    if (-not (Test-Path $path)) { return }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        Set-Item "Env:$key" $val | Out-Null
    }
}

# Importa variáveis do .env
Import-Dotenv $EnvFile

# Estados para log
$voice = $env:VOICE_ONLINE
$ws    = $env:WS_DISABLED
$ai    = $env:AI_DISABLED
$key   = $env:OPENAI_API_KEY

# Checagem de variáveis mínimas
if (-not $key -or $key.Trim() -eq "") {
    Write-Host "[ERROR] OPENAI_API_KEY não definida no .env do backend." -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# Log limpo de estados
$voiceStatus = "OFF"
if ($voice -and $voice.ToLower() -in @('1','true','yes')) { $voiceStatus = "ONLINE" }

$wsStatus = "ENABLED"
if ($ws -and $ws.ToLower() -in @('1','true','yes')) { $wsStatus = "DISABLED" }

$aiStatus = "ENABLED"
if ($ai -and $ai.ToLower() -in @('1','true','yes')) { $aiStatus = "DISABLED" }

$keyPrefix = if ($key.Length -ge 8) { $key.Substring(0,8) } else { "(none)" }

Write-Host (" -> Voice {0}" -f $voiceStatus) -ForegroundColor Green
Write-Host (" -> WS:   {0}" -f $wsStatus) -ForegroundColor Green
Write-Host (" -> AI:   {0}" -f $aiStatus) -ForegroundColor Green
Write-Host (" -> Key:  {0}..." -f $keyPrefix) -ForegroundColor DarkGray

# Pré-validação de STT (audio/transcriptions) com curl.exe
# Estratégia:
#  - envia um webm mínimo (bytes de header) para /v1/audio/transcriptions com model=gpt-4o-transcribe
#  - se AUTH ok mas payload ruim -> 400 Bad Request (é o que queremos)
#  - se AUTH falhar -> 401/403 ou body com invalid_api_key -> aborta

# Verifica curl.exe
$curl = (Get-Command curl.exe -ErrorAction SilentlyContinue)
if (-not $curl) {
    Write-Host "[ERROR] curl.exe não encontrado no PATH. Requer Windows 10/11 com curl nativo." -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# Cria dummy webm (cabeçalho EBML bem pequeno)
$TempDir = $env:TEMP
$DummyPath = Join-Path $TempDir "tars_dummy.webm"
# 0x1A45DFA3 é a assinatura EBML do WebM/Matroska
[byte[]]$bytes = 0x1A,0x45,0xDF,0xA3,0x42,0x86,0x81,0x01
[System.IO.File]::WriteAllBytes($DummyPath, $bytes)

# Arquivo para capturar body do curl
$CurlBodyPath = Join-Path $TempDir "tars_stt_preflight_resp.json"

# Chamada
$headers = "Authorization: Bearer $key"
$sttUrl  = "https://api.openai.com/v1/audio/transcriptions"

# -sS silencioso com erros, -o body em arquivo, -w somente o HTTP code em stdout
$httpCode = & $curl.Source -sS -o $CurlBodyPath -w "%{http_code}" -X POST `
    $sttUrl `
    -H $headers `
    -F "model=gpt-4o-transcribe" `
    -F "file=@$DummyPath;type=audio/webm;filename=clip.webm"

# Lê body para inspeção
$respBody = ""
if (Test-Path $CurlBodyPath) {
    $respBody = Get-Content $CurlBodyPath -Raw
}

# Decide
$httpCodeStr = [string]$httpCode
if ($httpCodeStr -eq "400") {
    # AUTH ok (payload ruim esperado)
    Write-Host " -> Key validated (audio/transcriptions)" -ForegroundColor Green
} elseif ($httpCodeStr -eq "401" -or $httpCodeStr -eq "403" -or ($respBody -match "invalid_api_key")) {
    Write-Host "[ERROR] STT preflight: AUTH FAIL" -ForegroundColor Red
    Write-Host "-> key accepted? no" -ForegroundColor Red
    Write-Host "-> scope: audio/transcriptions denied" -ForegroundColor Red
    Write-Host "Backend abortado" -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
} else {
    # Outros códigos: mostra para diagnóstico e aborta por segurança
    Write-Host "[ERROR] STT preflight: resposta inesperada ($httpCodeStr)" -ForegroundColor Red
    if ($respBody) {
        Write-Host $respBody -ForegroundColor DarkYellow
    }
    Write-Host "Backend abortado" -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

# Se chegou aqui, segue com o backend
Set-Location $BackendDir

# Python do venv se existir
$py = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not (Test-Path $py)) { $py = "python" }

Write-Host " -> Starting FastAPI (uvicorn) at http://localhost:8000" -ForegroundColor Cyan
& $py -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
