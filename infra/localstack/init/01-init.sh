#!/bin/bash
set -e

echo "==> LocalStack: initialising S3, KMS, and Secrets Manager..."

# Create S3 bucket for evidence
awslocal s3api create-bucket \
  --bucket compliance-evidence-local \
  --region us-east-1 2>/dev/null || true

# Enable versioning on the bucket
awslocal s3api put-bucket-versioning \
  --bucket compliance-evidence-local \
  --versioning-configuration Status=Enabled

# Block all public access
awslocal s3api put-public-access-block \
  --bucket compliance-evidence-local \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create KMS key for SSE-KMS encryption
KMS_KEY_ID=$(awslocal kms create-key \
  --description "Compliance evidence encryption key (local dev)" \
  --query 'KeyMetadata.KeyId' \
  --output text 2>/dev/null || \
  awslocal kms list-keys --query 'Keys[0].KeyId' --output text)

echo "KMS Key ID: ${KMS_KEY_ID}"

# Create a KMS alias for easy reference
awslocal kms create-alias \
  --alias-name alias/compliance-evidence \
  --target-key-id "${KMS_KEY_ID}" 2>/dev/null || true

echo "==> LocalStack init complete."
echo "S3 bucket: compliance-evidence-local"
echo "KMS key: ${KMS_KEY_ID}"
