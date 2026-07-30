export function getPublicUrl(bucket: string, path: string): string {
  const bases: Record<string, string | undefined> = {
    'pix-qr': process.env.NEXT_PUBLIC_SPACES_PIX_QR_URL,
    'product-photos': process.env.NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL,
    'broadcast-images':
      process.env.NEXT_PUBLIC_SPACES_BROADCAST_IMAGES_URL,
  };

  const base = bases[bucket];

  if (!base) {
    throw new Error(`Public URL is not configured for bucket: ${bucket}`);
  }

  const trimmedBase = base.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');

  return encodeURI(`${trimmedBase}/${cleanPath}`);
}
