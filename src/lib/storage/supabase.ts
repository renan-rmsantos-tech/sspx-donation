import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const uploadFileDirect = async (
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer | Buffer,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ path: string }> => {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType ?? 'application/octet-stream',
      upsert: options?.upsert ?? true,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return { path };
};

export const generateSignedUploadUrl = async (
  bucket: string,
  path: string
): Promise<{ signedUrl: string; path: string }> => {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error) {
    throw new Error(`Failed to generate signed upload URL: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
  };
};

export const generateSignedDownloadUrl = async (
  bucket: string,
  path: string,
  expiresIn = 300
): Promise<string> => {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed download URL: ${error.message}`);
  }

  return data.signedUrl;
};

export const deleteStorageObject = async (
  bucket: string,
  path: string
): Promise<void> => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(`Failed to delete storage object at ${bucket}/${path}:`, error);
    }
  } catch (error) {
    console.error(`Error deleting storage object at ${bucket}/${path}:`, error);
  }
};
