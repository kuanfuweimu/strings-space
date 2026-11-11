param([string]$Query = 'w=3840&h=2160&fps=60&secs=10&scenes=all')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profile = Join-Path $env:TEMP 'strings-export-profile'
$env:EXIT_ON_DONE = '1'
$c = Start-Process $chrome -PassThru -ArgumentList @('--headless=new', "--user-data-dir=$profile", '--no-first-run', '--ignore-gpu-blocklist',
  '--use-angle=d3d11', '--force_high_performance_gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--window-size=1280,720', "http://localhost:8787/?render=1&$Query")
try { node server.js } finally {
  Stop-Process -Id $c.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep 1
  Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
}
