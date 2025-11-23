<#
.SYNOPSIS
Helper that exercises the AWS MSK -> GCP Dataproc pipeline and optionally performs a short load test.
.DESCRIPTION
Ensures the AWS CLI can resolve the Kafka bootstrap brokers, composes the gcloud dataproc job submission that matches the CronJob trigger, and optionally submits the job (pass -Execute). Use the parameters to reuse the same values ArgoCD injects into the CronJob so you can confirm operators can talk to both clouds before relying on automation.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$GcpProject,

    [Parameter(Mandatory = $true)]
    [string]$DataprocCluster,

    [Parameter(Mandatory = $true)]
    [string]$FlinkJobUri,

    [Parameter(Mandatory = $true)]
    [string]$ResultsBucket,

    [Parameter(Mandatory = $true)]
    [string]$FirestoreCollection,

    [Parameter(Mandatory = $true)]
    [string]$CloudSqlPrivateIp,

    [Parameter(Mandatory = $true)]
    [string]$CloudSqlUser,

    [Parameter(Mandatory = $true)]
    [string]$CloudSqlPassword,

    [Parameter(Mandatory = $true)]
    [string]$KafkaBootstrapServers,

    [Parameter(Mandatory = $false)]
    [string]$KafkaTopic = 'product-images.processed',

    [Parameter(Mandatory = $false)]
    [string]$KafkaGroup = 'flink-analytics-group',

    [Parameter(Mandatory = $false)]
    [string]$GcpRegion = 'us-central1',

    [Parameter(Mandatory = $false)]
    [string]$AwsRegion = 'us-east-1',

    [string]$MskClusterArn,

    [Switch]$Execute,

    [Switch]$SkipAwsCheck
)

Set-StrictMode -Version Latest

function Assert-Command([string]$name) {
    if (-not (Get-Command -Name $name -ErrorAction SilentlyContinue)) {
        throw "`$name` is required on PATH. Install it before running this script."
    }
}

Assert-Command 'gcloud'
Assert-Command 'aws'

if ($MskClusterArn -and (-not $SkipAwsCheck)) {
    Write-Host "Resolving MSK bootstrap brokers for ARN $MskClusterArn"
    $msk = aws kafka get-bootstrap-brokers --cluster-arn $MskClusterArn --region $AwsRegion | ConvertFrom-Json
    if (-not $msk.BootstrapBrokerStringTls) {
        throw "Failed to read TLS bootstrap brokers from MSK ARN $MskClusterArn"
    }
    Write-Host "MSK bootstrap brokers: $($msk.BootstrapBrokerStringTls)"
}

$flinkArgs = @(
    'dataproc',
    'jobs',
    'submit',
    'flink',
    '--cluster',
    $DataprocCluster,
    '--region',
    $GcpRegion,
    '--py-files',
    $FlinkJobUri,
    '--'
)

$flinkArgs += @(
    '--kafka_bootstrap_servers',
    $KafkaBootstrapServers,
    '--kafka_topic',
    $KafkaTopic,
    '--results_bucket',
    $ResultsBucket,
    '--firestore_collection',
    $FirestoreCollection,
    '--cloud_sql_private_ip',
    $CloudSqlPrivateIp,
    '--cloud_sql_user',
    $CloudSqlUser,
    '--cloud_sql_password',
    $CloudSqlPassword,
    '--project_id',
    $GcpProject,
    '--firestore_project',
    $GcpProject,
    '--window_minutes',
    '1',
    '--kafka_group',
    $KafkaGroup
)

Write-Host "Prepared Dataproc submission using project $GcpProject and cluster $DataprocCluster"
Write-Host "The job argument list is:`n$($flinkArgs -join ' ')"

if ($Execute) {
    Write-Host "Submitting Flink job to Dataproc..."
    & gcloud @flinkArgs
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud dataproc job submission failed"
    }
    Write-Host "Job submission completed."
} else {
    Write-Host "Dry run mode. Repeat with -Execute to submit to Dataproc."
}
