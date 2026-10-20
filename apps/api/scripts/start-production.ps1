#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

# Start only the published API. Builds and Prisma generation are manual operations.
$apiDirectory = Split-Path -Parent $PSScriptRoot
$entryPoint = Join-Path $apiDirectory 'dist/main.js'
$startupMutex = New-Object System.Threading.Mutex -ArgumentList $false, 'Local\ZyllenApiProductionStartup'
$ownsMutex = $false

try {
    $ownsMutex = $startupMutex.WaitOne(0)
    if (-not $ownsMutex) { return }

    # Deployments pause both the login launcher and the scheduled recovery task.
    if (Test-Path -LiteralPath (Join-Path $apiDirectory '.production-maintenance') -PathType Leaf) {
        Write-Output 'Inicializacao automatica pausada para manutencao.'
        return
    }

    $listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener) {
        $owner = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.OwningProcess)
        if ($owner.Name -eq 'node.exe' -and $owner.CommandLine -match 'dist[\\/]main\.js\b') {
            Write-Output ('API de producao ja esta em execucao. PID: ' + $owner.ProcessId)
            return
        }
        throw 'A porta 3001 esta ocupada por outro processo. Nenhum processo foi encerrado.'
    }

    if (-not (Test-Path -LiteralPath $entryPoint -PathType Leaf)) {
        throw 'Artefato dist/main.js ausente. Recuperar a versao publicada conforme docs/instrucoes/implantacao.md.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $apiDirectory '.env') -PathType Leaf)) {
        throw 'Configuracao apps/api/.env ausente.'
    }

    $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
    $logDirectory = Join-Path $env:LOCALAPPDATA 'Zyllen/logs/api'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $runName = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $outputLog = Join-Path $logDirectory ($runName + '-out.log')
    $errorLog = Join-Path $logDirectory ($runName + '-err.log')

    $env:NODE_ENV = 'production'
    $apiProcess = Start-Process -FilePath $nodeExecutable `
        -ArgumentList '--enable-source-maps', ('"{0}"' -f $entryPoint) `
        -WorkingDirectory $apiDirectory `
        -RedirectStandardOutput $outputLog `
        -RedirectStandardError $errorLog `
        -WindowStyle Hidden -PassThru

    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        $apiProcess.Refresh()
        if ($apiProcess.HasExited) {
            throw ('A API encerrou durante a inicializacao. Consultar: ' + $errorLog)
        }
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 2
            if ($health.status -eq 'ok') {
                Write-Output ('API de producao iniciada. PID: ' + $apiProcess.Id)
                return
            }
        } catch {
            # The listener becomes available after database/storage initialization.
        }
        Start-Sleep -Seconds 1
    }
    throw ('A API ainda nao confirmou a saude. Consultar: ' + $outputLog + ' e ' + $errorLog)
} finally {
    if ($ownsMutex) { $startupMutex.ReleaseMutex() }
    $startupMutex.Dispose()
}
