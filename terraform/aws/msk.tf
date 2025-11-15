# terraform/aws/msk.tf

# ============================================================================
# Amazon MSK (Managed Kafka) Cluster
# ============================================================================

# KMS key for MSK encryption
resource "aws_kms_key" "msk" {
  description             = "KMS key for MSK encryption"
  deletion_window_in_days = 7  # Minimum for testing
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "msk" {
  name          = "alias/${local.name_prefix}-msk"
  target_key_id = aws_kms_key.msk.key_id
}

# Security group for MSK
resource "aws_security_group" "msk" {
  name        = "${local.name_prefix}-msk-sg"
  description = "Security group for MSK cluster"
  vpc_id      = module.vpc.vpc_id

  # Kafka from EKS nodes
  ingress {
    description     = "Kafka plaintext from EKS"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  # Kafka TLS from EKS nodes
  ingress {
    description     = "Kafka TLS from EKS"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  # Zookeeper within cluster
  ingress {
    description = "Zookeeper within cluster"
    from_port   = 2181
    to_port     = 2181
    protocol    = "tcp"
    self        = true
  }

  # Allow all within MSK cluster
  ingress {
    description = "All traffic within MSK cluster"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
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
      Name = "${local.name_prefix}-msk-sg"
    }
  )
}

# CloudWatch log group for MSK
resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${local.name_prefix}"
  retention_in_days = 7

  tags = local.common_tags
}

# MSK Configuration
resource "aws_msk_configuration" "main" {
  name              = "${local.name_prefix}-msk-config"
  kafka_versions    = ["3.5.1"]
  server_properties = <<PROPERTIES
auto.create.topics.enable=true
delete.topic.enable=true
log.retention.hours=168
default.replication.factor=3
min.insync.replicas=2
num.partitions=3
compression.type=gzip
PROPERTIES
}

# MSK Cluster
resource "aws_msk_cluster" "main" {
  cluster_name           = "${local.name_prefix}-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type = "kafka.t3.small"  # Smallest for testing
    client_subnets = module.vpc.private_subnets

    storage_info {
      ebs_storage_info {
        volume_size = 100  # GB
      }
    }

    security_groups = [aws_security_group.msk.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }

    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Outputs
# ============================================================================

output "msk_cluster_arn" {
  description = "ARN of the MSK cluster"
  value       = aws_msk_cluster.main.arn
}

output "msk_bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
  sensitive   = true
}

output "msk_zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
  sensitive   = true
}