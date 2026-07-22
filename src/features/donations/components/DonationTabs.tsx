'use client';

import { useState } from 'react';
import { MonetaryDonationForm } from './MonetaryDonationForm';
import { PhysicalPledgeForm } from './PhysicalPledgeForm';

type DonationTabsProps = {
  productId: string;
  targetAmount: number | null;
  currentAmount: number;
  qrCodeImageUrl: string | null;
  copiaEColaCode: string | null;
};

export function DonationTabs({
  productId,
  targetAmount,
  currentAmount,
  qrCodeImageUrl,
  copiaEColaCode,
}: DonationTabsProps) {
  const [activeTab, setActiveTab] = useState('monetary');

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex border-b-2 border-[#D9CFBE] mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('monetary')}
          className={[
            'px-6 py-2.5 text-[16px] leading-[20px] -mb-0.5 transition-colors',
            activeTab === 'monetary'
              ? 'border-b-2 border-[#B5824A] text-[#2C4A5A]'
              : 'text-[#8C7B6B] hover:text-[#5C4F43]',
          ].join(' ')}
        >
          Pix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('physical')}
          className={[
            'px-6 py-2.5 text-[16px] leading-[20px] -mb-0.5 transition-colors',
            activeTab === 'physical'
              ? 'border-b-2 border-[#B5824A] text-[#2C4A5A]'
              : 'text-[#8C7B6B] hover:text-[#5C4F43]',
          ].join(' ')}
        >
          Doação de Material
        </button>
      </div>

      {/* Ambos os formulários ficam montados; apenas ocultamos o inativo via
          CSS para que o que o usuário digitou seja preservado ao trocar de aba
          (cada form mantém seu próprio estado local). */}
      <div className={activeTab === 'monetary' ? undefined : 'hidden'}>
        <MonetaryDonationForm
          productId={productId}
          targetAmount={targetAmount ?? 0}
          currentAmount={currentAmount}
          qrCodeImageUrl={qrCodeImageUrl}
          copiaEColaCode={copiaEColaCode}
          idPrefix="monetary-"
        />
      </div>

      <div className={activeTab === 'physical' ? undefined : 'hidden'}>
        <PhysicalPledgeForm productId={productId} idPrefix="physical-" />
      </div>
    </div>
  );
}
