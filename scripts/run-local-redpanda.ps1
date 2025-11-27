<#
Starts/stops a local Redpanda broker for development. Intended for Docker Desktop on Windows.

Usage:
  .\scripts\run-local-redpanda.ps1 start
  .\scripts\run-local-redpanda.ps1 stop
  .\scripts\run-local-redpanda.ps1 clean

This advertises the broker as host.docker.internal:9092 so in-cluster pods
using an ExternalName service `kafka` -> host.docker.internal can reach it.
#>

param(
    [string]$Action = 'start'
)

function Start-Redpanda {
    Write-Host "Starting local Redpanda broker..."
    $existing = (docker ps -a --filter "name=^local-redpanda$" --format "{{.Names}}")
    if ($existing -ne '') {
        Write-Host "Container 'local-redpanda' already exists. Stopping and removing..."
        docker rm -f local-redpanda | Out-Null
    }

    docker run -d --name local-redpanda -p 9092:9092 vectorized/redpanda:latest `
        redpanda start --overprovisioned --smp 1 --memory 1G --reserve-memory 0M `
        --kafka-addr PLAINTEXT://0.0.0.0:9092 --advertise-kafka-addr PLAINTEXT://host.docker.internal:9092 | Out-Null

    Start-Sleep -Seconds 2
    $status = docker ps --filter "name=local-redpanda" --format "{{.Names}}: {{.Status}}"
    if ($status) { Write-Host "Redpanda started:`n$status" } else { Write-Host "Failed to start Redpanda. Check 'docker ps -a' for details." }
}

function Stop-Redpanda {
    Write-Host "Stopping local Redpanda container if running..."
    docker stop local-redpanda 2>$null | Out-Null
}

function Clean-Redpanda {
    Write-Host "Removing local Redpanda container if present..."
    docker rm -f local-redpanda 2>$null | Out-Null
}

switch ($Action.ToLower()) {
    'start' { Start-Redpanda }
    'stop'  { Stop-Redpanda }
    'clean' { Clean-Redpanda }
    default { Write-Host "Usage: .\scripts\run-local-redpanda.ps1 start|stop|clean" }
}
