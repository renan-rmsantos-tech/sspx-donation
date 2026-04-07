import { Suspense } from 'react';
import { parseFilters } from '@/features/donations/lib/parse-filters';
import { FinancialSummaryCards } from '@/features/donations/components/FinancialSummaryCards';
import { DonationsFilterBar } from '@/features/donations/components/DonationsFilterBar';
import { DonationsTableServer } from '@/features/donations/components/DonationsTableServer';
import { FinancialSummarySkeleton, DonationsTableSkeleton } from './skeletons';

interface FinanceiroPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinanceiroPage({
  searchParams,
}: FinanceiroPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif font-bold text-[36px] leading-[44px] text-[#1E3D59]">
        Doações
      </h1>

      <Suspense fallback={<FinancialSummarySkeleton />}>
        <FinancialSummaryCards />
      </Suspense>

      <DonationsFilterBar filters={filters} />

      <Suspense key={JSON.stringify(filters)} fallback={<DonationsTableSkeleton />}>
        <DonationsTableServer filters={filters} />
      </Suspense>
    </div>
  );
}
