# terraform/gcp/outputs.tf

output "gcp_project_id" {
  description = "GCP Project ID"
  value       = var.gcp_project_id
}

output "gcp_region" {
  description = "GCP Region"
  value       = var.gcp_region
}

output "vpc_network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "vpc_network_id" {
  description = "ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "submit_flink_job_command" {
  description = "Command to submit Flink job to Dataproc"
  value       = <<-EOT
    gcloud dataproc jobs submit flink \
      --cluster=${google_dataproc_cluster.flink_cluster.name} \
      --region=${var.gcp_region} \
      --jar=gs://${google_storage_bucket.dataproc_staging.name}/jars/your-flink-job.jar \
      --properties=env.java.opts=-DKAFKA_BOOTSTRAP_SERVERS=<YOUR_MSK_BROKERS>
  EOT
}