// Minimal internal firewall for Dataproc nodes
resource "google_compute_firewall" "dataproc_internal" {
  name    = "${local.name_prefix}-allow-internal"
  network = google_compute_network.vpc.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "icmp"
  }

  # Restrict to the private subnet CIDR
  source_ranges = [google_compute_subnetwork.private.ip_cidr_range]

  # Only target Dataproc instances via tags
  target_tags = ["dataproc", "flink"]
}
