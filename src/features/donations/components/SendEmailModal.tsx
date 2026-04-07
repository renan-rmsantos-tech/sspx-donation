'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sendThankYouEmail } from '../actions';
import { toast } from 'sonner';
import type { PreparedDonationRow } from './DonationsTableServer';

interface SendEmailModalProps {
  donation: PreparedDonationRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUBJECT_MAX = 100;
const MESSAGE_MAX = 300;

export function SendEmailModal({
  donation,
  isOpen,
  onOpenChange,
}: SendEmailModalProps) {
  const [subject, setSubject] = useState('Agradecimento pela doação recebida');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!donation || !donation.donorEmail) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSubject('Agradecimento pela doação recebida');
      setMessage('');
    }
    onOpenChange(open);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await sendThankYouEmail({
        donationId: donation.id,
        donorEmail: donation.donorEmail!,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (result.success) {
        toast.success('Email enviado com sucesso!');
        handleOpenChange(false);
      } else {
        toast.error('Erro ao enviar email. Tente novamente.');
      }
    });
  };

  const isValid =
    subject.trim().length > 0 &&
    subject.length <= SUBJECT_MAX &&
    message.trim().length > 0 &&
    message.length <= MESSAGE_MAX;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1E3D59]">
            Enviar Email
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label className="text-sm font-medium text-[#333]">Para</Label>
            <Input
              value={donation.donorEmail}
              disabled
              className="mt-1 bg-[#F5F5F5] text-[#666]"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-[#333]">Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
              placeholder="Assunto do email"
              className="mt-1"
              disabled={isPending}
            />
            <p className="text-xs text-[#999] mt-1 text-right">
              {subject.length}/{SUBJECT_MAX}
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-[#333]">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              placeholder="Escreva sua mensagem de agradecimento..."
              rows={5}
              className="mt-1 resize-none"
              disabled={isPending}
            />
            <p className="text-xs text-[#999] mt-1 text-right">
              {message.length}/{MESSAGE_MAX}
            </p>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isPending}
            className="w-full"
          >
            {isPending ? 'Enviando...' : 'Enviar Email'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
