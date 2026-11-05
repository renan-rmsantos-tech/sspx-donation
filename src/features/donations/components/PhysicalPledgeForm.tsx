'use client';

import { useState } from 'react';
import { useServerAction } from '@/components/server-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type PhysicalPledgeFormProps = {
  productId: string;
  idPrefix?: string;
};

export function PhysicalPledgeForm({
  productId,
  idPrefix = '',
}: PhysicalPledgeFormProps) {
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const createPhysicalPledge = useServerAction('createPhysicalPledge');
  const donorNameInputId = `${idPrefix}donorName`;
  const donorPhoneInputId = `${idPrefix}donorPhone`;
  const donorEmailInputId = `${idPrefix}donorEmail`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createPhysicalPledge({
        productId,
        donorName: donorName.trim(),
        donorPhone: donorPhone.trim(),
        donorEmail: donorEmail.trim(),
      });

      if (result.success) {
        toast.success(
          'Obrigado! Seu compromisso foi registrado. Entraremos em contato em breve para coordenar.'
        );
        setDonorName('');
        setDonorPhone('');
        setDonorEmail('');
      } else {
        toast.error(
          result.error === 'VALIDATION_ERROR'
            ? 'Verifique os campos. Nome, telefone e e-mail são obrigatórios. Telefone deve ser um número brasileiro válido (10-11 dígitos).'
            : result.error === 'ALREADY_FULFILLED'
              ? 'Este item já foi atendido.'
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] leading-[1.6] text-[#5C4F43]">
        Preencha seus dados de contato para registrar seu compromisso de oferecer este item. Entraremos em contato para coordenar a entrega.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={donorNameInputId} className="text-[13px] text-[#5C4F43]">
            Seu Nome <span className="text-[#B5824A]">*</span>
          </Label>
          <Input
            id={donorNameInputId}
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="Nome completo"
            maxLength={200}
            required
            className="bg-[#FAFAF7] border-[#D9CFBE] text-[14px] text-[#2C4A5A] placeholder:text-[#8C7B6B]/60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={donorPhoneInputId} className="text-[13px] text-[#5C4F43]">
            Telefone <span className="text-[#B5824A]">*</span>
          </Label>
          <Input
            id={donorPhoneInputId}
            type="tel"
            value={donorPhone}
            onChange={(e) => setDonorPhone(e.target.value)}
            placeholder="(11) 98765-4321"
            required
            className="bg-[#FAFAF7] border-[#D9CFBE] text-[14px] text-[#2C4A5A] placeholder:text-[#8C7B6B]/60"
          />
          <p className="text-[12px] text-[#8C7B6B]">
            Formato brasileiro: 10-11 dígitos (código de país +55 opcional)
          </p>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#B5824A] text-white text-[16px] leading-[20px] py-3 rounded-lg hover:bg-[#B5824A]/90 transition-colors disabled:opacity-60 mt-2"
        >
          {loading ? 'Enviando...' : 'Registrar Compromisso'}
        </button>
      </form>
    </div>
  );
}
