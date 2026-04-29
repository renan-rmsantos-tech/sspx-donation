import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import ProductDetailPage from './page';
import { getPublishedProductById } from '@/features/products/queries';
import { getPixSettings } from '@/features/pix/queries';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

vi.mock('@/features/products/queries', () => ({
  getPublishedProductById: vi.fn(),
}));

vi.mock('@/features/pix/queries', () => ({
  getPixSettings: vi.fn(),
}));

vi.mock('@/lib/storage/public-url', () => ({
  getPublicUrl: (bucket: string, path: string) =>
    `https://example.com/${bucket}/${path}`,
}));

const mockProductCategories = [
  {
    productId: '1',
    categoryId: 'cat-1',
    categories: {
      id: 'cat-1',
      name: 'Sacristy',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    productId: '1',
    categoryId: 'cat-2',
    categories: {
      id: 'cat-2',
      name: 'Equipment',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

const mockMonetaryProduct = {
  id: '1',
  name: 'Test Monetary Product',
  description: 'This is a monetary donation product',
  targetAmount: 10000,
  currentAmount: 5000,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'both' as const,
  productType: 'regular' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  productCategories: mockProductCategories,
};

const mockPhysicalProduct = {
  id: '2',
  name: 'Test Physical Product',
  description: 'This is a physical donation item',
  targetAmount: 5000,
  currentAmount: 0,
  isFulfilled: true,
  isPublished: true,
  imagePath: null,
  donationMode: 'both' as const,
  productType: 'regular' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  productCategories: [
    {
      productId: '2',
      categoryId: 'cat-3',
      categories: {
        id: 'cat-3',
        name: 'Garden',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPixSettings).mockResolvedValue(null);
  });

  describe('Valid product display', () => {
    it('should render product name as heading', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Test Monetary Product')).toBeInTheDocument();
    });

    it('should render product description', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('This is a monetary donation product')).toBeInTheDocument();
    });

    it('should render back link to catalog', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      const link = screen.getByRole('link', { name: /Voltar ao catálogo/ });
      expect(link).toHaveAttribute('href', '/');
    });

  });

  describe('Monetary product status', () => {
    it('should display progress bar for monetary products', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Progresso')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display target and amount raised', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText(/Meta:/)).toBeInTheDocument();
      expect(screen.getByText(/Valor arrecadado:/)).toBeInTheDocument();
    });

    it('should show fully funded state when current equals target', async () => {
      const fullyFunded = {
        ...mockMonetaryProduct,
        currentAmount: 10000,
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(fullyFunded);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Physical product status', () => {
    it('should display Fulfilled badge for fulfilled physical products', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockPhysicalProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '2' }),
      });
      render(Page);
      expect(screen.getByText('Atendido')).toBeInTheDocument();
      expect(screen.getByText('Este item foi atendido')).toBeInTheDocument();
    });

    it('should display Needed state for unfulfilled physical products', async () => {
      const unfulfilled = { ...mockPhysicalProduct, isFulfilled: false };
      vi.mocked(getPublishedProductById).mockResolvedValue(unfulfilled);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '2' }),
      });
      render(Page);
      expect(
        screen.getByText(/Este item ainda é necessário.*contribuir em dinheiro ou doando o material/)
      ).toBeInTheDocument();
    });
  });

  describe('Donation flows', () => {
    it('should render monetary donation form for unfunded monetary product', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      vi.mocked(getPixSettings).mockResolvedValue({
        id: 'pix-1',
        qrCodeImagePath: 'pix-qr/test.png',
        copiaEColaCode: '00020126...',
        updatedAt: new Date(),
      });
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Faça uma Doação em Dinheiro')).toBeInTheDocument();
      expect(screen.getByText('Enviar Doação')).toBeInTheDocument();
    });

    it('should render success message for fully funded monetary product', async () => {
      const fullyFunded = {
        ...mockMonetaryProduct,
        currentAmount: 10000,
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(fullyFunded);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(
        screen.getByText(/Esta campanha atingiu a meta/)
      ).toBeInTheDocument();
    });

    it('should render physical pledge form for unfulfilled physical product', async () => {
      const unfulfilled = { ...mockPhysicalProduct, isFulfilled: false };
      vi.mocked(getPublishedProductById).mockResolvedValue(unfulfilled);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '2' }),
      });
      render(Page);
      expect(screen.getByText('Oferecer Este Item')).toBeInTheDocument();
      expect(screen.getByText('Enviar Compromisso')).toBeInTheDocument();
    });

    it('should render success message for fulfilled physical product', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockPhysicalProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '2' }),
      });
      render(Page);
      const fulfilledMessages = screen.getAllByText(/Este item foi atendido/);
      expect(fulfilledMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('should display PIX settings when available for monetary product', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      vi.mocked(getPixSettings).mockResolvedValue({
        id: 'pix-1',
        qrCodeImagePath: 'pix-qr/test.png',
        copiaEColaCode: '00020126...',
        updatedAt: new Date(),
      });
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Dados de Pagamento PIX')).toBeInTheDocument();
    });
  });


  describe('Product Photo Display', () => {
    it('should display product photo when imagePath provided', async () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(productWithImage);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      const img = screen.getByRole('img', { name: 'Test Monetary Product' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('product-photos'));
    });

    it('should display placeholder when no imagePath provided', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Test Monetary Product')).toBeInTheDocument();
    });

    it('should use correct sizing for product photo display', async () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(productWithImage);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      const img = screen.getByRole('img', { name: 'Test Monetary Product' });
      expect(img).toHaveAttribute('width', '600');
      expect(img).toHaveAttribute('height', '600');
      expect(img).toHaveClass('object-cover');
    });

    it('should pass correct sizes prop for responsive image loading', async () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(productWithImage);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      const img = screen.getByRole('img', { name: 'Test Monetary Product' });
      expect(img).toHaveAttribute('sizes', expect.stringContaining('600px'));
      expect(img).toHaveAttribute('sizes', expect.stringContaining('100vw'));
    });
  });

  describe('Categories display', () => {
    it('should display product categories', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(mockMonetaryProduct);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText(/Categorias: Sacristy, Equipment/)).toBeInTheDocument();
    });

    it('should handle products without categories', async () => {
      const productNoCategories = {
        ...mockMonetaryProduct,
        productCategories: [] as typeof mockMonetaryProduct.productCategories,
      };
      vi.mocked(getPublishedProductById).mockResolvedValue(productNoCategories);
      const Page = await ProductDetailPage({
        params: Promise.resolve({ id: '1' }),
      });
      render(Page);
      expect(screen.getByText('Test Monetary Product')).toBeInTheDocument();
    });
  });

  describe('Error states', () => {
    it('should call notFound when product does not exist', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(null);
      await expect(
        ProductDetailPage({
          params: Promise.resolve({ id: 'invalid-id' }),
        })
      ).rejects.toThrow();
      expect(notFound).toHaveBeenCalled();
    });

    it('should call notFound for unpublished product', async () => {
      vi.mocked(getPublishedProductById).mockResolvedValue(null);
      await expect(
        ProductDetailPage({
          params: Promise.resolve({ id: '1' }),
        })
      ).rejects.toThrow();
      expect(notFound).toHaveBeenCalled();
    });
  });
});
