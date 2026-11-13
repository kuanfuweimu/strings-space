# Offline export for zline.html (wall 2:1 + floor 1:1). Writes to .\out
# Examples:
#   .\export-zline.ps1                                   # all scenes, 2560x1280 wall + 2048x2048 floor, 60 fps
#   .\export-zline.ps1 -Query 'stills=5,12&ww=1600&fs=1024&tag=still'   # PNG stills only
param([string]$Query = 'fps=60&scenes=all', [int]$Port = 8790)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profile = Join-Path (Split-Path $PSScriptRoot -Parent) '_work\zline-chrome-profile'
$env:EXIT_ON_DONE = '1'; $env:PORT = "$Port"
$c = Start-Process $chrome -PassThru -ArgumentList @('--headless=new', "--user-data-dir=$profile", '--no-first-run', '--ignore-gpu-blocklist',
  '--use-angle=d3d11', '--force_high_performance_gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--window-size=1280,720', "http://localhost:$Port/zline.html?render=1&$Query")
try { node server.js } finally {
  Stop-Process -Id $c.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep 1
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
