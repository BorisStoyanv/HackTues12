# GCP VM Terraform (ai-worker)

This Terraform config creates one Google Compute Engine VM for the `ai-worker` app.

## Prerequisites

- Terraform >= 1.5
- GCP project with Compute Engine API enabled
- Authenticated Google credentials, for example:

```bash
gcloud auth application-default login
```

## Usage

```bash
cd deploymentTf
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Destroy

```bash
terraform destroy
```

## Notes

- Set `project_id` in `terraform.tfvars`.
- If you need SSH access, set `ssh_public_key` or `ssh_public_keys` and optionally `ssh_username`.
- External IP is created only when `assign_public_ip = true`.
- By default an SSH firewall rule is created; restrict `ssh_source_ranges` before apply.
- By default an app firewall rule is created for port `8080`; control it with `app_port`, `app_source_ranges`, and `create_app_firewall_rule`.
