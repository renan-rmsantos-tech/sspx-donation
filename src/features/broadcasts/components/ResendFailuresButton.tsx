'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { resendFailedBroadcastEmails } from '../actions';

interface ResendFailuresButtonProps {
  broadcastId: string;
  failureCount: number;
}

export function ResendFailuresButton({
  broadcastId,
  failureCount,
}: ResendFailuresButtonProps) {
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    const result = await resendFailedBroadcastEmails({ broadcastId });
    setIsResending(false);

    if (result.success && result.data) {
      const { successCount, failureCount: remaining } = result.data;
      if (remaining === 0) {
        toast.success(
          `Reenvio concluído para ${successCount} destinatário(s).`
        );
      } else {
        toast.warning(
          `${successCount} reenviado(s); ${remaining} ainda com falha.`
        );
      }
      router.refresh();
      return;
    }

    if (result.error === 'UNAUTHORIZED') {
      toast.error('Sua sessão expirou. Entre novamente.');
    } else if (result.error === 'NO_FAILED_RECIPIENTS') {
      toast.info('Não há envios pendentes neste comunicado.');
      router.refresh();
    } else if (result.error === 'MISSING_CONTENT') {
      toast.error(
        'Este comunicado foi enviado antes do novo editor e não pode ser reenviado.'
      );
    } else {
      toast.error('Não foi possível reenviar os envios que falharam.');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={isResending}
      className="h-7 rounded-full border-[#E2A8A8] px-3 text-[12px] text-[#A33232] hover:bg-[#FDECEC]"
    >
      {isResending ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="mr-1 h-3 w-3" />
      )}
      Reenviar {failureCount} falha(s)
    </Button>
  );
}
