import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env['R2_BUCKET_NAME'] ?? 'canifed';
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env['R2_ENDPOINT'] ?? '',
      credentials: {
        accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
      },
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded: ${key}`);
    return this.getSignedUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted: ${key}`);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn },
    );
  }
}
