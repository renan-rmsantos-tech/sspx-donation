import { definePrototype, type PrototypeProps } from '@compozy/proto';
import { AdminDashboard } from './AdminDashboard';
import {
  activeStats,
  emptyStats,
  transfersAvailableStats,
} from './admin-dashboard.fixtures';

export const meta = definePrototype({
  title: 'Painel do admin',
  spec: 'painel',
  route: '/admin/dashboard',
  states: [
    { id: 'com-doacoes', label: 'Com doações' },
    { id: 'transferencias-disponiveis', label: 'Transferências disponíveis' },
    { id: 'sem-doacoes', label: 'Sem doações' },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  return (
    <AdminDashboard
      stats={
        state === 'sem-doacoes'
          ? emptyStats
          : state === 'transferencias-disponiveis'
            ? transfersAvailableStats
            : activeStats
      }
    />
  );
}
