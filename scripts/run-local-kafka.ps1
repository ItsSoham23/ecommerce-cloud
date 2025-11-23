<#
run-local-kafka.ps1

Starts a simple local Kafka (Zookeeper + Kafka) using Bitnami Docker images.
This is intended for local development with `kind` clusters running on Docker Desktop.
The Kafka broker will advertise itself as `host.docker.internal:9092` so pods in kind
can reach the broker at that address.

Usage:
  .\run-local-kafka.ps1           # create network and start containers
  .\run-local-kafka.ps1 stop      # stops and removes containers (keeps network)
  .\run-local-kafka.ps1 clean     # stops and removes containers and network
#>
param(
    [string]$Action = 'start'
)

function Ensure-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker CLI not found in PATH. Install Docker Desktop and retry."
        exit 1
    }
}

function Start-Kafka {
    $networkName = 'local-kafka-net'

    # create network if it doesn't exist
    $existing = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$networkName$"
    if (-not $existing) {
        docker network create $networkName | Out-Null
        Write-Host "Created docker network: $networkName"
    } else {
        Write-Host "Docker network $networkName already exists"
    }

    # start zookeeper
    $zk = docker ps --filter "name=^local-zookeeper$" --format "{{.Names}}"
    if (-not $zk) {
        docker run -d --name local-zookeeper --network $networkName `
          -e ZOOKEEPER_CLIENT_PORT=2181 `
          -e ZOOKEEPER_TICK_TIME=2000 `
          confluentinc/cp-zookeeper:7.4.0 | Out-Null
        Write-Host "Started local-zookeeper (confluentinc/cp-zookeeper:7.4.0)"
    } else {
        Write-Host "local-zookeeper already running"
    }

    # start kafka
    $k = docker ps --filter "name=^local-kafka$" --format "{{.Names}}"
    if (-not $k) {
        docker run -d --name local-kafka --network $networkName `
          -e KAFKA_BROKER_ID=1 `
          -e KAFKA_ZOOKEEPER_CONNECT=local-zookeeper:2181 `
          -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092 `
          -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://host.docker.internal:9092 `
          -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
          -p 9092:9092 `
          confluentinc/cp-kafka:7.4.0 | Out-Null
        Write-Host "Started local-kafka (confluentinc/cp-kafka:7.4.0, advertised as host.docker.internal:9092)"
    } else {
        Write-Host "local-kafka already running"
    }

    Write-Host "Local Kafka should be reachable at host.docker.internal:9092"
}

function Stop-Kafka {
    $names = @('local-kafka','local-zookeeper')
    foreach ($n in $names) {
        $id = docker ps -a --filter "name=^$n$" --format "{{.ID}}"
        if ($id) {
            docker rm -f $n | Out-Null
            Write-Host "Removed container $n"
        }
    }
}

function Clean-Kafka {
    Stop-Kafka
    $networkName = 'local-kafka-net'
    $exists = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$networkName$"
    if ($exists) {
        docker network rm $networkName | Out-Null
        Write-Host "Removed network $networkName"
    }
}

Ensure-Docker

switch ($Action.ToLower()) {
    'start' { Start-Kafka }
    'stop'  { Stop-Kafka }
    'clean' { Clean-Kafka }
    default { Write-Error "Unknown action: $Action. Use start|stop|clean."; exit 2 }
}

exit 0
