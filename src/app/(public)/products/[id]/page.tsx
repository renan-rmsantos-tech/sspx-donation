import { notFound } from 'next/navigation';
import { getPublishedProductById } from '@/features/products/queries';
import { getPixSettings } from '@/features/pix/queries';
import { getPublicUrl } from '@/lib/storage/public-url';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';
import { ProductDetail } from '@/features/products/components/ProductDetail';
import { ServerActionsProvider } from '@/components/server-actions';
import {
  createMonetaryDonation,
  createPhysicalPledge,
  uploadFile,
} from '@/features/donations/actions';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const [product, pixSettings] = await Promise.all([
    getPublishedProductById(id),
    getPixSettings(),
  ]);

  if (!product) {
    notFound();
  }

  const qrCodeImageUrl =
    pixSettings?.qrCodeImagePath
      ? getPublicUrl('pix-qr', pixSettings.qrCodeImagePath)
      : null;

  const productImageUrl = product.imagePath
    ? getPublicUrl('product-photos', product.imagePath)
    : PRODUCT_PLACEHOLDER_IMAGE;

  return (
    <ServerActionsProvider
      actions={{ createMonetaryDonation, createPhysicalPledge, uploadFile }}
    >
      <ProductDetail
        product={product}
        productImageUrl={productImageUrl}
        qrCodeImageUrl={qrCodeImageUrl}
        copiaEColaCode={pixSettings?.copiaEColaCode ?? null}
      />
    </ServerActionsProvider>
  );
}
