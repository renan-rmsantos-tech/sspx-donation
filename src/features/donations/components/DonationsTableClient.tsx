'use client';

import { useState } from 'react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#666] mb-2">Nenhuma doação encontrada.</p>
        <p className="text-sm text-[#9B7B5A]">Ajuste os filtros e tente novamente.</p>
      </div>
    );
  }

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
