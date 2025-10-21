# ===============================
# start_wsl.ps1   (FINAL - LONG RETRY, fixed cold-start)
# ===============================

#region Banner
Write-Host "`n----------------------------------------" -ForegroundColor Gray
Write-Host "   W S L   I N I T I A L I Z E R" -ForegroundColor Yellow
Write-Host "----------------------------------------`n" -ForegroundColor Gray
#endregion

# Distro fixa, conforme confirmação do usuário
$distro = "Ubuntu"

# Força cold-start sempre, antes de qualquer validação
Write-Host " -> WSL: cold start" -ForegroundColor DarkGray
wsl.exe -d $distro -- echo wake > $null 2>&1

# Função para esperar WSL ficar realmente responsivo
function Wait-ForWSL([string]$d) {
    for ($i = 1; $i -le 20; $i++) {
        try {
            $res = wsl.exe -d $d -- /bin/bash -lc "echo READY" 2>$null
            if ($LASTEXITCODE -eq 0) { return $true }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# Confere readiness
if (-not (Wait-ForWSL $distro)) {
    Write-Host " -> WSL não acordou a tempo (timeout)." -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

Write-Host " -> State: RUNNING" -ForegroundColor Green

# Garante ~/start_ha.sh
$ensureScript = @'
set -e
if [ ! -f "$HOME/start_ha.sh" ]; then
  cat > "$HOME/start_ha.sh" << 'EOS'
#!/usr/bin/env bash
set -e
echo "[HA] start_ha.sh (template) — personalize este arquivo no WSL: ~/start_ha.sh"
EOS
  chmod +x "$HOME/start_ha.sh"
fi
'@

wsl.exe -d $distro -- /bin/bash -lc "$ensureScript" | Out-Null

# Executa o serviço em si
Write-Host " -> Executando start_ha.sh.............RUN" -ForegroundColor Green
wsl.exe -d $distro -- /bin/bash -lc "cd ~ && ./start_ha.sh"

Write-Host "[WSL] Processo iniciado. Logs acima." -ForegroundColor Green
# ===============================
