# terraform/gcp/variables.tf

variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
  # You'll need to set this via terraform.tfvars or environment variable
}

variable "gcp_region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "gcp_zone" {
  description = "GCP Zone for resources"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ecommerce"
}

variable "dataproc_master_machine_type" {
  description = "Machine type for Dataproc master node"
  type        = string
  default     = "n1-standard-2"  # Smallest for Flink
}

variable "dataproc_worker_machine_type" {
  description = "Machine type for Dataproc worker nodes"
  type        = string
  default     = "n1-standard-2"
}

variable "dataproc_worker_count" {
  description = "Number of Dataproc worker nodes"
  type        = number
  default     = 2
}