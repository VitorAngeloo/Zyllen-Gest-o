#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$apiDirectory = Split-Path -Parent $PSScriptRoot
$repositoryDirectory = Split-Path -Parent (Split-Path -Parent $apiDirectory)
$startupScript = Join-Path $PSScriptRoot 'start-production.ps1'
$taskName = 'Zyllen API Production Recovery'
$powershellExecutable = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskArguments = '-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $startupScript
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()

if (-not (Test-Path -LiteralPath $startupScript -PathType Leaf)) {
    throw 'Iniciador de producao ausente.'
}

$existingTask = Get-ScheduledTask -TaskName $taskName -TaskPath '\' -ErrorAction SilentlyContinue
if ($existingTask) {
    $existingActions = @($existingTask.Actions)
    $existingUser = New-Object System.Security.Principal.NTAccount($existingTask.Principal.UserId)
    $existingUserSid = $existingUser.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if ($existingActions.Count -ne 1 -or
        $existingActions[0].Execute -ne $powershellExecutable -or
        $existingActions[0].Arguments -ne $taskArguments -or
        $existingActions[0].WorkingDirectory -ne $repositoryDirectory -or
        $existingUserSid -ne $identity.User.Value) {
        throw 'Ja existe uma tarefa diferente com esse nome. Revisar antes de substituir.'
    }
}

$action = New-ScheduledTaskAction -Execute $powershellExecutable `
    -Argument $taskArguments -WorkingDirectory $repositoryDirectory
$triggers = @(
    (New-ScheduledTaskTrigger -AtLogOn -User $identity.Name),
    (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
        -RepetitionInterval (New-TimeSpan -Minutes 1))
)
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
# No execution deadline: Task Scheduler must never terminate the API child.
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -TaskPath '\' -Action $action `
    -Trigger $triggers -Principal $principal -Settings $settings `
    -Description 'Verifica a API publicada a cada minuto enquanto este usuario estiver conectado. Respeita apps/api/.production-maintenance.' `
    -Force | Out-Null

Write-Output ('Recuperacao automatica registrada: ' + $taskName)
