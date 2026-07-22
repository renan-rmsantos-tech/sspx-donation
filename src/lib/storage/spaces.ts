import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client: S3Client | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: required('DO_SPACES_REGION'),
      endpoint: required('DO_SPACES_ENDPOINT'),
      credentials: {
        accessKeyId: required('DO_SPACES_ACCESS_KEY_ID'),
        secretAccessKey: required('DO_SPACES_SECRET_ACCESS_KEY'),
      },
    });
  }

  return client;
}

function getBucketName(bucket: string): string {
  const names: Record<string, string | undefined> = {
    receipts: process.env.DO_SPACES_BUCKET_RECEIPTS,
    'pix-qr': process.env.DO_SPACES_BUCKET_PIX_QR,
    'product-photos': process.env.DO_SPACES_BUCKET_PRODUCT_PHOTOS,
  };

  const name = names[bucket];

  if (!name) {
    throw new Error(`Invalid or unconfigured storage bucket: ${bucket}`);
  }

  return name;
}

export const uploadFileDirect = async (
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer | Buffer,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ path: string }> => {
  const body =
    file instanceof Blob
      ? Buffer.from(await file.arrayBuffer())
      : file instanceof ArrayBuffer
        ? Buffer.from(file)
        : file;

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucketName(bucket),
      Key: path,
      Body: body,
      ContentType: options?.contentType ?? 'application/octet-stream',
      ACL: bucket === 'receipts' ? 'private' : 'public-read',
      CacheControl:
        bucket === 'receipts'
          ? 'private, no-store'
          : 'public, max-age=3600',
    })
  );

  return { path };
};

export const generateSignedUploadUrl = async (
  bucket: string,
  path: string
): Promise<{ signedUrl: string; path: string }> => {
  const signedUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: getBucketName(bucket),
      Key: path,
    }),
    { expiresIn: 300 }
  );

  return { signedUrl, path };
};

export const generateSignedDownloadUrl = async (
  bucket: string,
  path: string,
  expiresIn = 300
): Promise<string> =>
  getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: getBucketName(bucket),
      Key: path,
    }),
    { expiresIn }
  );

export const deleteStorageObject = async (
  bucket: string,
  path: string
): Promise<void> => {
  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(bucket),
        Key: path,
      })
    );
  } catch (error) {
    console.error(
      `Error deleting storage object at ${bucket}/${path}:`,
      error
    );
  }
};
