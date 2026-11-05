'use client';

import { useState, useRef } from 'react';
import { useServerAction } from '@/components/server-actions';
import { formatCurrency } from '@/lib/utils/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type MonetaryDonationFormProps = {
  productId: string;
  targetAmount: number;
  currentAmount: number;
  qrCodeImageUrl: string | null;
  copiaEColaCode: string | null;
  idPrefix?: string;
};

export function MonetaryDonationForm({
  productId,
  targetAmount,
  currentAmount,
  qrCodeImageUrl,
  copiaEColaCode,
  idPrefix = '',
}: MonetaryDonationFormProps) {
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMonetaryDonation = useServerAction('createMonetaryDonation');
  const uploadFile = useServerAction('uploadFile');

  const remaining = Math.max(0, targetAmount - currentAmount);
  const hasPixSettings = qrCodeImageUrl || copiaEColaCode;

  const handleCopy = async () => {
    if (!copiaEColaCode) return;
    try {
      await navigator.clipboard.writeText(copiaEColaCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o código.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalReceiptPath = receiptPath;

      if (receiptFile && !receiptPath) {
        const formData = new FormData();
        formData.set('bucket', 'receipts');
        formData.set('file', receiptFile);

        const uploadResult = await uploadFile(formData);

        if (!uploadResult.success || !uploadResult.data) {
          const detail =
            uploadResult.details &&
            typeof uploadResult.details === 'object' &&
            'message' in uploadResult.details
              ? String(uploadResult.details.message)
              : null;
          toast.error(
            detail
              ? `Falha ao enviar comprovante: ${detail}`
              : 'Falha ao enviar comprovante. Tente novamente.'
          );
          setLoading(false);
          return;
        }

        finalReceiptPath = uploadResult.data.path;
      }

      if (!finalReceiptPath) {
        toast.error('Por favor, envie o comprovante de pagamento PIX.');
        setLoading(false);
        return;
      }

      const amountCents = Math.round(parseFloat(amount) * 100);
      if (amountCents < 100) {
        toast.error('Doação mínima é R$ 1,00.');
        setLoading(false);
        return;
      }

      const result = await createMonetaryDonation({
        productId,
        amount: amountCents,
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim(),
        receiptPath: finalReceiptPath,
      });

      if (result.success) {
        toast.success('Obrigado! Sua doação foi registrada com sucesso.');
        setAmount('');
        setDonorName('');
        setDonorEmail('');
        setReceiptFile(null);
        setReceiptPath(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(
          result.error === 'VALIDATION_ERROR'
            ? 'Verifique os campos. Valor deve ser pelo menos R$ 1,00, e-mail válido e comprovante são obrigatórios.'
            : result.error === 'ALREADY_FUNDED'
              ? 'Esta campanha já atingiu a meta.'
              : result.error === 'PRODUCT_NOT_FOUND'
                ? 'Produto não encontrado.'
                : 'Ocorreu um erro. Tente novamente.'
        );
      }
    } catch {
      toast.error('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const amountInputId = `${idPrefix}amount`;
  const donorNameInputId = `${idPrefix}donorName`;
  const donorEmailInputId = `${idPrefix}donorEmail`;
  const receiptInputId = `${idPrefix}receipt`;

  if (!hasPixSettings) {
    return (
      <div
        className="rounded-lg px-4 py-3.5 border"
        style={{
          backgroundColor: 'rgba(181,130,74,0.08)',
          borderColor: 'rgba(181,130,74,0.3)',
        }}
      >
        <p className="text-[14px] text-[#7A5C2E]">
          Os dados de pagamento PIX ainda não foram configurados. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* QR Code + instructions + pix code */}
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-6 min-w-0">
        {/* QR Code box */}
        <div className="flex-shrink-0 w-[140px] h-[140px] mx-auto sm:mx-0 rounded-lg border border-[#D9CFBE] bg-[#EDE9DE] flex flex-col items-center justify-center gap-2">
          {qrCodeImageUrl ? (
            <img
              src={qrCodeImageUrl}
              alt="QR Code PIX"
              className="w-[110px] h-[110px] object-contain"
            />
          ) : (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="#B5824A" strokeWidth="2" />
              <rect x="28" y="4" width="16" height="16" rx="2" stroke="#B5824A" strokeWidth="2" />
              <rect x="4" y="28" width="16" height="16" rx="2" stroke="#B5824A" strokeWidth="2" />
              <rect x="8" y="8" width="8" height="8" fill="#B5824A" rx="1" />
              <rect x="32" y="8" width="8" height="8" fill="#B5824A" rx="1" />
              <rect x="8" y="32" width="8" height="8" fill="#B5824A" rx="1" />
              <rect x="28" y="28" width="4" height="4" fill="#B5824A" />
              <rect x="34" y="28" width="4" height="4" fill="#B5824A" />
              <rect x="28" y="34" width="4" height="4" fill="#B5824A" />
              <rect x="34" y="34" width="4" height="4" fill="#B5824A" />
              <rect x="40" y="28" width="4" height="4" fill="#B5824A" />
              <rect x="40" y="34" width="4" height="4" fill="#B5824A" />
            </svg>
          )}
          <span className="text-[11px] text-[#8C7B6B] leading-[14px]">QR Code</span>
        </div>

        {/* Instructions + copy code */}
        <div className="min-w-0 flex-1 flex flex-col gap-3 pt-0 sm:pt-1">
          <p className="text-[14px] leading-[1.6] text-[#5C4F43]">
            Escaneie o QR Code com o aplicativo do seu banco ou use o código Pix abaixo para fazer sua doação.
          </p>
          {copiaEColaCode && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
              <div className="min-w-0 flex-1 bg-[#EDE9DE] border border-[#D9CFBE] rounded-md px-3.5 py-2.5 overflow-hidden">
                <p className="text-[14px] text-[#2C4A5A] break-all">{copiaEColaCode}</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto sm:min-w-[80px] flex-shrink-0 bg-[#2C4A5A] text-white text-[14px] leading-[18px] px-4 py-2.5 rounded-md hover:bg-[#2C4A5A]/90 transition-colors"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1 border-t border-[#E4DDD1]">
        {/* Amount */}
        <div className="flex flex-col gap-2.5 pt-4">
          <p className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#8C7B6B] leading-[16px]">
            Informe o valor que deseja doar
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#FAFAF7] border border-[#D9CFBE] rounded-lg px-4 py-3">
              <span className="text-[14px] text-[#8C7B6B] leading-[18px]">R$</span>
              <input
                id={amountInputId}
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${formatCurrency(remaining).replace('R$\u00a0', '')}`}
                required
                className="flex-1 bg-transparent text-[14px] font-medium text-[#2C4A5A] leading-[18px] outline-none placeholder:text-[#8C7B6B]/60"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex-shrink-0 bg-[#B5824A] text-white text-[16px] leading-[20px] px-6 py-3 rounded-lg hover:bg-[#B5824A]/90 transition-colors disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Registrar Doação'}
            </button>
          </div>
          <p className="text-[12px] text-[#8C7B6B]">
            Mínimo R$ 1,00 · Restante: {formatCurrency(remaining)}
          </p>
        </div>

        {/* Donor info */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={donorNameInputId} className="text-[13px] text-[#5C4F43]">
              Seu Nome <span className="text-[#8C7B6B]">(opcional)</span>
            </Label>
            <Input
              id={donorNameInputId}
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Deixe em branco para doar anonimamente"
              maxLength={200}
              className="bg-[#FAFAF7] border-[#D9CFBE] text-[14px] text-[#2C4A5A] placeholder:text-[#8C7B6B]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={donorEmailInputId} className="text-[13px] text-[#5C4F43]">
              E-mail <span className="text-[#B5824A]">*</span>
            </Label>
            <Input
              id={donorEmailInputId}
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="bg-[#FAFAF7] border-[#D9CFBE] text-[14px] text-[#2C4A5A] placeholder:text-[#8C7B6B]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={receiptInputId} className="text-[13px] text-[#5C4F43]">
              Comprovante de Pagamento <span className="text-[#B5824A]">*</span>
            </Label>
            <Input
              ref={fileInputRef}
              id={receiptInputId}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setReceiptFile(file ?? null);
                setReceiptPath(null);
              }}
              className="bg-[#FAFAF7] border-[#D9CFBE] text-[13px] text-[#5C4F43]"
            />
            <p className="text-[12px] text-[#8C7B6B]">
              Foto ou PDF do comprovante da transferência PIX.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
