'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFundTransfer } from '../actions';
import { formatCurrency } from '@/lib/utils/format';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Product = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number | null;
};

type FundTransferFormProps = {
  sourceProducts: Product[];
  targetProducts: Product[];
  onSuccess?: () => void;
};

export function FundTransferForm({
  sourceProducts,
  targetProducts,
  onSuccess,
}: FundTransferFormProps) {
  const router = useRouter();
  const [sourceProductId, setSourceProductId] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const sourceProduct = sourceProducts.find((p) => p.id === sourceProductId);
  // Transferable amount is only the surplus: currentAmount - targetAmount
  const surplusCents =
    sourceProduct && sourceProduct.targetAmount !== null
      ? sourceProduct.currentAmount - sourceProduct.targetAmount
      : (sourceProduct?.currentAmount ?? 0);
  const maxAmountReais = sourceProduct ? surplusCents / 100 : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!sourceProductId || !targetProductId) {
        toast.error('Selecione os produtos de origem e destino.');
        setLoading(false);
        return;
      }

      if (sourceProductId === targetProductId) {
        toast.error('Os produtos de origem e destino devem ser diferentes.');
        setLoading(false);
        return;
      }

      const amountCents = Math.round(parseFloat(amount) * 100);
      if (amountCents < 100) {
        toast.error('Transferência mínima é R$ 1,00.');
        setLoading(false);
        return;
      }

      if (sourceProduct && amountCents > surplusCents) {
        toast.error(
          `Valor excede o excedente disponível. Máximo: ${formatCurrency(surplusCents)}`
        );
        setLoading(false);
        return;
      }

      const result = await createFundTransfer({
        sourceProductId,
        targetProductId,
        amount: amountCents,
      });

      if (result.success) {
        toast.success('Transferência realizada com sucesso!');
        setSourceProductId('');
        setTargetProductId('');
        setAmount('');
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(
          result.error === 'INSUFFICIENT_BALANCE'
            ? `Excedente insuficiente. Disponível: ${formatCurrency(surplusCents)}`
            : result.error === 'VALIDATION_ERROR'
              ? 'Verifique os campos. Certifique-se de que origem e destino são diferentes e o valor é válido.'
              : result.error === 'PRODUCT_NOT_FOUND'
                ? 'Um ou ambos os produtos não foram encontrados.'
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
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <h2 className="text-xl font-semibold">Nova Transferência</h2>
        <p className="text-sm text-muted-foreground">
          Transfira fundos monetários entre produtos. A transferência será
          registrada no histórico para auditoria.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {sourceProduct && (
            <Alert>
              <AlertDescription>
                Excedente disponível para transferência:{' '}
                <strong>{formatCurrency(surplusCents)}</strong>
                {sourceProduct.targetAmount !== null && (
                  <span className="text-muted-foreground">
                    {' '}
                    (meta: {formatCurrency(sourceProduct.targetAmount)} · arrecadado:{' '}
                    {formatCurrency(sourceProduct.currentAmount)})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="sourceProduct">Produto de Origem *</Label>
            <Select value={sourceProductId} onValueChange={setSourceProductId}>
              <SelectTrigger id="sourceProduct">
                <SelectValue placeholder="Selecione o produto de origem" />
              </SelectTrigger>
              <SelectContent>
                {sourceProducts.map((product) => {
                  const surplus =
                    product.targetAmount !== null
                      ? product.currentAmount - product.targetAmount
                      : product.currentAmount;
                  return (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (excedente: {formatCurrency(surplus)})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetProduct">Produto de Destino *</Label>
            <Select value={targetProductId} onValueChange={setTargetProductId}>
              <SelectTrigger id="targetProduct">
                <SelectValue placeholder="Selecione o produto de destino" />
              </SelectTrigger>
              <SelectContent>
                {targetProducts
                  .filter((p) => p.id !== sourceProductId)
                  .map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmountReais}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              {sourceProduct
                ? `Mínimo R$ 1,00 · Máximo ${formatCurrency(surplusCents)}`
                : 'Mínimo R$ 1,00'}
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Processando...' : 'Realizar Transferência'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
