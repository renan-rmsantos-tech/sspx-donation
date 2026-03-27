'use client';

import type { products } from '@/lib/db/schema';

type DonationMode = typeof products.$inferSelect.donationMode;

interface DonationModeBadgeProps {
  donationMode: DonationMode;
}

const modeConfig: Record<DonationMode, { label: string; bg: string; color: string }> = {
  monetary: {
    label: 'Dinheiro',
    bg: '#DCFCE7',
    color: '#15803D',
  },
  physical: {
    label: 'Material',
    bg: '#DBEAFE',
    color: '#1D4ED8',
  },
  both: {
    label: 'Dinheiro ou Material',
    bg: '#F3E8FF',
    color: '#7E22CE',
  },
};

export function DonationModeBadge({ donationMode }: DonationModeBadgeProps) {
  const config = modeConfig[donationMode];

  return (
    <span
      style={{ backgroundColor: config.bg, color: config.color }}
      className="inline-block rounded-full py-[2px] px-[10px] text-[11px] font-medium leading-[18px] w-fit"
    >
      {config.label}
    </span>
  );
}
