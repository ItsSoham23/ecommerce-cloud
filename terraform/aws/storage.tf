# terraform/aws/storage.tf

# ============================================================================
# S3 Buckets for Image Storage
# ============================================================================

# Bucket for raw product image uploads
resource "aws_s3_bucket" "product_images" {
  bucket = "${local.name_prefix}-product-images-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    local.common_tags,
    {
      Name        = "product-images"
      Description = "Raw product image uploads"
    }
  )
}

# Enable versioning
resource "aws_s3_bucket_versioning" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule to delete old versions
resource "aws_s3_bucket_lifecycle_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ============================================================================
# Bucket for processed images (Lambda output)
# ============================================================================

resource "aws_s3_bucket" "processed_images" {
  bucket = "${local.name_prefix}-processed-images-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    local.common_tags,
    {
      Name        = "processed-images"
      Description = "Processed and resized product images"
    }
  )
}

# Enable versioning
resource "aws_s3_bucket_versioning" "processed_images" {
  bucket = aws_s3_bucket.processed_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "processed_images" {
  bucket = aws_s3_bucket.processed_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access (will use CloudFront or signed URLs for access)
resource "aws_s3_bucket_public_access_block" "processed_images" {
  bucket = aws_s3_bucket.processed_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# S3 Bucket Notification to Trigger Lambda
# ============================================================================

resource "aws_s3_bucket_notification" "product_image_upload" {
  bucket = aws_s3_bucket.product_images.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ""
  }

  depends_on = [aws_lambda_permission.allow_s3]
}

# ============================================================================
# Lambda Function for Image Processing
# ============================================================================

# IAM role for Lambda
resource "aws_iam_role" "lambda_image_processor" {
  name = "${local.name_prefix}-lambda-img-processor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM policy for Lambda
resource "aws_iam_role_policy" "lambda_image_processor" {
  name = "lambda-image-processor-policy"
  role = aws_iam_role.lambda_image_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.product_images.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.processed_images.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda function (placeholder - we'll create the actual code later)
resource "aws_lambda_function" "image_processor" {
  filename         = "${path.module}/../../lambda-placeholder.zip"
  function_name    = "${local.name_prefix}-image-processor"
  role             = aws_iam_role.lambda_image_processor.arn
  handler          = "lambda_function.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/../../lambda-placeholder.zip")
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      PROCESSED_BUCKET = aws_s3_bucket.processed_images.id
      ENVIRONMENT      = var.environment
      KAFKA_BOOTSTRAP_SERVERS = aws_msk_cluster.main.bootstrap_brokers_tls
      KAFKA_TOPIC             = var.kafka_topic
    }
  }

  tags = local.common_tags
}

# Lambda permission for S3 to invoke
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.product_images.arn
}

# CloudWatch log group for Lambda
resource "aws_cloudwatch_log_group" "lambda_image_processor" {
  name              = "/aws/lambda/${aws_lambda_function.image_processor.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# ============================================================================
# Outputs
# ============================================================================

output "s3_product_images_bucket" {
  description = "Name of the product images S3 bucket"
  value       = aws_s3_bucket.product_images.id
}

output "s3_processed_images_bucket" {
  description = "Name of the processed images S3 bucket"
  value       = aws_s3_bucket.processed_images.id
}

output "lambda_image_processor_arn" {
  description = "ARN of the image processor Lambda function"
  value       = aws_lambda_function.image_processor.arn
}