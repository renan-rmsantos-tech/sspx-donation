'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BroadcastContentV1 } from '../content';
import { renderBroadcastEmailHtml } from '../email';

interface EmailPreviewProps {
  subject: string;
  senderName: string;
  signatureText: string;
  content: BroadcastContentV1;
  mode: 'desktop' | 'mobile';
  onModeChange: (mode: 'desktop' | 'mobile') => void;
}

export function EmailPreview({
  subject,
  senderName,
  signatureText,
  content,
  mode,
  onModeChange,
}: EmailPreviewProps) {
  const html = renderBroadcastEmailHtml({
    subject: subject.trim() || 'Prévia do comunicado',
    senderName: senderName.trim() || 'Responsável pelo comunicado',
    signatureText,
    content,
  });

  return (
    <section
      className="flex min-h-0 flex-col"
      aria-labelledby="broadcast-preview-heading"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="broadcast-preview-heading"
            className="text-lg font-semibold text-[#1E3D59]"
          >
            Prévia do email
          </h2>
          <p className="text-sm text-[#536A7B]">
            Esta é a mesma estrutura HTML usada no envio.
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-[#CDBD9F] bg-white p-1"
          role="group"
          aria-label="Largura da prévia"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={mode === 'desktop'}
            className={cn(
              'h-9',
              mode === 'desktop' && 'bg-[#1E3D59] text-white hover:bg-[#1E3D59] hover:text-white'
            )}
            onClick={() => onModeChange('desktop')}
          >
            <Monitor aria-hidden="true" />
            Desktop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={mode === 'mobile'}
            className={cn(
              'h-9',
              mode === 'mobile' && 'bg-[#1E3D59] text-white hover:bg-[#1E3D59] hover:text-white'
            )}
            onClick={() => onModeChange('mobile')}
          >
            <Smartphone aria-hidden="true" />
            Celular
          </Button>
        </div>
      </div>
      <div className="min-h-[680px] overflow-auto rounded-xl bg-[#D9D2C8] p-3 sm:p-5">
        <iframe
          title="Prévia do comunicado"
          srcDoc={html}
          sandbox=""
          className={cn(
            'mx-auto block h-[760px] border-0 bg-white transition-[width] duration-200',
            mode === 'desktop' ? 'w-[600px] max-w-full' : 'w-[375px] max-w-full'
          )}
        />
      </div>
    </section>
  );
}
