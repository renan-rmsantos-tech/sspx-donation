'use client';

import { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReceiptModal } from './ReceiptModal';
import { DonationsPagination } from './DonationsPagination';
import { toggleDonationVerified } from '../actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { DonationRow } from '../queries';
import type { PreparedDonationRow } from './DonationsTableServer';

interface DonationsTableClientProps {
  rows: PreparedDonationRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function DonationsTableClient({
  rows,
  totalCount,
  totalPages,
  currentPage,
}: DonationsTableClientProps) {
  const [selectedDonation, setSelectedDonation] = useState<PreparedDonationRow | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#666] mb-2">Nenhuma doação encontrada.</p>
        <p className="text-sm text-[#9B7B5A]">Ajuste os filtros e tente novamente.</p>
      </div>
    );
  }

  const handleToggleVerified = (donationId: string) => {
    setTogglingId(donationId);
    startTransition(async () => {
      const result = await toggleDonationVerified(donationId);
      if (!result.success) {
        toast.error('Erro ao atualizar verificação.');
      }
      setTogglingId(null);
    });
  };

  const handleOpenReceipt = (donation: PreparedDonationRow) => {
    setSelectedDonation(donation);
    setIsReceiptModalOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[#1E3D59] font-bold">Doador</TableHead>
              <TableHead className="text-[#1E3D59] font-bold">Tipo</TableHead>
              <TableHead className="text-[#1E3D59] font-bold">Valor/Item</TableHead>
              <TableHead className="text-[#1E3D59] font-bold">Data</TableHead>
              <TableHead className="text-[#1E3D59] font-bold text-center">Verificado</TableHead>
              <TableHead className="text-[#1E3D59] font-bold text-right">Comprovante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-[#333]">
                  {row.donorName || '—'}
                </TableCell>
                <TableCell>
                  {row.donationType === 'monetary' ? (
                    <Badge className="bg-[#DCFCE7] text-[#22A55A] hover:bg-[#DCFCE7]">
                      Monetária
                    </Badge>
                  ) : (
                    <Badge className="bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]">
                      Promessa de Item
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-[#333]">
                  {row.donationType === 'monetary'
                    ? `R$ ${(row.amount! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : row.productName || '—'}
                </TableCell>
                <TableCell className="text-[#666]">
                  {format(new Date(row.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVerified(row.id)}
                    disabled={isPending && togglingId === row.id}
                    className={`h-7 w-7 p-0 rounded-full ${
                      row.isVerified
                        ? 'bg-[#DCFCE7] text-[#22A55A] hover:bg-[#BBF7D0]'
                        : 'bg-[#F3F4F6] text-[#9CA3AF] hover:bg-[#E5E7EB]'
                    }`}
                    title={row.isVerified ? 'Verificado' : 'Não verificado'}
                  >
                    {isPending && togglingId === row.id ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : row.isVerified ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  {row.receiptPath ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReceipt(row)}
                      className="text-[#1E3D59] hover:text-[#1E3D59] hover:bg-[#F5F5F5]"
                    >
                      Ver
                    </Button>
                  ) : (
                    <span className="text-[#999]">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DonationsPagination currentPage={currentPage} totalPages={totalPages} />

      <ReceiptModal
        donation={selectedDonation}
        isOpen={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
      />
    </>
  );
}
