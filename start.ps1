param(
  [int]$Port = 3000
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path '.env.local')) {
  if (Test-Path '.env.local.example') {
    Copy-Item '.env.local.example' '.env.local' -Force
  }
}

$resolvedRoot = (Resolve-Path -LiteralPath $root).Path
$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

foreach ($listener in $listeners) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($process -and $process.CommandLine -like "*$resolvedRoot*") {
    Write-Host "Stopping the previous project process on port $Port..."
    & taskkill.exe /PID $listener.OwningProcess /T /F *> $null
  } elseif ($process) {
    Write-Error "Port $Port is occupied by another program (PID $($listener.OwningProcess))."
    exit 1
  }
}

$deadline = (Get-Date).AddSeconds(8)
do {
  $remaining = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $remaining) { break }
  Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)

if ($remaining) {
  Write-Error "Could not release port $Port. Stop PID $($remaining.OwningProcess) and try again."
  exit 1
}

$devCachePath = Join-Path $resolvedRoot '.next-dev'
if (Test-Path -LiteralPath $devCachePath) {
  $resolvedDevCache = (Resolve-Path -LiteralPath $devCachePath).Path
  if ($resolvedDevCache.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedDevCache -Recurse -Force
  }
}

Write-Host "Starting app at http://127.0.0.1:$Port"
Write-Host 'Keep this window open while using the project.'
& "$resolvedRoot\node_modules\.bin\next.cmd" dev --hostname 0.0.0.0 --port $Port
