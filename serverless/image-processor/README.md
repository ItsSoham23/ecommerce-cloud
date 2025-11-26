# Image Processor Lambda

This Lambda resizes images uploaded to an S3 bucket and writes processed images to a destination bucket.

Quick start

- Install build dependencies locally (optional): `pip install -r requirements.txt -t ./package`
- Using AWS SAM (recommended):
  - `sam build --use-container`
  - `sam deploy --guided` (set `SourceBucketName` and `ProcessedBucketName` during guided deploy)

Local testing

- You can run the module directly for a quick local test (it simulates an S3 event):
  - `python lambda_function.py`

Notes

- Kafka support is optional and disabled by default. The function will attempt to publish events only when `KAFKA_BOOTSTRAP_SERVERS` is set and the `kafka-python` package is installed.
- In AWS Lambda, `boto3` is provided by the runtime; the `requirements.txt` includes `Pillow` for image processing.
