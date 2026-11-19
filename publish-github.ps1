# Publishes SecureBlue Chat to GitHub and turns on its F-Droid repository.
#
# Prerequisites:
#   * git (already installed)
#   * GitHub CLI, logged in with the workflow scope:
#       gh auth login --scopes repo,workflow
#
# Usage:
#   .\publish-github.ps1                    # repo name: securebluechat
#   .\publish-github.ps1 -RepoName other    # different name
#   .\publish-github.ps1 -SkipWorkflow      # push + secrets only

[CmdletBinding()]
param(
    [string]$RepoName = 'securebluechat',
    [switch]$SkipWorkflow
)

# Native tools (git, gh) write progress and errors to stderr, which PowerShell
# 5.1 would turn into terminating errors under 'Stop'. Every step below checks
# $LASTEXITCODE and calls Fail() explicitly instead.
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

function Fail([string]$Message) {
    Write-Host "x $Message" -ForegroundColor Red
    exit 1
}

function Step([string]$Message) {
    Write-Host "`n> $Message" -ForegroundColor Cyan
}

# ---------------------------------------------------------------- preflight
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git not found.' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Fail 'GitHub CLI not found. Install it, then run: gh auth login --scopes repo,workflow'
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Not logged in. Run: gh auth login --scopes repo,workflow' }

$owner = (gh api user -q .login | Out-String).Trim()
if (-not $owner) { Fail 'Could not read the GitHub account from gh.' }
$full = "$owner/$RepoName"
Write-Host "GitHub account: $owner" -ForegroundColor Green
Write-Host "Target repo:    https://github.com/$full"

$secretDir = Join-Path $PSScriptRoot 'release-signing'
foreach ($f in @('secret-android-keystore-base64.txt', 'secret-fdroid-keystore-base64.txt', 'credentials.txt')) {
    if (-not (Test-Path (Join-Path $secretDir $f))) {
        Fail "Missing release-signing\$f - the signing keys are required."
    }
}

# ---------------------------------------------------------------- 1. repo
Step 'Creating the repository (if needed)'
gh repo view $full *> $null
if ($LASTEXITCODE -ne 0) {
    gh repo create $full --public --source . --remote origin --push
    if ($LASTEXITCODE -ne 0) { Fail 'Could not create the repository.' }
} else {
    $origin = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $origin) {
        git remote add origin "https://github.com/$full.git"
    }
    git push -u origin main
    if ($LASTEXITCODE -ne 0) { Fail 'Could not push main.' }
}

# ---------------------------------------------------------------- 2. secrets
Step 'Uploading signing secrets'
$base64Map = [ordered]@{
    APP_KEYSTORE_BASE64  = 'secret-android-keystore-base64.txt'
    REPO_KEYSTORE_BASE64 = 'secret-fdroid-keystore-base64.txt'
}
foreach ($name in $base64Map.Keys) {
    $value = (Get-Content (Join-Path $secretDir $base64Map[$name]) -Raw).Trim()
    gh secret set $name --repo $full --body $value
    if ($LASTEXITCODE -ne 0) { Fail "Could not set secret $name." }
}

$cred = Get-Content (Join-Path $secretDir 'credentials.txt')
$appPass = (($cred | Where-Object { $_ -like 'APP_KEYSTORE_PASSWORD=*' }) -replace '^APP_KEYSTORE_PASSWORD=', '').Trim()
$repoPass = (($cred | Where-Object { $_ -like 'REPO_KEYSTORE_PASSWORD=*' }) -replace '^REPO_KEYSTORE_PASSWORD=', '').Trim()
if (-not $appPass -or -not $repoPass) { Fail 'Could not read passwords from credentials.txt.' }
gh secret set APP_KEYSTORE_PASSWORD --repo $full --body $appPass
gh secret set REPO_KEYSTORE_PASSWORD --repo $full --body $repoPass
if ($LASTEXITCODE -ne 0) { Fail 'Could not set the password secrets.' }

# The workflow pushes to gh-pages with GITHUB_TOKEN, which needs write access.
Step 'Allowing the workflow token to write'
gh api -X PUT "repos/$full/actions/permissions/workflow" `
    -f default_workflow_permissions=write *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host '  (could not change the default; set Settings > Actions > Workflow permissions manually)' -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 3. tag
Step 'Pushing the v1.0 tag (starts the build)'
$remoteTag = git ls-remote --tags origin v1.0 2>$null
if (-not $remoteTag) {
    git push origin v1.0
    if ($LASTEXITCODE -ne 0) { Fail 'Could not push the tag.' }
} else {
    Write-Host '  tag already on the remote, skipping'
}

if ($SkipWorkflow) {
    Write-Host "`nPushed. Run the workflow from the Actions tab when ready." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------- 4. wait
Step 'Waiting for the build'
Start-Sleep -Seconds 5
$runId = $null
for ($i = 0; $i -lt 10 -and -not $runId; $i++) {
    $runId = (gh run list --repo $full --limit 1 --json databaseId -q '.[0].databaseId' | Out-String).Trim()
    if (-not $runId) { Start-Sleep -Seconds 6 }
}
if (-not $runId) { Fail 'No workflow run appeared. Open the Actions tab and check.' }

$status = ''
for ($i = 0; $i -lt 80; $i++) {
    # Parse JSON in PowerShell: gh's jq expressions with quotes get mangled by
    # PowerShell 5.1's native-argument quoting.
    $info = gh run view $runId --repo $full --json status,conclusion | ConvertFrom-Json
    $status = "$($info.status) $($info.conclusion)".Trim()
    if ($status -like 'completed*') { break }
    Start-Sleep -Seconds 15
}
Write-Host "  run $runId finished: $status"
if ($status -notlike 'completed success*') {
    gh run view $runId --repo $full --log-failed
    Fail "Build failed. Full log: https://github.com/$full/actions/runs/$runId"
}

# ---------------------------------------------------------------- 5. pages
Step 'Enabling GitHub Pages'
$pagesBody = '{"source":{"branch":"gh-pages","path":"/"}}'
gh api "repos/$full/pages" *> $null
if ($LASTEXITCODE -eq 0) {
    $pagesBody | gh api -X PUT "repos/$full/pages" --input - *> $null
} else {
    $pagesBody | gh api -X POST "repos/$full/pages" --input - *> $null
}
if ($LASTEXITCODE -ne 0) {
    Write-Host '  could not configure Pages automatically; do it in Settings > Pages (branch gh-pages / root)' -ForegroundColor Yellow
}

$site = "https://$($owner.ToLower()).github.io/$RepoName"
Write-Host "`nDone." -ForegroundColor Green
Write-Host "Repository : https://github.com/$full"
Write-Host "Landing    : $site/"
Write-Host "F-Droid URL: $site/repo"
Write-Host "Add the F-Droid URL in F-Droid under Settings > Repositories."
Write-Host 'Pages can take a minute to go live; index-v1.jar appears at the F-Droid URL.'
