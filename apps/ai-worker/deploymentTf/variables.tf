variable "project_id" {
  description = "GCP project ID where resources will be created"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "project_id must be a valid GCP project ID (e.g. my-gcp-project-123), not a file path."
  }
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "europe-west1-b"
}

variable "instance_name" {
  description = "Name of the VM instance"
  type        = string
  default     = "ai-worker-vm"
}

variable "machine_type" {
  description = "Machine type for the VM"
  type        = string
  default     = "e2-medium"
}

variable "boot_image" {
  description = "Boot disk image"
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "boot_disk_size_gb" {
  description = "Boot disk size in GB"
  type        = number
  default     = 30
}

variable "boot_disk_type" {
  description = "Boot disk type"
  type        = string
  default     = "pd-balanced"
}

variable "network" {
  description = "VPC network self-link or name"
  type        = string
  default     = "default"
}

variable "subnetwork" {
  description = "Subnetwork self-link or name (optional)"
  type        = string
  default     = null
}

variable "assign_public_ip" {
  description = "Whether to assign an ephemeral external IP"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Network tags applied to the VM"
  type        = list(string)
  default     = ["ai-worker"]
}

variable "labels" {
  description = "Labels for the VM"
  type        = map(string)
  default = {
    app = "ai-worker"
  }
}

variable "metadata" {
  description = "Additional instance metadata"
  type        = map(string)
  default     = {}
}

variable "ssh_username" {
  description = "Linux username for SSH key metadata"
  type        = string
  default     = "ubuntu"
}

variable "ssh_public_key" {
  description = "SSH public key content. If empty, no SSH key metadata is injected."
  type        = string
  default     = ""
}

variable "ssh_public_keys" {
  description = "Additional SSH public keys. All keys are injected for ssh_username."
  type        = list(string)
  default     = []
}

variable "service_account_email" {
  description = "Service account email. Use 'default' for Compute Engine default service account."
  type        = string
  default     = "default"
}

variable "service_account_scopes" {
  description = "OAuth scopes for the VM service account"
  type        = list(string)
  default     = ["https://www.googleapis.com/auth/cloud-platform"]
}

variable "startup_script" {
  description = "Optional startup script content"
  type        = string
  default     = ""
}

variable "create_ssh_firewall_rule" {
  description = "Whether to create an SSH ingress firewall rule for this VM tag"
  type        = bool
  default     = true
}

variable "ssh_source_ranges" {
  description = "Source CIDR blocks allowed for SSH ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "create_app_firewall_rule" {
  description = "Whether to create an ingress firewall rule for the app port"
  type        = bool
  default     = true
}

variable "app_port" {
  description = "Public app port exposed by the VM service"
  type        = number
  default     = 8080
}

variable "allow_http_https" {
  description = "Whether to allow standard HTTP (80) and HTTPS (443) traffic"
  type        = bool
  default     = true
}

variable "app_source_ranges" {
  description = "Source CIDR blocks allowed for app ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
