import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPublishedProductById } from '@/features/products/queries';
import { getPixSettings } from '@/features/pix/queries';
import { getPublicUrl } from '@/lib/storage/public-url';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';
import { ProductImage } from '@/features/products/components/ProductImage';
import { DonationSection } from '@/features/donations/components/DonationSection';
import { formatCurrency, calculateProgressPercentage } from '@/lib/utils/format';
import { ThemeToggle } from '@/components/theme-toggle';

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

  const categoryNames = product.productCategories
    .map((pc) => pc.categories.name)
    .join(', ');

  const percentage = calculateProgressPercentage(
    product.currentAmount,
    product.targetAmount || 0
  );

  const isFullyFunded =
    product.targetAmount != null &&
    product.currentAmount >= product.targetAmount;

  return (
    <div className="min-h-screen bg-[#EDE9DE]">
      <div className="max-w-[768px] mx-auto px-4 md:px-16 pt-10 pb-20">

        {/* Nav */}
        <div className="flex items-center justify-between mb-8 max-w-[640px] mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-[15px] leading-[18px] text-[#4A3728] hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2} />
            Voltar ao catálogo
          </Link>
          <ThemeToggle className="w-9 h-9 rounded-full border border-[#C8B99A] text-[#4A3728] hover:bg-transparent" />
        </div>

        {/* Card */}
        <div className="bg-[#F5F2EA] border border-[#D9CFBE] rounded-xl overflow-hidden max-w-[640px] mx-auto">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-[#E4DDD1]">
            {product.productType === 'scholarship' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-[3px] rounded-full bg-[#1E3D59] text-[#F8F6F1] text-[11px] uppercase tracking-[0.14em] mb-3">
                Bolsa de Estudo
              </span>
            )}
            <h1 className="font-serif font-bold text-[32px] leading-[1.2] tracking-[-0.02em] text-[#2C4A5A] mb-2">
              {product.name}
            </h1>
            {categoryNames && (
              <p className="text-[13px] leading-[16px] text-[#8C7B6B] uppercase tracking-[0.04em]">
                Categorias: {categoryNames}
              </p>
            )}
          </div>

          {/* Photo */}
          <div className="px-8 py-6">
            <div className="w-full aspect-square rounded-lg overflow-hidden border border-[#D9CFBE]">
              <ProductImage
                src={productImageUrl}
                alt={product.name}
                width={600}
                height={600}
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          </div>

          {/* Description */}
          <div className="px-8 pb-7 pt-2 border-b border-[#E4DDD1]">
            <h2 className="font-serif font-semibold text-[18px] leading-[22px] text-[#2C4A5A] mb-3">
              Descrição
            </h2>
            <p className="text-[15px] leading-[1.7] text-[#5C4F43] whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          {/* Status */}
          {!(isFullyFunded || product.isFulfilled) && <div className="bg-[#EDE9DE] px-8 py-7 border-b border-[#E4DDD1]">
            <h2 className="font-serif font-semibold text-[18px] leading-[22px] text-[#2C4A5A] mb-1">
              Status
            </h2>
            {product.donationMode === 'both' && (
              <p className="text-[13px] text-[#8A7D6B] mb-5">Você pode contribuir de duas formas</p>
            )}
            {product.donationMode !== 'both' && <div className="mb-5" />}

            <div className="flex gap-4">
              {/* Money card */}
              {(product.donationMode === 'monetary' || product.donationMode === 'both') && (
                <div
                  className="flex-1 rounded-[10px] p-4 flex flex-col gap-3 border"
                  style={{ backgroundColor: 'rgba(44,74,90,0.05)', borderColor: 'rgba(44,74,90,0.15)' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(44,74,90,0.1)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="#2C4A5A" strokeWidth="1.2" />
                        <circle cx="7" cy="7" r="1.5" stroke="#2C4A5A" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.07em] uppercase text-[#2C4A5A]">
                      Em Dinheiro
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div
                      className="h-[5px] rounded-[3px] overflow-hidden"
                      style={{ backgroundColor: 'rgba(44,74,90,0.1)' }}
                    >
                      <div
                        className="h-full rounded-[3px] bg-[#2C4A5A] transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px]" style={{ color: 'rgba(44,74,90,0.5)' }}>
                      {percentage}% arrecadado
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#2C4A5A]">
                      {formatCurrency(product.targetAmount || 0)}
                    </span>
                    <span className="text-[11px] text-[#8A7D6B]">meta de arrecadação</span>
                  </div>
                </div>
              )}

              {/* Material card */}
              {(product.donationMode === 'physical' || product.donationMode === 'both') && (
                <div
                  className="flex-1 rounded-[10px] p-4 flex flex-col gap-3 border"
                  style={
                    product.isFulfilled
                      ? { backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }
                      : { backgroundColor: 'rgba(181,130,74,0.08)', borderColor: 'rgba(181,130,74,0.3)' }
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: product.isFulfilled ? 'rgba(34,197,94,0.1)' : 'rgba(181,130,74,0.1)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1.5" y="4.5" width="11" height="8" rx="1" stroke={product.isFulfilled ? '#166534' : '#B5824A'} strokeWidth="1.2" />
                        <path d="M1.5 7h11" stroke={product.isFulfilled ? '#166534' : '#B5824A'} strokeWidth="1.2" />
                        <path d="M5.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke={product.isFulfilled ? '#166534' : '#B5824A'} strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span
                      className="text-[11px] font-bold tracking-[0.07em] uppercase"
                      style={{ color: product.isFulfilled ? '#166534' : '#B5824A' }}
                    >
                      O Material
                    </span>
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 w-fit"
                    style={{ backgroundColor: product.isFulfilled ? 'rgba(34,197,94,0.1)' : 'rgba(181,130,74,0.1)' }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: product.isFulfilled ? '#22c55e' : '#B5824A' }}
                    />
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: product.isFulfilled ? '#166534' : '#B5824A' }}
                    >
                      {product.isFulfilled ? 'Já adquirido' : 'Ainda necessário'}
                    </span>
                  </div>
                  <span
                    className="text-[12px] leading-[18px]"
                    style={{ color: product.isFulfilled ? '#166534' : '#5C4F3D' }}
                  >
                    {product.isFulfilled
                      ? 'Obrigado! Este item já foi atendido.'
                      : 'Adquira e entregue o item diretamente na escola.'}
                  </span>
                </div>
              )}
            </div>
          </div>}

          {/* Donation section */}
          {isFullyFunded || product.isFulfilled ? (
            <div className="px-8 py-7">
              <div
                className="rounded-lg px-4 py-3.5 border"
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}
              >
                <p className="text-[14px]" style={{ color: '#166534' }}>
                  {isFullyFunded
                    ? 'Esta campanha atingiu a meta. Obrigado pelo seu apoio!'
                    : 'Este item foi atendido. Obrigado pelo seu apoio!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-8 pt-7 pb-8">
              <h2 className="font-serif font-semibold text-[18px] leading-[22px] text-[#2C4A5A] mb-5">
                Como deseja contribuir?
              </h2>
              <DonationSection
                productId={product.id}
                targetAmount={product.targetAmount}
                currentAmount={product.currentAmount}
                qrCodeImageUrl={qrCodeImageUrl}
                copiaEColaCode={pixSettings?.copiaEColaCode ?? null}
                donationMode={product.donationMode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
