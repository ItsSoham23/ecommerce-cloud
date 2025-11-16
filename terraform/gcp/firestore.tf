# terraform/gcp/firestore.tf

# ============================================================================
# Firestore Database (NoSQL)
# ============================================================================

resource "google_firestore_database" "main" {
  project     = var.gcp_project_id
  name        = "(default)"
  location_id = var.gcp_region
  type        = "FIRESTORE_NATIVE"

  # Deletion protection - set to disabled for testing
  deletion_policy = "DELETE"

  depends_on = [
    google_project_service.required_apis
  ]
}

# Composite index for analytics events
resource "google_firestore_index" "analytics_user_timestamp" {
  project    = var.gcp_project_id
  database   = google_firestore_database.main.name
  collection = "analytics_events"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.main]
}

# Composite index for user activity
resource "google_firestore_index" "user_activity" {
  project    = var.gcp_project_id
  database   = google_firestore_database.main.name
  collection = "user_activity"

  fields {
    field_path = "user_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "activity_type"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.main]
}

# ============================================================================
# Outputs
# ============================================================================

output "firestore_database_name" {
  description = "Name of the Firestore database"
  value       = google_firestore_database.main.name
}

output "firestore_location" {
  description = "Location of the Firestore database"
  value       = google_firestore_database.main.location_id
}