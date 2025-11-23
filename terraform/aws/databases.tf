# terraform/aws/databases.tf

# ============================================================================
# RDS PostgreSQL Database
# ============================================================================

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  # Allow PostgreSQL from EKS nodes
  ingress {
    description     = "PostgreSQL from EKS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-rds-sg"
    }
  )
}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 16
  special = true
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "${local.name_prefix}-rds-password"

  recovery_window_in_days = 7 # Small recovery window for testing

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}

# RDS PostgreSQL instance
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  # Engine
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro" # Free tier eligible, smallest for testing

  # Storage
  allocated_storage     = 20 # Minimum for postgres
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  # Database
  db_name  = "ecommerce"
  username = "dbadmin"
  password = random_password.rds_password.result
  port     = 5432

  # Network
  multi_az               = false # Set to false for cost savings during testing
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = false # Disable for cost savings

  # Deletion protection
  deletion_protection       = false # Set to false for easy testing/cleanup
  skip_final_snapshot       = true  # Set to true for testing
  final_snapshot_identifier = null

  tags = local.common_tags
}

# ============================================================================
# DynamoDB Tables
# ============================================================================

# Cart sessions table
resource "aws_dynamodb_table" "cart_sessions" {
  name         = "${local.name_prefix}-cart-sessions"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing, no minimum cost
  hash_key     = "session_id"
  range_key    = "user_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "updated_at"
    type = "N"
  }

  # GSI for querying by user_id
  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    range_key       = "updated_at"
    projection_type = "ALL"
  }

  # TTL for automatic expiration
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Encryption
  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
}

# User sessions table
resource "aws_dynamodb_table" "user_sessions" {
  name         = "${local.name_prefix}-user-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_token"

  attribute {
    name = "session_token"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI for querying by user_id
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  # TTL for automatic expiration
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Encryption
  server_side_encryption {
    enabled = true
  }

  tags = local.common_tags
}

# ============================================================================
# Outputs
# ============================================================================

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "RDS master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "rds_password_secret_arn" {
  description = "ARN of the secret containing RDS password"
  value       = aws_secretsmanager_secret.rds_password.arn
}

output "dynamodb_cart_table_name" {
  description = "Name of the cart sessions DynamoDB table"
  value       = aws_dynamodb_table.cart_sessions.name
}

output "dynamodb_user_sessions_table_name" {
  description = "Name of the user sessions DynamoDB table"
  value       = aws_dynamodb_table.user_sessions.name
}