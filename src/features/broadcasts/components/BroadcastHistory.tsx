import type { broadcasts } from '@/lib/db/schema';

type Broadcast = typeof broadcasts.$inferSelect;

interface BroadcastHistoryProps {
  items: Broadcast[];
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export function BroadcastHistory({ items }: BroadcastHistoryProps) {
  return (
    <section className="rounded-[12px] border border-[#D4C4A8] bg-white p-6">
      <h2 className="font-serif font-semibold text-[20px] text-[#1E3D59] mb-5">
        Histórico de envios
      </h2>

      {items.length === 0 ? (
        <p className="text-[14px] text-[#5A6D7E]">
          Nenhum email broadcast enviado ainda.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#E5DFD4]">
          {items.map((b) => (
            <li key={b.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h3 className="font-medium text-[15px] text-[#1E3D59]">
                  {b.subject}
                </h3>
                <span className="text-[12px] text-[#8A7A5C]">
                  {formatDateTime(b.createdAt)} · enviado por {b.sentBy}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#5A6D7E] whitespace-pre-wrap line-clamp-3">
                {b.message}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-full bg-[#EDF6EE] border border-[#9BC9A4] text-[#2D6A3F] px-3 py-[2px]">
                  {b.sentSuccessCount} enviados
                </span>
                {b.sentFailureCount > 0 && (
                  <span className="rounded-full bg-[#FDECEC] border border-[#E2A8A8] text-[#A33232] px-3 py-[2px]">
                    {b.sentFailureCount} falhas
                  </span>
                )}
                <span className="rounded-full bg-[#E8EEF4] border border-[#C5D4E2] text-[#1E3D59] px-3 py-[2px]">
                  {b.recipientCount} destinatário(s)
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
