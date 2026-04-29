import { BroadcastComposer } from '@/features/broadcasts/components/BroadcastComposer';
import { BroadcastHistory } from '@/features/broadcasts/components/BroadcastHistory';
import {
  getBroadcastRecipientCount,
  listBroadcasts,
} from '@/features/broadcasts/queries';

export const dynamic = 'force-dynamic';

export default async function ComunicacoesPage() {
  const [recipientCount, history] = await Promise.all([
    getBroadcastRecipientCount(),
    listBroadcasts(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif font-bold text-[36px] leading-[44px] text-[#1E3D59]">
          Comunicações
        </h1>
        <p className="mt-2 text-[14px] text-[#5A6D7E] max-w-2xl">
          Envie um email para todos os doadores que cadastraram um endereço de
          email no momento da doação. Cada destinatário recebe uma cópia
          individual.
        </p>
      </div>

      <BroadcastComposer recipientCount={recipientCount} />

      <BroadcastHistory items={history} />
    </div>
  );
}
