param(
  [string]$TaskName = 'AI Agent Daily Collect',
  [string]$Time = '08:00'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $root 'run-collect.bat'

if (-not (Test-Path -LiteralPath $runner)) {
  Write-Error "Collection runner not found: $runner"
  exit 1
}

try {
  $actionArguments = '/c ""{0}""' -f $runner
  $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $actionArguments -WorkingDirectory $root
  $trigger = New-ScheduledTaskTrigger -Daily -At $Time
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -WakeToRun `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Collect, save, summarize, and email the local AI daily report.' -Force | Out-Null
  Write-Host "Scheduled task '$TaskName' is ready. It runs daily at $Time."
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
