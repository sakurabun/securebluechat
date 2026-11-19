# Installs the debug APK on every Android phone connected over USB.
# Usage:  .\install-apk.ps1
# Requires: adb on PATH (Android SDK platform-tools), USB debugging enabled.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$apk = Join-Path $root 'app\build\outputs\apk\debug\app-debug.apk'

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    throw 'adb not found. Add platform-tools to PATH (or run from Android Studio).'
}

if (-not (Test-Path $apk)) {
    Write-Host 'APK missing, building it first...' -ForegroundColor Yellow
    Push-Location $root
    & .\gradlew.bat assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Gradle build failed.' }
    Pop-Location
}

$devices = @()
& adb devices | Select-Object -Skip 1 | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^(\S+)\s+(device|unauthorized|offline)$') {
        $devices += [pscustomobject]@{ Serial = $matches[1]; State = $matches[2] }
    }
}

if ($devices.Count -eq 0) {
    Write-Host 'No phone detected.' -ForegroundColor Yellow
    Write-Host 'Checklist: USB debugging on, cable is a data cable, tap "Allow" on the phone prompt.'
    exit 1
}

$ready = @($devices | Where-Object { $_.State -eq 'device' })
foreach ($d in $devices | Where-Object { $_.State -ne 'device' }) {
    Write-Host ("{0} is {1} - unlock the phone and accept the USB debugging prompt." -f $d.Serial, $d.State) -ForegroundColor Yellow
}

foreach ($d in $ready) {
    $model = (& adb -s $d.Serial shell getprop ro.product.model) -join ''
    $model = $model.Trim()
    if (-not $model) { $model = 'Android device' }
    Write-Host ("Installing on {0} ({1})..." -f $model, $d.Serial) -ForegroundColor Cyan
    & adb -s $d.Serial install -r $apk
}

if ($ready.Count -eq 0) { exit 1 }
Write-Host 'Done. Open "SecureBlue Chat" on the phone(s).' -ForegroundColor Green
