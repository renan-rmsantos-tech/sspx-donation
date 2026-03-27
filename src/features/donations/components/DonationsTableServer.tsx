import { getDonationsFiltered, type DonationRow } from '../queries';
import { generateSignedDownloadUrl } from '@/lib/storage/supabase';
import { DonationsTableClient } from './DonationsTableClient';
import type { DonationFilters } from '../lib/parse-filters';

export interface PreparedDonationRow extends DonationRow {
  receiptUrl?: string;
}

interface DonationsTableServerProps {
  filters: DonationFilters;
}

export async function DonationsTableServer({
  filters,
}: DonationsTableServerProps) {
  const data = await getDonationsFiltered(filters);

  // Generate signed download URLs for private receipts bucket
  const preparedRows: PreparedDonationRow[] = await Promise.all(
    data.donations.map(async (row) => ({
      ...row,
      receiptUrl: row.receiptPath
        ? await generateSignedDownloadUrl('receipts', row.receiptPath).catch(() => undefined)
        : undefined,
    }))
  );

  return (
    <DonationsTableClient
      rows={preparedRows}
      totalCount={data.totalCount}
      totalPages={data.totalPages}
      currentPage={data.currentPage}
    />
  );
}
