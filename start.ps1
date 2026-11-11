# Starts the local server and opens output + control in Chrome (or Edge) with a dedicated profile
# where Web MIDI is pre-allowed for http://localhost:8787, so the Launch Control connects without prompts.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$url = 'http://localhost:8787'
$browser = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
             "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
           Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { Write-Host 'Chrome / Edge not found'; exit 1 }
$profile = Join-Path $PSScriptRoot 'browser-profile'
$prefs = Join-Path $profile 'Default\Preferences'
if (-not (Test-Path $prefs)) {
  New-Item -ItemType Directory -Force (Split-Path $prefs) | Out-Null
  $allow = @{ "$url,*" = @{ setting = 1 } }
  @{ profile = @{ content_settings = @{ exceptions = @{ midi = $allow; midi_sysex = $allow } } } } | ConvertTo-Json -Depth 8 | Set-Content -Encoding ascii $prefs
}
$up = $false; try { Invoke-WebRequest "$url/control.html" -UseBasicParsing -TimeoutSec 1 | Out-Null; $up = $true } catch {}
if (-not $up) { Start-Process node -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Minimized; Start-Sleep 1 }
$common = @("--user-data-dir=$profile", '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required')
Start-Process $browser -ArgumentList ($common + @("--app=$url/control.html", '--window-size=1180,1000', '--window-position=40,20'))
Start-Sleep -Milliseconds 800
Start-Process $browser -ArgumentList ($common + @("--app=$url/", '--window-size=1280,720', '--window-position=200,120'))
