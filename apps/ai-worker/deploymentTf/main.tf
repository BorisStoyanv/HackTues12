locals {
  merged_metadata = var.ssh_public_key == "" ? var.metadata : merge(
    var.metadata,
    {
      "ssh-keys" = "${var.ssh_username}:${var.ssh_public_key}"
    }
  )
}

resource "google_compute_instance" "vm" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = var.tags
  labels       = var.labels

  boot_disk {
    initialize_params {
      image = var.boot_image
      size  = var.boot_disk_size_gb
      type  = var.boot_disk_type
    }
  }

  network_interface {
    network    = var.network
    subnetwork = var.subnetwork

    dynamic "access_config" {
      for_each = var.assign_public_ip ? [1] : []
      content {}
    }
  }

  metadata                = local.merged_metadata
  metadata_startup_script = var.startup_script == "" ? null : var.startup_script

  service_account {
    email  = var.service_account_email
    scopes = var.service_account_scopes
  }

  allow_stopping_for_update = true
}

resource "google_compute_firewall" "allow_ssh" {
  count = var.create_ssh_firewall_rule ? 1 : 0

  name          = "${var.instance_name}-allow-ssh"
  network       = var.network
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = var.ssh_source_ranges
  target_tags   = var.tags

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "allow_app" {
  count = var.create_app_firewall_rule ? 1 : 0

  name          = "${var.instance_name}-allow-app"
  network       = var.network
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = var.app_source_ranges
  target_tags   = var.tags

  allow {
    protocol = "tcp"
    ports    = [tostring(var.app_port)]
  }
}

resource "google_compute_firewall" "allow_web" {
  count = var.allow_http_https ? 1 : 0

  name          = "${var.instance_name}-allow-web"
  network       = var.network
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["0.0.0.0/0"]
  target_tags   = var.tags

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}
