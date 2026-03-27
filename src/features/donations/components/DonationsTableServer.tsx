import { getDonationsFiltered, type DonationRow } from '../queries';
import { getPublicUrl } from '@/lib/storage/public-url';
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

  // Resolve receipt URLs for all donations
  const preparedRows: PreparedDonationRow[] = data.donations.map((row) => ({
    ...row,
    receiptUrl: row.receiptPath ? getPublicUrl('receipts', row.receiptPath) : undefined,
  }));

  return (
    <DonationsTableClient
      rows={preparedRows}
      totalCount={data.totalCount}
      totalPages={data.totalPages}
      currentPage={data.currentPage}
    />
  );
}
