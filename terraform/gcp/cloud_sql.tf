# terraform/gcp/cloud_sql.tf

# ============================================================================
# VPC for Private IP
# ============================================================================

resource "google_compute_network" "vpc" {
  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.required_apis]
}

resource "google_compute_subnetwork" "private" {
  name          = "${local.name_prefix}-private-subnet"
  ip_cidr_range = "10.1.0.0/16"
  region        = var.gcp_region
  network       = google_compute_network.vpc.id
  
  private_ip_google_access = true
}

# Reserve IP range for Cloud SQL private connection
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${local.name_prefix}-private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

# Create private VPC connection for Cloud SQL
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]

  depends_on = [google_project_service.required_apis]
}

# ============================================================================
# Cloud SQL PostgreSQL Instance
# ============================================================================

# Random password for Cloud SQL
resource "random_password" "cloud_sql_password" {
  length  = 16
  special = true
}

# Cloud SQL instance
resource "google_sql_database_instance" "analytics" {
  name             = "${local.name_prefix}-analytics-db"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  settings {
    tier = "db-f1-micro"  # Smallest for testing
    
    # Backup configuration
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
    }

    # IP configuration
    ip_configuration {
      ipv4_enabled    = false  # Private IP only
      private_network = google_compute_network.vpc.id
      require_ssl     = false  # Set to false for testing, enable in production
    }

    # Database flags
    database_flags {
      name  = "cloudsql.enable_pgaudit"
      value = "on"
    }

    # Insights configuration
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
    }
  }

  deletion_protection = false  # Set to false for easy testing/cleanup

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Create database
resource "google_sql_database" "analytics_db" {
  name     = "analytics"
  instance = google_sql_database_instance.analytics.name
}

# Create user
resource "google_sql_user" "analytics_user" {
  name     = "analytics_app"
  instance = google_sql_database_instance.analytics.name
  password = random_password.cloud_sql_password.result
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "analytics_db_password" {
  secret_id = "${local.name_prefix}-analytics-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "analytics_db_password" {
  secret      = google_secret_manager_secret.analytics_db_password.id
  secret_data = random_password.cloud_sql_password.result
}

# ============================================================================
# Outputs
# ============================================================================

output "cloud_sql_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.analytics.name
}

output "cloud_sql_connection_name" {
  description = "Connection name for Cloud SQL"
  value       = google_sql_database_instance.analytics.connection_name
}

output "cloud_sql_private_ip" {
  description = "Private IP address of Cloud SQL instance"
  value       = google_sql_database_instance.analytics.private_ip_address
  sensitive   = true
}

output "cloud_sql_database_name" {
  description = "Name of the analytics database"
  value       = google_sql_database.analytics_db.name
}

output "cloud_sql_user" {
  description = "Database user name"
  value       = google_sql_user.analytics_user.name
  sensitive   = true
}

output "cloud_sql_password_secret" {
  description = "Secret Manager secret ID for database password"
  value       = google_secret_manager_secret.analytics_db_password.secret_id
}