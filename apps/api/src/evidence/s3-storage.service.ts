import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/config.schema.js';
import { PRESIGNED_URL_TTL_SECONDS } from '@compliance/shared';

export interface PresignedPostResult {
  url: string;
  fields: Record<string, string>;
  key: string;
}

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly kmsKeyArn: string;

  constructor(config: ConfigService<Env, true>) {
    const endpoint = config.get('AWS_ENDPOINT_URL', { infer: true });
    this.client = new S3Client({
      region: config.get('AWS_REGION', { infer: true }),
      ...(endpoint && {
        endpoint,
        forcePathStyle: true, // Required for LocalStack
      }),
    });
    this.bucket = config.get('AWS_S3_BUCKET', { infer: true });
    this.kmsKeyArn = config.get('AWS_KMS_KEY_ARN', { infer: true });
  }

  buildStorageKey(
    orgId: string,
    workspaceId: string,
    controlId: string,
    fileName: string,
  ): string {
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${orgId}/${workspaceId}/${controlId}/${crypto.randomUUID()}/${sanitized}`;
  }

  async createPresignedUpload(
    key: string,
    contentType: string,
    maxSizeBytes: number,
  ): Promise<PresignedPostResult> {
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, maxSizeBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: {
        'Content-Type': contentType,
        'x-amz-server-side-encryption': 'aws:kms',
        'x-amz-server-side-encryption-aws-kms-key-id': this.kmsKeyArn,
      },
      Expires: PRESIGNED_URL_TTL_SECONDS,
    });

    return { url, fields, key };
  }

  async getDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_TTL_SECONDS },
    );
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: this.kmsKeyArn,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
