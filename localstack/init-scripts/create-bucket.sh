#!/bin/bash
echo "Creating S3 bucket: ecommerce-product-images-raw"
# Removed the invalid /usr/bin/localstack wait command
awslocal s3 mb s3://ecommerce-product-images-raw
echo "S3 bucket created successfully."