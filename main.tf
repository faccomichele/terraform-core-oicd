terraform {
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = local.aws_region

  default_tags {
    tags = {
      Project     = var.tags["Repository"] != null ? var.tags["Repository"] : "unknown"
      Environment = local.environment
      ManagedBy   = "Terraform"
    }
  }
}
