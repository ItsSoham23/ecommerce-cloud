"""
Local test script for Lambda image processor
Tests image processing WITHOUT AWS/S3
"""

import os
from PIL import Image
from io import BytesIO

# Configuration
IMAGE_SIZES = [
    (150, 150, 'thumbnail'),
    (400, 400, 'medium'),
    (800, 800, 'large')
]

def resize_image(image, target_width, target_height):
    """Resize image while maintaining aspect ratio"""
    img_width, img_height = image.size
    aspect_ratio = img_width / img_height
    
    # Calculate new dimensions
    if aspect_ratio > 1:
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    else:
        new_height = target_height
        new_width = int(target_height * aspect_ratio)
    
    # Ensure dimensions don't exceed target
    if new_width > target_width:
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    if new_height > target_height:
        new_height = target_height
        new_width = int(target_height * aspect_ratio)
    
    # Resize with high quality
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create final image with white background
    final_image = Image.new('RGB', (target_width, target_height), (255, 255, 255))
    
    # Center the image
    paste_x = (target_width - new_width) // 2
    paste_y = (target_height - new_height) // 2
    final_image.paste(resized, (paste_x, paste_y))
    
    return final_image


def process_image_local(input_path, output_dir):
    """Process image locally without S3"""
    print(f"Processing: {input_path}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Open image
    image = Image.open(input_path)
    
    # Convert RGBA to RGB if needed
    if image.mode == 'RGBA':
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])
        image = background
    elif image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    
    print(f"Original size: {image.size[0]}x{image.size[1]}")
    
    # Get base filename
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    
    # Process each size
    for width, height, size_name in IMAGE_SIZES:
        resized = resize_image(image, width, height)
        
        # Save to output directory
        output_path = os.path.join(output_dir, f"{base_name}_{size_name}_{width}x{height}.jpg")
        resized.save(output_path, format='JPEG', quality=85, optimize=True)
        
        file_size = os.path.getsize(output_path) / 1024  # KB
        print(f"✓ Created {size_name}: {width}x{height} - {file_size:.1f} KB - {output_path}")
    
    print(f"\n✅ Success! Processed images saved to: {output_dir}")


if __name__ == "__main__":
    import sys
    
    # Check if image path provided
    if len(sys.argv) < 2:
        print("Usage: python test_local.py <path_to_image>")
        print("Example: python test_local.py test-image.jpg")
        sys.exit(1)
    
    input_image = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(input_image):
        print(f"Error: File not found: {input_image}")
        sys.exit(1)
    
    # Process image
    output_directory = "output"
    process_image_local(input_image, output_directory)