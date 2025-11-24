# terraform/gcp/dataproc.tf

# ============================================================================
# Google Cloud Storage Buckets
# ============================================================================

# Bucket for Dataproc staging
resource "google_storage_bucket" "dataproc_staging" {
  name          = "${local.name_prefix}-dataproc-staging-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = true # Set to true for easy cleanup during testing

  uniform_bucket_level_access = true

  labels = local.common_labels
}

# Bucket for Flink checkpoints and savepoints
resource "google_storage_bucket" "flink_checkpoints" {
  name          = "${local.name_prefix}-flink-checkpoints-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  labels = local.common_labels
}

# Bucket for initialization scripts
resource "google_storage_bucket" "dataproc_init" {
  name          = "${local.name_prefix}-dataproc-init-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = true

  uniform_bucket_level_access = true

  labels = local.common_labels
}

resource "google_storage_bucket_object" "flink_init_dependencies" {
  name         = "install-flink-deps.sh"
  bucket       = google_storage_bucket.dataproc_init.name
  # path.module is terraform/gcp, analytics lives at ecommerce-cloud/analytics -> go up two levels
  source       = "${path.module}/../../analytics/install-flink-deps.sh"
  content_type = "text/x-shellscript"
}

# ============================================================================
# Service Account for Dataproc
# ============================================================================

resource "google_service_account" "dataproc" {
  # Ensure account_id meets GCP's regex/length requirements by truncating project_name if needed
  account_id   = "${substr(var.project_name, 0, 17)}-dataproc-sa"
  display_name = "Dataproc Flink Service Account"
}

resource "google_project_iam_member" "dataproc_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.dataproc.email}"
}

resource "google_project_iam_member" "dataproc_cloudsql" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.dataproc.email}"
}

resource "google_project_iam_member" "dataproc_secretmanager" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dataproc.email}"
}

resource "google_project_iam_member" "dataproc_worker" {
  project = var.gcp_project_id
  role    = "roles/dataproc.worker"
  member  = "serviceAccount:${google_service_account.dataproc.email}"
}

resource "google_project_iam_member" "storage_admin" {
  project = var.gcp_project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.dataproc.email}"
}

# ============================================================================
# Dataproc Cluster for Flink
# ============================================================================

resource "google_dataproc_cluster" "flink_cluster" {
  name   = "${local.name_prefix}-flink-cluster"
  region = var.gcp_region

  cluster_config {
    staging_bucket = google_storage_bucket.dataproc_staging.name

    # Master node configuration
    master_config {
      num_instances = 1
      machine_type  = var.dataproc_master_machine_type
      disk_config {
        boot_disk_type    = "pd-standard"
        boot_disk_size_gb = 100
      }
    }

    # Worker nodes configuration
    worker_config {
      num_instances = var.dataproc_worker_count
      machine_type  = var.dataproc_worker_machine_type
      disk_config {
        boot_disk_type    = "pd-standard"
        boot_disk_size_gb = 100
      }
    }

    # Software configuration
    software_config {
      image_version = "2.1-debian11" # Includes Flink

      optional_components = ["FLINK"]
    }

    # GCE configuration
    gce_cluster_config {
      zone      = var.gcp_zone
      # Use only the subnetwork (network is derived from subnetwork)
      subnetwork = google_compute_subnetwork.private.id

      service_account = google_service_account.dataproc.email
      service_account_scopes = [
        "cloud-platform"
      ]

      metadata = {
        "enable-oslogin" = "true"
      }

      tags = ["dataproc", "flink"]
    }

    initialization_action {
      script = "gs://${google_storage_bucket.dataproc_init.name}/${google_storage_bucket_object.flink_init_dependencies.name}"
    }
  }

  labels = local.common_labels

  depends_on = [
    google_project_service.required_apis
  ]
}

# ============================================================================
# Buckets for analytics outputs
# ============================================================================

resource "google_storage_bucket" "analytics_results" {
  name          = "${local.name_prefix}-${var.flink_result_bucket_suffix}-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = true

  uniform_bucket_level_access = true

  labels = merge(local.common_labels, { purpose = "analytics" })
}

resource "google_storage_bucket_object" "flink_job_script" {
  name         = "flink_analytics_job.py"
  bucket       = google_storage_bucket.dataproc_init.name
  source       = "${path.module}/../../analytics/flink_analytics_job.py"
  content_type = "text/x-python"
}

/* Dataproc job resource removed.
   Job submission is performed externally using the `submit_flink_job_command` output
   (gcloud dataproc jobs submit flink ...) so the provider schema mismatches are avoided.
*/

# ============================================================================
# Outputs
# ============================================================================

output "dataproc_cluster_name" {
  description = "Name of the Dataproc cluster"
  value       = google_dataproc_cluster.flink_cluster.name
}

output "dataproc_master_instance" {
  description = "Master instance name"
  value       = google_dataproc_cluster.flink_cluster.cluster_config[0].master_config[0].instance_names[0]
}

output "flink_checkpoints_bucket" {
  description = "GCS bucket for Flink checkpoints"
  value       = google_storage_bucket.flink_checkpoints.name
}

output "dataproc_staging_bucket" {
  description = "GCS bucket for Dataproc staging"
  value       = google_storage_bucket.dataproc_staging.name
}

output "flink_analytics_results_bucket" {
  description = "Bucket where the Flink job writes aggregated summaries"
  value       = google_storage_bucket.analytics_results.name
}

output "flink_job_script_uri" {
  description = "Location of the PyFlink analytics script"
  value       = "gs://${google_storage_bucket.dataproc_init.name}/${google_storage_bucket_object.flink_job_script.name}"
}

/* Removed `flink_analytics_job_id` output because the job is not auto-submitted by Terraform. */