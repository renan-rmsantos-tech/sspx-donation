'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PreparedDonationRow } from './DonationsTableServer';

interface ReceiptModalProps {
  donation: PreparedDonationRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptModal({
  donation,
  isOpen,
  onOpenChange,
}: ReceiptModalProps) {
  const [previewError, setPreviewError] = useState(false);

  if (!donation || !donation.receiptUrl) {
    return null;
  }

  const receiptUrl = donation.receiptUrl;
  const urlPathname = receiptUrl.split('?')[0];
  const fileExtension = urlPathname.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  const handleOpenChange = (open: boolean) => {
    setPreviewError(false);
    onOpenChange(open);
  };

  const handlePreviewError = () => {
    setPreviewError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1E3D59]">
            {donation.donorName || 'Doação'}
          </DialogTitle>
          <p className="text-sm text-[#9B7B5A] mt-2">
            {new Date(donation.createdAt).toLocaleDateString('pt-BR')}
            {donation.amount && ` - R$ ${(donation.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {previewError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-[#F5F5F5] rounded-lg">
              <p className="text-sm text-[#666] text-center">
                Erro ao carregar comprovante.
              </p>
              <a
                href={receiptUrl}
                download
                className="text-[#1E3D59] hover:text-[#1E3D59]/80 text-sm font-medium underline"
              >
                Baixar Comprovante
              </a>
            </div>
          ) : isImage ? (
            <img
              src={receiptUrl}
              alt="Comprovante"
              className="max-w-full max-h-[70vh] rounded-lg"
              onError={handlePreviewError}
            />
          ) : isPdf ? (
            <iframe
              src={receiptUrl}
              className="w-full h-[70vh] rounded-lg"
              title="Comprovante PDF"
              onError={handlePreviewError}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-[#F5F5F5] rounded-lg">
              <p className="text-sm text-[#666] text-center">
                Formato não suportado. Use o botão de download para visualizar.
              </p>
            </div>
          )}

          <a
            href={receiptUrl}
            download
            className="w-full inline-block"
          >
            <Button
              variant="default"
              className="w-full"
            >
              Baixar Comprovante
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
