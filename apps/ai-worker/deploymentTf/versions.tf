terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket  = "utopian-outlet-491410-b6-tfstate"
    prefix  = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
