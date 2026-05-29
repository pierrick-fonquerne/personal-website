<#
.SYNOPSIS
Build and deploy the personal website to the production VPS.

.DESCRIPTION
Runs `npm run build`, packs `dist/` as a gzipped tarball, ships it to the VPS
via SCP, then runs a remote shell script that extracts the archive into a new
directory, swaps the live document root atomically with `mv`, and purges the
previous version. Verifies the public URL responds at the end.

This avoids rsync on Windows entirely, which is fragile due to MSYS2/OpenSSH
interactions on the protocol stream. tar + scp + ssh are all native on
Windows 10+ and Debian.

Prerequisites:
- Node.js 22.12+ and npm in PATH
- OpenSSH client (Windows 10+ ships it natively)
- tar (Windows 10+ ships bsdtar as tar.exe)
- An SSH alias resolved by ~/.ssh/config that points to the target VPS, e.g.

    Host perso-vps
        HostName <ip>
        User debian
        IdentityFile ~/.ssh/<key>
        IdentitiesOnly yes

- On the VPS: rsync NOT required, but `sudo` must be passwordless for the
  deploy user, nginx must serve `RemoteRoot`, and the deploy user must be in
  group `www-data` (or own `RemoteRoot`).

.PARAMETER SkipBuild
Skip `npm run build` and reuse the existing `dist/`.

.PARAMETER SshAlias
SSH alias used to reach the VPS (declared in `~/.ssh/config`).

.PARAMETER RemoteRoot
Absolute path of the document root on the VPS.

.PARAMETER PublicUrl
HTTPS URL hit after deploy to confirm the site responds.

.EXAMPLE
.\scripts\deploy.ps1
Full build + deploy.

.EXAMPLE
.\scripts\deploy.ps1 -SkipBuild
Reuse the last build and redeploy only.
#>
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [string]$SshAlias = 'perso-vps',
    [string]$RemoteRoot = '/var/www/pierrick.fonquerne.com',
    [string]$PublicUrl = 'https://pierrick.fonquerne.com'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

# Load production env vars (PUBLIC_UMAMI_WEBSITE_ID, PUBLIC_UMAMI_URL, etc.)
$envProduction = Join-Path $repoRoot '.env.production'
if (Test-Path $envProduction) {
    Write-Step 'Chargement .env.production'
    Get-Content $envProduction | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $key   = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            Write-Host "    $key=***"
        }
    }
}

$indexHtml = Join-Path $repoRoot 'dist\index.html'

if (-not $SkipBuild) {
    Write-Step 'Build Astro (npm run build)'
    if (Test-Path $indexHtml) { Remove-Item $indexHtml -Force }
    npm run build
    if (-not (Test-Path $indexHtml)) {
        throw "Build a echoue: dist\index.html non produit (exit code npm: $LASTEXITCODE)"
    }
}

if (-not (Test-Path $indexHtml)) {
    throw "dist\index.html introuvable, SkipBuild sans build prealable"
}

$stamp        = Get-Date -Format 'yyyyMMdd-HHmmss'
$tarball      = Join-Path $env:TEMP "perso-$stamp.tar.gz"
$scriptFile   = Join-Path $env:TEMP "perso-deploy-$stamp.sh"
$remoteTar    = "/tmp/perso-$stamp.tar.gz"
$remoteScript = "/tmp/perso-deploy-$stamp.sh"

Write-Step "Archive locale: $tarball"
& tar.exe -czf $tarball -C 'dist' '.'
if ($LASTEXITCODE -ne 0) { throw 'tar a echoue' }

$sizeMb = [math]::Round((Get-Item $tarball).Length / 1MB, 2)
Write-Host "    Taille: $sizeMb Mo"

$bashScript = @'
#!/usr/bin/env bash
set -euo pipefail
REMOTEROOT="__REMOTEROOT__"
STAMP="__STAMP__"
REMOTE_TAR="__REMOTE_TAR__"
NEW="${REMOTEROOT}.new-${STAMP}"
OLD="${REMOTEROOT}.old-${STAMP}"

sudo rm -rf "$NEW"
sudo mkdir -p "$NEW"
sudo tar -xzf "$REMOTE_TAR" -C "$NEW"
sudo find "$NEW" -type d -exec chmod 755 {} +
sudo find "$NEW" -type f -exec chmod 644 {} +
sudo chown -R debian:www-data "$NEW"

if [ -d "$REMOTEROOT" ]; then
    sudo mv "$REMOTEROOT" "$OLD"
fi
sudo mv "$NEW" "$REMOTEROOT"
sudo rm -rf "$OLD"
sudo rm -f "$REMOTE_TAR"
echo "deploy ok"
'@
$bashScript = $bashScript.
    Replace('__REMOTEROOT__', $RemoteRoot).
    Replace('__STAMP__',       $stamp).
    Replace('__REMOTE_TAR__',  $remoteTar)

[System.IO.File]::WriteAllText(
    $scriptFile,
    $bashScript,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Step "SCP archive vers ${SshAlias}:${remoteTar}"
scp $tarball "${SshAlias}:${remoteTar}"
if ($LASTEXITCODE -ne 0) { throw 'scp tarball a echoue' }

Write-Step "SCP script vers ${SshAlias}:${remoteScript}"
scp $scriptFile "${SshAlias}:${remoteScript}"
if ($LASTEXITCODE -ne 0) { throw 'scp script a echoue' }

Write-Step 'Execution distante (extraction et bascule atomique)'
ssh $SshAlias "bash $remoteScript && rm -f $remoteScript"
if ($LASTEXITCODE -ne 0) { throw 'Deploiement distant a echoue' }

Write-Step 'Nettoyage local'
Remove-Item $tarball, $scriptFile -Force

Write-Step "Verification ${PublicUrl}"
$head = & curl.exe -sI $PublicUrl 2>$null
if ($head) {
    $status = ($head -split "`r?`n")[0]
    Write-Host "    $status"
} else {
    Write-Host '    pas de reponse, verifier DNS et certificat'
}

Write-Host ''
Write-Host "Deploiement OK -> ${PublicUrl}" -ForegroundColor Green
