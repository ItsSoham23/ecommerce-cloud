#!/usr/bin/env bash
set -euo pipefail

# Install Python libraries required by the PyFlink analytics job.
pip install --upgrade pyflink kafka-python google-cloud-firestore google-cloud-storage google-cloud-secret-manager psycopg2-binary
