output "instance_name" {
  description = "Created VM instance name"
  value       = google_compute_instance.vm.name
}

output "instance_id" {
  description = "Created VM instance ID"
  value       = google_compute_instance.vm.id
}

output "zone" {
  description = "Zone where the VM is deployed"
  value       = google_compute_instance.vm.zone
}

output "internal_ip" {
  description = "Internal IP address"
  value       = google_compute_instance.vm.network_interface[0].network_ip
}

output "external_ip" {
  description = "External IP address (if assigned)"
  value       = try(google_compute_instance.vm.network_interface[0].access_config[0].nat_ip, null)
}

output "ssh_firewall_rule_name" {
  description = "Name of created SSH firewall rule"
  value       = try(google_compute_firewall.allow_ssh[0].name, null)
}
