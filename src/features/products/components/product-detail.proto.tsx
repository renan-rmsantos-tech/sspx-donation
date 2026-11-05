import { definePrototype, type PrototypeProps } from '@compozy/proto';
import { ProductDetail } from './ProductDetail';
import {
  copiaEColaCode,
  fundedProduct,
  productImageUrl,
  projectorProduct,
  scholarshipProduct,
} from './product-detail.fixtures';

export const meta = definePrototype({
  title: 'Página do item para doação',
  spec: 'publico',
  route: '/products/f3b1c2d4-0001-4a5b-9c8d-000000000001',
  standalone: true,
  states: [
    { id: 'pix-e-material', label: 'Pix ou doação do material' },
    { id: 'bolsa-so-pix', label: 'Bolsa de estudo, só Pix' },
    { id: 'pix-nao-configurado', label: 'Pix ainda não configurado' },
    { id: 'meta-atingida', label: 'Meta atingida' },
  ],
});

/**
 * Os formulários enviam pelas server actions de fixture do `Canvas`: o envio
 * do Pix (com qualquer arquivo como comprovante) e o compromisso de material
 * mostram o aviso de sucesso real.
 */
export default function Prototype({ state }: PrototypeProps) {
  const product =
    state === 'bolsa-so-pix' || state === 'pix-nao-configurado'
      ? scholarshipProduct
      : state === 'meta-atingida'
        ? fundedProduct
        : projectorProduct;
  return (
    <ProductDetail
      product={product}
      productImageUrl={productImageUrl}
      qrCodeImageUrl={null}
      copiaEColaCode={state === 'pix-nao-configurado' ? null : copiaEColaCode}
    />
  );
}
