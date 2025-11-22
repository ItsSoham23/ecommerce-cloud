"""
Lambda function for processing product images
Resizes images to multiple sizes for optimal web performance
"""

import json
import boto3
import os
from io import BytesIO
from PIL import Image
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
s3_client = boto3.client('s3')

# Configuration
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET', 'processed-images-bucket')

# Image sizes to generate: (width, height, name)
IMAGE_SIZES = [
    (150, 150, 'thumbnail'),
    (400, 400, 'medium'),
    (800, 800, 'large')
]


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
            
            # Process the image
            process_image(source_bucket, source_key)
            
            logger.info(f"Successfully processed: {source_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps('Image processing completed successfully')
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


def process_image(source_bucket, source_key):
    """
    Download image from S3, resize to multiple sizes, and upload back
    """
    # Download the image from S3
    response = s3_client.get_object(Bucket=source_bucket, Key=source_key)
    image_data = response['Body'].read()
    
    # Open image with PIL
    image = Image.open(BytesIO(image_data))
    
    # Convert RGBA to RGB if necessary (for JPEG compatibility)
    if image.mode == 'RGBA':
        # Create white background
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])  # Use alpha channel as mask
        image = background
    elif image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    
    # Get original dimensions
    original_width, original_height = image.size
    logger.info(f"Original dimensions: {original_width}x{original_height}")
    
    # Get base filename without extension
    base_name = os.path.splitext(os.path.basename(source_key))[0]
    folder = os.path.dirname(source_key)
    
    # Process and upload each size
    for width, height, size_name in IMAGE_SIZES:
        resized_image = resize_image(image, width, height)
        upload_image(resized_image, folder, base_name, width, height, size_name, source_key)
        logger.info(f"Created {size_name} version: {width}x{height}")


def resize_image(image, target_width, target_height):
    """
    Resize image while maintaining aspect ratio
    Center the image on a white background if needed
    """
    img_width, img_height = image.size
    aspect_ratio = img_width / img_height
    
    # Calculate new dimensions maintaining aspect ratio
    if aspect_ratio > 1:
        # Landscape
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    else:
        # Portrait or square
        new_height = target_height
        new_width = int(target_height * aspect_ratio)
    
    # Ensure dimensions don't exceed target
    if new_width > target_width:
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    if new_height > target_height:
        new_height = target_height
        new_width = int(target_height * aspect_ratio)
    
    # Resize image with high-quality resampling
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create final image with target size (white background)
    final_image = Image.new('RGB', (target_width, target_height), (255, 255, 255))
    
    # Paste resized image centered
    paste_x = (target_width - new_width) // 2
    paste_y = (target_height - new_height) // 2
    final_image.paste(resized, (paste_x, paste_y))
    
    return final_image


def upload_image(image, folder, base_name, width, height, size_name, original_key):
    """
    Convert image to JPEG and upload to S3
    """
    # Save to BytesIO
    buffer = BytesIO()
    image.save(buffer, format='JPEG', quality=85, optimize=True)
    buffer.seek(0)
    
    # Generate new S3 key
    # uploads/product123.jpg -> thumbnail/product123_150x150.jpg
    new_key = f"{size_name}/{base_name}_{width}x{height}.jpg"
    
    # Upload to processed images bucket
    s3_client.put_object(
        Bucket=PROCESSED_BUCKET,
        Key=new_key,
        Body=buffer,
        ContentType='image/jpeg',
        Metadata={
            'original-key': original_key,
            'size': size_name,
            'dimensions': f'{width}x{height}'
        }
    )
    
    logger.info(f"Uploaded to s3://{PROCESSED_BUCKET}/{new_key}")


# For local testing
if __name__ == "__main__":
    # Test event simulating S3 upload
    test_event = {
        'Records': [{
            's3': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'uploads/test-image.jpg'}
            }
        }]
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))