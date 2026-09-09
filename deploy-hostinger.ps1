<#
.SYNOPSIS
  Builda frontend/ e publica APENAS o conteúdo de frontend/out na branch
  "hostinger", sem alterar a branch atual nem o histórico de main.

.DESCRIPTION
  Fluxo:
    1. Entra em frontend/, roda npm install se node_modules não existir.
    2. Confirma que frontend/.env.production aponta para a API de produção.
    3. Roda npm run build (gera frontend/out via output: "export").
    4. Verifica que o build não contém "localhost:4000" nem "DATABASE_URL".
    5. Cria um git worktree isolado (pasta temporária) para a branch
       "hostinger" — órfã na primeira execução, existente nas seguintes.
    6. Limpa esse worktree e copia só o conteúdo de frontend/out para a raiz.
    7. Valida que não há backend/, frontend/, src/, node_modules ou .env* ali.
    8. Comita (só se houver mudança) e faz push de "hostinger" para origin.
    9. Remove o worktree temporário. A branch atual do repo principal (main)
       nunca é trocada — confirmado no final do script.

.EXAMPLE
  ./deploy-hostinger.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Fail($msg) {
    Write-Host "ERRO: $msg" -ForegroundColor Red
    exit 1
}

# --- 0. Localização e checagens básicas ------------------------------------
$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { Fail "Rode este script de dentro do repositório git." }
Set-Location $repoRoot

$frontendDir  = Join-Path $repoRoot "frontend"
$outDir       = Join-Path $frontendDir "out"
$branchName   = "hostinger"
$worktreePath = Join-Path ([System.IO.Path]::GetTempPath()) "comunidade-hostinger-deploy-$([guid]::NewGuid().ToString('N').Substring(0,8))"

$originalBranch = (git rev-parse --abbrev-ref HEAD)
Write-Step "Branch atual do worktree principal: $originalBranch (não será alterada)"

# --- 1. Build do frontend ---------------------------------------------------
Write-Step "Entrando em frontend/"
Push-Location $frontendDir
try {
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Step "node_modules ausente - rodando npm install"
        npm install
        if ($LASTEXITCODE -ne 0) { Fail "npm install falhou." }
    } else {
        Write-Step "node_modules ja existe - pulando npm install"
    }

    $envProdPath = Join-Path $frontendDir ".env.production"
    if (-not (Test-Path $envProdPath)) {
        Fail "frontend/.env.production nao existe. Deve conter NEXT_PUBLIC_API_URL=https://api.codigoecafe.com"
    }
    $envContent = Get-Content $envProdPath -Raw
    if ($envContent -notmatch "NEXT_PUBLIC_API_URL=https://api\.codigoecafe\.com") {
        Fail "frontend/.env.production nao contem NEXT_PUBLIC_API_URL=https://api.codigoecafe.com. Corrija antes de publicar."
    }

    Write-Step "Rodando npm run build"
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "npm run build falhou." }
}
finally {
    Pop-Location
}

if (-not (Test-Path $outDir)) { Fail "frontend/out nao foi gerado. Confirme que next.config.ts tem output: 'export'." }
if (-not (Test-Path (Join-Path $outDir "index.html"))) { Fail "frontend/out/index.html nao encontrado - build incompleto." }

# --- 2. Sanidade: garantir que nao ha segredos/URLs locais no build --------
Write-Step "Verificando ausencia de segredos e localhost no build"
$localhostHit = Get-ChildItem -Path $outDir -Recurse -File |
    Select-String -Pattern "localhost:4000" -ErrorAction SilentlyContinue
if ($localhostHit) {
    Fail "Encontrado 'localhost:4000' dentro de frontend/out. Abortando publicacao."
}
$dbUrlHit = Get-ChildItem -Path $outDir -Recurse -File |
    Select-String -Pattern "DATABASE_URL" -ErrorAction SilentlyContinue
if ($dbUrlHit) {
    Fail "Encontrado 'DATABASE_URL' dentro de frontend/out. Abortando publicacao."
}

# --- 3. Preparar worktree isolado da branch hostinger ----------------------
Write-Step "Preparando worktree temporario em $worktreePath"
git fetch origin --quiet 2>$null

$remoteRef = git ls-remote --heads origin $branchName
$branchExistsRemote = [bool]$remoteRef
$localRef = git branch --list $branchName
$branchExistsLocal = [bool]$localRef

if ($branchExistsLocal -or $branchExistsRemote) {
    if (-not $branchExistsLocal -and $branchExistsRemote) {
        Write-Step "Branch '$branchName' existe no remoto - criando ref local rastreando origin/$branchName"
        git branch --track $branchName "origin/$branchName" | Out-Null
    }
    Write-Step "Usando worktree com a branch '$branchName' existente"
    git worktree add $worktreePath $branchName
    if ($LASTEXITCODE -ne 0) { Fail "git worktree add falhou." }
}
else {
    Write-Step "Branch '$branchName' nao existe ainda - sera criada como branch orfa"
    git worktree add --detach $worktreePath
    if ($LASTEXITCODE -ne 0) { Fail "git worktree add --detach falhou." }
    Push-Location $worktreePath
    try {
        git checkout --orphan $branchName
        if ($LASTEXITCODE -ne 0) { Fail "git checkout --orphan falhou." }
    } finally {
        Pop-Location
    }
}

# --- 4. Limpar o worktree e copiar so o conteudo de out/ --------------------
try {
    Push-Location $worktreePath

    Write-Step "Limpando conteudo anterior da branch $branchName no worktree"
    $tracked = git ls-files
    if ($tracked) {
        git rm -rf --quiet . | Out-Null
    }
    Get-ChildItem -Path $worktreePath -Force |
        Where-Object { $_.Name -ne ".git" } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Write-Step "Copiando conteudo de frontend/out para a branch $branchName"
    Copy-Item -Path (Join-Path $outDir "*") -Destination $worktreePath -Recurse -Force

    # --- 5. Validacao de seguranca final antes do commit --------------------
    Write-Step "Validando que nao ha caminhos proibidos na branch $branchName"
    $forbiddenPaths = @("backend", "frontend", "node_modules", "src", ".env", ".env.local", ".env.production", ".git-ignored")
    foreach ($p in $forbiddenPaths) {
        if (Test-Path (Join-Path $worktreePath $p)) {
            Fail "Caminho proibido encontrado na branch $branchName : $p - abortando antes do commit."
        }
    }
    if (-not (Test-Path (Join-Path $worktreePath "index.html"))) {
        Fail "index.html nao esta na raiz da branch $branchName apos a copia - abortando."
    }

    Set-Content -Path (Join-Path $worktreePath ".gitignore") -Value "node_modules/`n.env`n.env.*" -Encoding utf8

    git add -A
    $status = git status --porcelain
    if (-not $status) {
        Write-Step "Nada mudou desde o ultimo deploy - nenhum commit necessario."
    } else {
        $commitMsg = "Deploy hostinger: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMsg -q
        if ($LASTEXITCODE -ne 0) { Fail "git commit falhou." }

        Write-Step "Enviando branch $branchName para origin"
        git push -u origin $branchName
        if ($LASTEXITCODE -ne 0) { Fail "git push falhou." }
    }
}
finally {
    Pop-Location
    Write-Step "Removendo worktree temporario"
    git worktree remove $worktreePath --force 2>$null
}

$currentBranchNow = (git rev-parse --abbrev-ref HEAD)
if ($currentBranchNow -ne $originalBranch) {
    Fail "A branch do worktree principal mudou inesperadamente (era $originalBranch, agora e $currentBranchNow)."
}
Write-Step "Confirmado: branch do worktree principal continua '$currentBranchNow'"

Write-Host ""
Write-Host "Deploy concluido. Configure a Hostinger para publicar a branch '$branchName'." -ForegroundColor Green
