import { formatCurrency } from '@/lib/utils/format';
import type { DashboardStats } from '../queries';

interface DashboardStatsCardsProps {
  stats: DashboardStats;
}

const LOCALE_PT_BR = 'pt-BR';

const cardClass =
  'flex-1 bg-white border border-[#EDE5DA] rounded-xl flex flex-col gap-3 pt-7 pl-7 pr-7 pb-6';
const cardStyle = { boxShadow: '#1C14100D 0px 2px 12px' };
const labelClass = 'text-[12px] uppercase tracking-[1px] leading-4 text-[#9B7B5A] m-0';
const valueClass = 'font-serif font-bold text-[36px] leading-none text-[#1E3D59] m-0';
const subtitleClass = 'text-[12px] leading-4 text-[#9B7B5A] m-0';

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Total de Doações em Dinheiro</p>
          <p className={valueClass}>
            {formatCurrency(stats.totalMonetaryDonations, LOCALE_PT_BR)}
          </p>
          <p className={subtitleClass}>Total arrecadado em todas as doações</p>
        </div>

        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Total da Semana</p>
          <p className={valueClass}>
            {formatCurrency(stats.weeklyMonetaryTotal, LOCALE_PT_BR)}
          </p>
          <p className={subtitleClass}>Doações em dinheiro (Dom-Sáb)</p>
        </div>

        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Total do Mês</p>
          <p className={valueClass}>
            {formatCurrency(stats.monthlyMonetaryTotal, LOCALE_PT_BR)}
          </p>
          <p className={subtitleClass}>Doações em dinheiro (mês corrente)</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Total de Doações</p>
          <p className={valueClass}>{stats.totalDonationCount}</p>
          <p className={subtitleClass}>Todas as doações registradas</p>
        </div>

        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Itens Atendidos</p>
          <p
            className={`font-serif font-bold text-[36px] leading-none m-0 ${
              stats.totalPhysicalFulfilled > 0 ? 'text-[#22A55A]' : 'text-[#1E3D59]'
            }`}
          >
            {stats.totalPhysicalFulfilled}
          </p>
          <p className={subtitleClass}>Itens que atingiram a meta</p>
        </div>

        <div className={cardClass} style={cardStyle}>
          <p className={labelClass}>Itens Pendentes</p>
          <p className={valueClass}>{stats.totalPhysicalPending}</p>
          <p className={subtitleClass}>Itens ainda sem meta atingida</p>
        </div>
      </div>
    </div>
  );
}
