import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatalogPage from './page';
import { getPublishedProducts, getProductsByCategory } from '@/features/products/queries';
import { getCategories } from '@/features/categories/queries';

vi.mock('@/features/products/queries', () => ({
  getPublishedProducts: vi.fn(),
  getProductsByCategory: vi.fn(),
}));

vi.mock('@/features/categories/queries', () => ({
  getCategories: vi.fn(),
}));

const mockProduct = {
  id: '1',
  name: 'Test Product',
  description: 'Test Description',
  targetAmount: 10000,
  currentAmount: 5000,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'both' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  productCategories: [
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
  ],
};

const mockPhysicalProduct = {
  id: '2',
  name: 'Physical Product',
  description: 'Physical Item',
  targetAmount: 5000,
  currentAmount: 0,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'both' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  productCategories: [
    {
      productId: '2',
      categoryId: 'cat-2',
      categories: {
        id: 'cat-2',
        name: 'Garden',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

const mockCategories = [
  { id: 'cat-1', name: 'Sacristy', createdAt: new Date(), updatedAt: new Date() },
  { id: 'cat-2', name: 'Garden', createdAt: new Date(), updatedAt: new Date() },
];

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getPublishedProducts).mockResolvedValue([
      mockProduct,
      mockPhysicalProduct,
    ]);
    vi.mocked(getProductsByCategory).mockResolvedValue([mockProduct]);
  });

  describe('Rendering', () => {
    it('should render catalog page heading', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getAllByText('Colégio São José').length).toBeGreaterThanOrEqual(1);
    });

    it('should display category filter section', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Filtrar por categoria')).toBeInTheDocument();
    });

    it('should display products section', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Itens para doação')).toBeInTheDocument();
    });

    it('should display all-categories filter button', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByRole('link', { name: 'Todas' })).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should display all products when no category selected', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(getPublishedProducts).toHaveBeenCalled();
      expect(getProductsByCategory).not.toHaveBeenCalled();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Physical Product')).toBeInTheDocument();
    });

    it('should display filtered products when category selected', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({ category: 'cat-1' }),
      });
      render(Page);
      expect(getProductsByCategory).toHaveBeenCalledWith('cat-1');
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.queryByText('Physical Product')).not.toBeInTheDocument();
    });

    it('should show empty message when no products in selected category', async () => {
      vi.mocked(getProductsByCategory).mockResolvedValue([]);
      const Page = await CatalogPage({
        searchParams: Promise.resolve({ category: 'cat-1' }),
      });
      render(Page);
      expect(screen.getByText('Nenhum produto encontrado nesta categoria.')).toBeInTheDocument();
    });

    it('should show empty message when no products available', async () => {
      vi.mocked(getPublishedProducts).mockResolvedValue([]);
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Nenhum produto disponível no momento.')).toBeInTheDocument();
    });
  });

  describe('Product display', () => {
    it('should display monetary products with progress indicators', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getAllByText('Progresso').length).toBeGreaterThanOrEqual(1);
    });

    it('should display products with donation options for unfulfilled items', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Physical Product')).toBeInTheDocument();
      expect(screen.getAllByText('Progresso').length).toBeGreaterThanOrEqual(1);
    });

    it('should display product categories', async () => {
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getAllByText('Sacristy').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Garden').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Empty states', () => {
    it('should handle empty catalog', async () => {
      vi.mocked(getPublishedProducts).mockResolvedValue([]);
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Nenhum produto disponível no momento.')).toBeInTheDocument();
    });

    it('should handle missing category associations', async () => {
      const productNoCategories = {
        ...mockProduct,
        productCategories: [] as typeof mockProduct.productCategories,
      };
      vi.mocked(getPublishedProducts).mockResolvedValue([productNoCategories]);
      const Page = await CatalogPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });
});
