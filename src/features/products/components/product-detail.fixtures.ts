import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';
import type { PublishedProduct } from './ProductDetail';

const CREATED_AT = new Date('2026-08-12T10:00:00-03:00');

const category = (id: string, name: string, productId: string) => ({
  productId,
  categoryId: id,
  categories: { id, name, createdAt: CREATED_AT, updatedAt: CREATED_AT },
});

/** Item que aceita Pix e doação do material, com parte da meta arrecadada. */
export const projectorProduct: PublishedProduct = {
  id: 'f3b1c2d4-0001-4a5b-9c8d-000000000001',
  name: 'Projetor para a sala de aula',
  description:
    'Projetor multimídia para as aulas do ensino fundamental. Com ele, as professoras ' +
    'podem mostrar mapas, obras de arte e documentos históricos para toda a turma.\n\n' +
    'Quem preferir pode comprar o aparelho e entregá-lo diretamente na secretaria.',
  targetAmount: 350000,
  currentAmount: 128000,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'both',
  productType: 'regular',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  productCategories: [
    category('c0000000-0000-4000-8000-000000000001', 'Sala de aula', 'f3b1c2d4-0001-4a5b-9c8d-000000000001'),
    category('c0000000-0000-4000-8000-000000000002', 'Equipamentos', 'f3b1c2d4-0001-4a5b-9c8d-000000000001'),
  ],
};

/** Bolsa de estudo: só aceita doação em dinheiro. */
export const scholarshipProduct: PublishedProduct = {
  id: 'f3b1c2d4-0002-4a5b-9c8d-000000000002',
  name: 'Bolsa de estudo — 1º ano',
  description:
    'Mensalidades de um aluno do 1º ano durante o ano letivo de 2027. A bolsa garante a ' +
    'permanência de uma criança cuja família não consegue arcar com o valor integral.',
  targetAmount: 960000,
  currentAmount: 312000,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'monetary',
  productType: 'scholarship',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  productCategories: [],
};

/** Item cuja meta em dinheiro já foi atingida. */
export const fundedProduct: PublishedProduct = {
  ...projectorProduct,
  id: 'f3b1c2d4-0003-4a5b-9c8d-000000000003',
  name: 'Carteiras escolares',
  description: 'Vinte carteiras com cadeira para a nova sala do 2º ano.',
  targetAmount: 240000,
  currentAmount: 240000,
  donationMode: 'monetary',
};

export const productImageUrl = PRODUCT_PLACEHOLDER_IMAGE;

/** Código Pix copia e cola fictício. */
export const copiaEColaCode =
  '00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890' +
  '5204000053039865802BR5920COLEGIO SAO JOSE6009SAO PAULO62070503***6304ABCD';
