// Terraform skeleton for AWS resources (EKS, RDS, S3, Lambda)
// NOTE: This is a scaffold. Fill in provider credentials and variables before applying.

// Example S3 bucket for raw uploads
resource "aws_s3_bucket" "raw_bucket" {
  bucket = var.s3_bucket_name
  acl    = "private"
}

// Placeholder EKS cluster module invocation
# module "eks" {
#   source = "terraform-aws-modules/eks/aws"
#   version = "~> 19.0"
#   cluster_name = var.cluster_name
#   # ... fill inputs
# }

// Placeholder RDS instance for Postgres
# resource "aws_db_instance" "postgres" {
#   allocated_storage    = 20
#   engine               = "postgres"
#   engine_version       = "14"
#   instance_class       = "db.t3.micro"
#   name                 = var.db_name
#   username             = var.db_user
#   password             = var.db_password
#   skip_final_snapshot  = true
# }

// Lambda (serverless) will be managed separately in lambda.tf
# terraform/aws/main.tf

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  # We'll add backend configuration later after creating the S3 bucket
  # For now, using local state
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# Local variables
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # Will use this for resource naming
  name_prefix = "${var.project_name}-${var.environment}"
}