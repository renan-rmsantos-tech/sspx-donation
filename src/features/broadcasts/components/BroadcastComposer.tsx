'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { sendBroadcastEmail } from '../actions';

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

interface BroadcastComposerProps {
  recipientCount: number;
}

export function BroadcastComposer({ recipientCount }: BroadcastComposerProps) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isValid =
    subject.trim().length > 0 &&
    subject.length <= SUBJECT_MAX &&
    message.trim().length > 0 &&
    message.length <= MESSAGE_MAX;

  const handleConfirmedSend = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await sendBroadcastEmail({
        subject: subject.trim(),
        message: message.trim(),
      });

      if (result.success && result.data) {
        const { successCount, failureCount } = result.data;
        if (failureCount === 0) {
          toast.success(
            `Email enviado para ${successCount} destinatário(s).`
          );
        } else {
          toast.warning(
            `Enviado para ${successCount}, ${failureCount} falha(s). Confira os logs.`
          );
        }
        setSubject('');
        setMessage('');
        router.refresh();
      } else if (result.error === 'NO_RECIPIENTS') {
        toast.error('Nenhum doador com email cadastrado.');
      } else if (result.error === 'VALIDATION_ERROR') {
        toast.error('Verifique os campos.');
      } else if (result.error === 'UNAUTHORIZED') {
        toast.error('Sessão expirada. Faça login novamente.');
      } else {
        toast.error('Erro ao enviar broadcast. Tente novamente.');
      }
    });
  };

  const disabled = isPending || recipientCount === 0;

  return (
    <section className="rounded-[12px] border border-[#D4C4A8] bg-white p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="font-serif font-semibold text-[20px] text-[#1E3D59]">
          Enviar email para todos os doadores
        </h2>
        <span className="text-[13px] text-[#5A6D7E]">
          {recipientCount} destinatário(s) elegível(is)
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValid || disabled) return;
          setConfirmOpen(true);
        }}
        className="flex flex-col gap-4"
      >
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
            placeholder="Escreva a mensagem que será enviada a todos os doadores..."
            rows={10}
            className="mt-1 resize-y"
            disabled={isPending}
          />
          <p className="text-xs text-[#999] mt-1 text-right">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isValid || disabled}>
            {isPending ? 'Enviando...' : 'Enviar para todos'}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              O email será enviado para <strong>{recipientCount}</strong>{' '}
              destinatário(s). Esta ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSend} disabled={isPending}>
              Confirmar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
