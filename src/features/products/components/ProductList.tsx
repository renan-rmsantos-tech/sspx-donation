'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deleteProduct } from '../actions';
import { formatCurrency } from '@/lib/utils/format';
import { getPublicUrl } from '@/lib/storage/public-url';
import { DonationModeBadge } from './DonationModeBadge';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type DonationMode = 'monetary' | 'physical' | 'both';

type Product = {
  id: string;
  name: string;
  targetAmount: number | null;
  currentAmount: number;
  isFulfilled: boolean;
  isPublished: boolean;
  imagePath?: string | null;
  donationMode: DonationMode;
};

export function ProductList({ products }: { products: Product[] }) {
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const result = await deleteProduct(id);
    if (result.success) {
      setDialogOpen(null);
      toast.success('Produto excluído.');
    } else {
      toast.error('Erro ao excluir produto.');
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-bold text-[36px] leading-[44px] text-[#1E3D59]">
          Produtos
        </h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 h-11 bg-[#1E3D59] px-5 rounded-[10px] text-[#FAF8F5] text-[14px] leading-[18px] hover:bg-[#1E3D59]/90 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Produto
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="bg-white border border-[#D4C4A8] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center bg-[#E8EEF4] border-b border-[#EDE5DA] py-3.5 px-6 gap-4">
            <span className="w-12 flex-shrink-0 text-[11px] uppercase tracking-[1px] leading-[14px] text-[#9B7B5A]">
              Foto
            </span>
            <span className="flex-[2_1_0%] text-[11px] uppercase tracking-[1px] leading-[14px] text-[#9B7B5A]">
              Nome
            </span>
            <span className="flex-[1_1_0%] text-[11px] uppercase tracking-[1px] leading-[14px] text-[#9B7B5A]">
              Status
            </span>
            <span className="w-[140px] flex-shrink-0 text-[11px] uppercase tracking-[1px] leading-[14px] text-[#9B7B5A] text-right">
              Ações
            </span>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {products.map((product, index) => {
              const imageUrl = product.imagePath
                ? getPublicUrl('product-photos', product.imagePath)
                : null;

              return (
              <div
                key={product.id}
                className={`flex items-center gap-4 py-4 px-6 border-b border-[#F5F0EB] last:border-b-0 ${
                  index % 2 === 1 ? 'bg-[#FEFCFB]' : ''
                }`}
              >
                <div className="w-12 h-12 flex-shrink-0 rounded border border-[#D4C4A8] overflow-hidden bg-[#F5F2EA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl ?? PRODUCT_PLACEHOLDER_IMAGE}
                    alt={product.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = PRODUCT_PLACEHOLDER_IMAGE;
                    }}
                  />
                </div>

                <span className="flex-[2_1_0%] text-[14px] leading-[18px] text-[#1C1410]">
                  {product.name}
                </span>

                <div className="flex-[1_1_0%] flex flex-col gap-1 items-start">
                  <DonationModeBadge donationMode={product.donationMode} />
                  {product.donationMode === 'monetary' && (
                    <span className={`text-[12px] leading-4 ${product.isFulfilled ? 'text-[#22A55A]' : 'text-[#4A3728]'}`}>
                      {product.isFulfilled
                        ? 'Meta atingida'
                        : `${formatCurrency(product.currentAmount)} de ${formatCurrency(product.targetAmount ?? 0)}`}
                    </span>
                  )}
                  {product.donationMode === 'physical' && (
                    <span className={`text-[12px] leading-4 ${product.isFulfilled ? 'text-[#22A55A]' : 'text-[#4A3728]'}`}>
                      {product.isFulfilled ? 'Atendido' : 'Pendente'}
                    </span>
                  )}
                  {product.donationMode === 'both' && (
                    <span className="text-[12px] leading-4 text-[#4A3728]">
                      {`${formatCurrency(product.currentAmount)} de ${formatCurrency(product.targetAmount ?? 0)} · Material: ${product.isFulfilled ? 'Atendido' : 'Pendente'}`}
                    </span>
                  )}
                </div>

                <div className="w-[140px] flex-shrink-0 flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="text-[13px] leading-4 text-[#4A3728] hover:text-[#1C1410] transition-colors"
                  >
                    Editar
                  </Link>
                  <AlertDialog
                    open={dialogOpen === product.id}
                    onOpenChange={(open) => !open && setDialogOpen(null)}
                  >
                    <AlertDialogTrigger asChild>
                      <button
                        className="text-[13px] leading-4 text-[#C0392B] hover:text-[#a93226] transition-colors"
                        onClick={() => setDialogOpen(product.id)}
                      >
                        Deletar
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o produto &quot;{product.name}&quot;?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[#9B7B5A] text-[14px]">Nenhum produto cadastrado.</p>
      )}
    </div>
  );
}
