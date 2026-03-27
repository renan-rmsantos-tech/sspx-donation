import { getFinancialSummary } from '../queries';
import { formatCurrency } from '@/lib/utils/format';

const LOCALE_PT_BR = 'pt-BR';

export async function FinancialSummaryCards() {
  const summary = await getFinancialSummary();

  return (
    <div className="flex gap-6">
      <div
        className="flex-1 bg-white border border-[#EDE5DA] rounded-xl flex flex-col gap-3 pt-7 pl-7 pr-7 pb-6"
        style={{ boxShadow: '#1C14100D 0px 2px 12px' }}
      >
        <p className="text-[12px] uppercase tracking-[1px] leading-4 text-[#9B7B5A] m-0">
          Total da Semana
        </p>
        <p className="font-serif font-bold text-[36px] leading-none text-[#1E3D59] m-0">
          {formatCurrency(summary.weeklyTotal, LOCALE_PT_BR)}
        </p>
        <p className="text-[12px] leading-4 text-[#9B7B5A] m-0">
          Doações em dinheiro (Dom-Sab)
        </p>
      </div>

      <div
        className="flex-1 bg-white border border-[#EDE5DA] rounded-xl flex flex-col gap-3 pt-7 pl-7 pr-7 pb-6"
        style={{ boxShadow: '#1C14100D 0px 2px 12px' }}
      >
        <p className="text-[12px] uppercase tracking-[1px] leading-4 text-[#9B7B5A] m-0">
          Total do Mês
        </p>
        <p className="font-serif font-bold text-[36px] leading-none text-[#1E3D59] m-0">
          {formatCurrency(summary.monthlyTotal, LOCALE_PT_BR)}
        </p>
        <p className="text-[12px] leading-4 text-[#9B7B5A] m-0">
          Doações em dinheiro (mês corrente)
        </p>
      </div>
    </div>
  );
}
