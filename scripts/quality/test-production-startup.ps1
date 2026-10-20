#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

# All processes, listeners and health responses are simulated. No database access.
$repositoryDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sandboxDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('zyllen-startup-test-' + [guid]::NewGuid())
$apiDirectory = Join-Path $sandboxDirectory 'api'
$sandboxScripts = Join-Path $apiDirectory 'scripts'
$entryPoint = Join-Path $apiDirectory 'dist/main.js'
$configuration = Join-Path $apiDirectory '.env'
$maintenanceFlag = Join-Path $apiDirectory '.production-maintenance'
$startupScript = Join-Path $sandboxScripts 'start-production.ps1'
$originalLocalAppData = $env:LOCALAPPDATA
$originalNodeEnvironment = $env:NODE_ENV
$passed = 0

New-Item -ItemType Directory -Path $sandboxScripts, (Split-Path -Parent $entryPoint) -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repositoryDirectory 'apps/api/scripts/start-production.ps1') -Destination $startupScript
Set-Content -LiteralPath $entryPoint -Value '// synthetic artifact'
Set-Content -LiteralPath $configuration -Value '# no credentials'
$env:LOCALAPPDATA = Join-Path $sandboxDirectory 'local-app-data'

function Assert-True($condition, [string]$message) {
    if (-not $condition) { throw $message }
}

function Invoke-StartupScenario {
    param(
        [switch]$ExistingApi,
        [switch]$ForeignListener,
        [switch]$ChildExited,
        [switch]$HealthUnavailable,
        [switch]$ExpectError,
        [int]$ExpectedLaunches = 0
    )

    $state = @{ Launches = 0; HealthChecks = 0; Launch = $null }
    function Get-NetTCPConnection {
        [CmdletBinding()]
        param($LocalPort, $State)
        if ($ExistingApi -or $ForeignListener) {
            [pscustomobject]@{ OwningProcess = 12345 }
        }
    }
    function Get-CimInstance {
        [CmdletBinding()]
        param($ClassName, $Filter)
        [pscustomobject]@{
            Name = $(if ($ForeignListener) { 'other.exe' } else { 'node.exe' })
            ProcessId = 12345
            CommandLine = 'node --enable-source-maps dist/main.js'
        }
    }
    function Get-Command {
        [CmdletBinding()]
        param($Name)
        [pscustomobject]@{ Source = 'synthetic-node.exe' }
    }
    function Start-Process {
        [CmdletBinding()]
        param($FilePath, $ArgumentList, $WorkingDirectory, $RedirectStandardOutput,
            $RedirectStandardError, $WindowStyle, [switch]$PassThru)
        $state.Launches++
        $state.Launch = @{
            Arguments = $ArgumentList
            Directory = $WorkingDirectory
            WindowStyle = $WindowStyle
            Environment = $env:NODE_ENV
        }
        $process = [pscustomobject]@{ Id = 12345; HasExited = [bool]$ChildExited }
        $process | Add-Member -MemberType ScriptMethod -Name Refresh -Value { }
        $process
    }
    function Invoke-RestMethod {
        [CmdletBinding()]
        param($Uri, $TimeoutSec)
        $state.HealthChecks++
        if ($HealthUnavailable) { throw 'Synthetic network unavailable' }
        [pscustomobject]@{ status = 'ok' }
    }
    function Start-Sleep { param($Seconds) }

    $failure = $null
    try { & $startupScript | Out-Null } catch { $failure = $_ }
    Assert-True (([bool]$failure) -eq ([bool]$ExpectError)) ('Unexpected result: ' + $failure)
    Assert-True ($state.Launches -eq $ExpectedLaunches) 'Unexpected API launch count'
    if ($state.Launches -gt 0) {
        Assert-True ($state.Launch.Directory -eq $apiDirectory) 'Incorrect working directory'
        Assert-True ($state.Launch.WindowStyle -eq 'Hidden') 'API must start hidden'
        Assert-True ($state.Launch.Environment -eq 'production') 'Incorrect NODE_ENV'
        Assert-True ($state.Launch.Arguments[1] -eq ('"{0}"' -f $entryPoint)) 'Incorrect artifact'
    }
}

try {
    Invoke-StartupScenario -ExistingApi
    $passed++; Write-Output 'PASS: existing production API is preserved'

    Set-Content -LiteralPath $maintenanceFlag -Value 'synthetic maintenance'
    Invoke-StartupScenario
    Remove-Item -LiteralPath $maintenanceFlag
    $passed++; Write-Output 'PASS: maintenance prevents automatic startup'

    Invoke-StartupScenario -ForeignListener -ExpectError
    $passed++; Write-Output 'PASS: unrelated listener is preserved and startup refuses'

    Remove-Item -LiteralPath $entryPoint
    Invoke-StartupScenario -ExpectError
    Set-Content -LiteralPath $entryPoint -Value '// synthetic artifact'
    $passed++; Write-Output 'PASS: missing published artifact prevents startup'

    Remove-Item -LiteralPath $configuration
    Invoke-StartupScenario -ExpectError
    Set-Content -LiteralPath $configuration -Value '# no credentials'
    $passed++; Write-Output 'PASS: missing configuration prevents startup'

    Invoke-StartupScenario -ExpectedLaunches 1
    $passed++; Write-Output 'PASS: fresh startup uses published API in production'

    Invoke-StartupScenario -ChildExited -ExpectError -ExpectedLaunches 1
    Invoke-StartupScenario -ExpectedLaunches 1
    $passed++; Write-Output 'PASS: failed startup can be retried on the next recovery execution'

    Invoke-StartupScenario -HealthUnavailable -ExpectError -ExpectedLaunches 1
    Invoke-StartupScenario -ExistingApi
    $passed++; Write-Output 'PASS: health timeout does not launch a duplicate when the listener appears'

    Write-Output ('Passed: ' + $passed + ' isolated production-startup scenarios')
} finally {
    $env:LOCALAPPDATA = $originalLocalAppData
    $env:NODE_ENV = $originalNodeEnvironment
    $resolvedSandbox = [System.IO.Path]::GetFullPath($sandboxDirectory)
    $temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolvedSandbox.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedSandbox) -like 'zyllen-startup-test-*') {
        Remove-Item -LiteralPath $resolvedSandbox -Recurse -Force
    }
}
