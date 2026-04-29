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
import { sendBroadcastEmail, sendTestBroadcastEmail } from '../actions';

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;
const SENDER_NAME_MAX = 150;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BroadcastComposerProps {
  recipientCount: number;
}

export function BroadcastComposer({ recipientCount }: BroadcastComposerProps) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [bccEmail, setBccEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const subjectFilled =
    subject.trim().length > 0 && subject.length <= SUBJECT_MAX;
  const messageFilled =
    message.trim().length > 0 && message.length <= MESSAGE_MAX;
  const senderNameFilled =
    senderName.trim().length > 0 && senderName.length <= SENDER_NAME_MAX;
  const bccValid =
    bccEmail.trim().length === 0 || EMAIL_REGEX.test(bccEmail.trim());
  const testEmailValid = EMAIL_REGEX.test(testEmail.trim());

  const isValid = subjectFilled && messageFilled && senderNameFilled && bccValid;

  const handleConfirmedSend = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await sendBroadcastEmail({
        subject: subject.trim(),
        message: message.trim(),
        senderName: senderName.trim(),
        bccEmail: bccEmail.trim() || undefined,
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
        setSenderName('');
        setBccEmail('');
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

  const handleSendTest = () => {
    if (!subjectFilled || !messageFilled || !senderNameFilled) {
      toast.error(
        'Preencha assunto, mensagem e remetente antes de enviar o teste.'
      );
      return;
    }
    if (!testEmailValid) {
      toast.error('Informe um email de teste válido.');
      return;
    }
    startTestTransition(async () => {
      const result = await sendTestBroadcastEmail({
        subject: subject.trim(),
        message: message.trim(),
        senderName: senderName.trim(),
        testEmail: testEmail.trim(),
      });

      if (result.success && result.data) {
        toast.success(`Email de teste enviado para ${result.data.to}.`);
      } else if (result.error === 'VALIDATION_ERROR') {
        toast.error('Verifique os campos.');
      } else if (result.error === 'UNAUTHORIZED') {
        toast.error('Sessão expirada. Faça login novamente.');
      } else {
        toast.error('Erro ao enviar email de teste. Tente novamente.');
      }
    });
  };

  const disabled = isPending || isTesting || recipientCount === 0;
  const testDisabled = isPending || isTesting;

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

        <div>
          <Label className="text-sm font-medium text-[#333]">
            Quem está enviando
          </Label>
          <Input
            value={senderName}
            onChange={(e) =>
              setSenderName(e.target.value.slice(0, SENDER_NAME_MAX))
            }
            placeholder="Ex.: Padre João Maria Ferreira da Costa, FSSPX."
            className="mt-1"
            disabled={isPending}
          />
          <p className="text-xs text-[#999] mt-1">
            Aparecerá como assinatura no final do email enviado aos doadores.
          </p>
          <p className="text-xs text-[#999] mt-1 text-right">
            {senderName.length}/{SENDER_NAME_MAX}
          </p>
        </div>

        <div>
          <Label className="text-sm font-medium text-[#333]">
            Email para cópia oculta (BCC){' '}
            <span className="text-[#999] font-normal">— opcional</span>
          </Label>
          <Input
            type="email"
            value={bccEmail}
            onChange={(e) => setBccEmail(e.target.value)}
            placeholder="ex.: secretaria@colegio.com"
            className="mt-1"
            disabled={isPending}
          />
          <p className="text-xs text-[#999] mt-1">
            Receberá uma cópia oculta de cada email enviado aos doadores.
          </p>
          {!bccValid && (
            <p className="text-xs text-red-600 mt-1">
              Informe um email válido ou deixe em branco.
            </p>
          )}
        </div>

        <div className="rounded-[8px] border border-dashed border-[#D4C4A8] bg-[#FAF7F2] p-4">
          <Label className="text-sm font-medium text-[#333]">
            Enviar email de teste
          </Label>
          <p className="text-xs text-[#5A6D7E] mt-1 mb-2">
            Envie uma prévia para um único endereço para conferir como o email
            chegará aos doadores. O assunto recebe o prefixo{' '}
            <strong>[TESTE]</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ex.: voce@exemplo.com"
              className="flex-1"
              disabled={testDisabled}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTest}
              disabled={testDisabled || !testEmailValid}
            >
              {isTesting ? 'Enviando teste...' : 'Enviar teste'}
            </Button>
          </div>
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
              destinatário(s).
              {bccEmail.trim() && bccValid ? (
                <>
                  {' '}
                  Uma cópia oculta será enviada para{' '}
                  <strong>{bccEmail.trim()}</strong>.
                </>
              ) : null}{' '}
              Esta ação não pode ser desfeita. Deseja continuar?
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
