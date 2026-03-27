import Link from 'next/link';
import Image from 'next/image';
import type { products } from '@/lib/db/schema';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';
import { getPublicUrl } from '@/lib/storage/public-url';
import { formatCurrency } from '@/lib/utils/format';
import { DonationModeBadge } from './DonationModeBadge';

type Product = typeof products.$inferSelect;

interface ProductCardProps {
  product: Product & {
    productCategories: Array<{
      categories: { id: string; name: string };
    }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const isGoalReached =
    product.isFulfilled ||
    (product.targetAmount != null &&
      product.currentAmount >= product.targetAmount);

  const percentage =
    product.targetAmount && product.targetAmount > 0
      ? Math.min(
          Math.round((product.currentAmount / product.targetAmount) * 100),
          100
        )
      : 0;

  const firstCategory =
    product.productCategories[0]?.categories.name ?? null;

  const imageUrl = product.imagePath
    ? getPublicUrl('product-photos', product.imagePath)
    : PRODUCT_PLACEHOLDER_IMAGE;

  return (
    <Link href={`/products/${product.id}`} className="block cursor-pointer">
      <div className="rounded-[12px] border border-[#D4C4A8] overflow-hidden bg-white flex flex-col hover:shadow-lg transition-shadow">

        {/* Image area */}
        <div className="relative h-[200px] flex-shrink-0 bg-[#F5F2EA]">
          <Image
            src={imageUrl}
            alt={product.name}
            width={300}
            height={200}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 300px"
          />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 px-5 py-5 flex-1">
          <h3 className="font-serif font-semibold text-[17px] leading-[22px] text-[#1E3D59] line-clamp-2">
            {product.name}
          </h3>
          <DonationModeBadge donationMode={product.donationMode} />
          <p className="text-[13px] leading-[1.55] text-[#5A6D7E] line-clamp-2">
            {product.description}
          </p>
          {firstCategory && (
            <span className="text-[11px] uppercase tracking-[0.8px] text-[#B8952E]">
              {firstCategory}
            </span>
          )}
        </div>

        {/* Progress footer */}
        <div className="px-5 pt-4 pb-5 border-t border-[#E5DFD4] min-h-[88px] flex flex-col justify-center">
          {isGoalReached ? (
            <div className="flex items-center gap-2 rounded-full py-2 px-5 border-[1.5px] border-[#22A55A] bg-[#ECFDF3] w-fit mx-auto">
              <span className="w-2 h-2 rounded-full bg-[#22A55A] flex-shrink-0" />
              <span className="text-[13px] text-[#15803D]">Meta atingida</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-[#8A7A5C]">Progresso</span>
                <span className="text-[12px] text-[#1E3D59]">{percentage}%</span>
              </div>
              <div className="h-[6px] rounded-full bg-[#E5DFD4] mb-3">
                <div
                  className="h-full rounded-full bg-[#B8952E] transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[#8A7A5C]">
                  {formatCurrency(product.currentAmount)}
                </span>
                <span className="text-[12px] text-[#8A7A5C]">
                  Meta: {formatCurrency(product.targetAmount ?? 0)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
