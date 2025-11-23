# terraform/aws/vpc.tf

# Using AWS VPC module for simplicity and best practices
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs              = var.availability_zones
  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  # Create database subnet group for RDS
  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  # Enable NAT Gateway for private subnets (required for EKS nodes to pull images)
  enable_nat_gateway     = true
  single_nat_gateway     = false # One NAT per AZ for high availability
  one_nat_gateway_per_az = true

  # Enable DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags for Kubernetes (required for EKS)
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1" # For public load balancers
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1" # For internal load balancers
  }

  tags = local.common_tags
}

# VPC Endpoint for S3 (saves NAT costs and improves performance)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  route_table_ids = concat(
    module.vpc.private_route_table_ids,
    module.vpc.database_route_table_ids
  )

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-s3-endpoint"
    }
  )
}