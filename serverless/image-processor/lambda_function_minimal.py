"""
Lambda function for processing product images - Minimal version without PIL
Uses boto3 (available by default in Lambda) to demonstrate S3 integration
For full image processing, PIL layer needs to be added
"""

import json
import boto3
import os
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
s3_client = boto3.client('s3')

# Configuration
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET', 'processed-images-bucket')

def lambda_handler(event, context):
    """
    Main Lambda handler function
    Triggered by S3 upload events
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Process each record in the event
        for record in event['Records']:
            # Extract S3 bucket and key information
            source_bucket = record['s3']['bucket']['name']
            source_key = record['s3']['object']['key']
            
            logger.info(f"Processing image: s3://{source_bucket}/{source_key}")
            
            # Skip if not an image file
            if not is_image_file(source_key):
                logger.info(f"Skipping non-image file: {source_key}")
                continue
            
            # Get object metadata
            response = s3_client.head_object(Bucket=source_bucket, Key=source_key)
            file_size = response['ContentLength']
            content_type = response.get('ContentType', 'unknown')
            
            logger.info(f"File details - Size: {file_size} bytes, Type: {content_type}")
            
            # Copy to processed bucket (placeholder for actual processing)
            base_name = os.path.splitext(os.path.basename(source_key))[0]
            new_key = f"originals/{base_name}.jpg"
            
            s3_client.copy_object(
                CopySource={'Bucket': source_bucket, 'Key': source_key},
                Bucket=PROCESSED_BUCKET,
                Key=new_key,
                Metadata={
                    'original-key': source_key,
                    'processed-at': datetime.utcnow().isoformat() + 'Z',
                    'status': 'awaiting-pil-layer'
                }
            )
            
            logger.info(f"✅ Copied to s3://{PROCESSED_BUCKET}/{new_key}")
            logger.info("⚠️  PIL not available - full image resizing disabled")
            logger.info("💡 To enable resizing, add Pillow Lambda layer")
            
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Image received successfully',
                'note': 'PIL layer needed for resizing'
            })
        }
    
    except Exception as e:
        logger.error(f"Error processing images: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }


def is_image_file(filename):
    """Check if file is an image based on extension"""
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    return any(filename.lower().endswith(ext) for ext in image_extensions)
