import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const mockMonetaryProduct = {
  id: '1',
  name: 'Monetary Product',
  description: 'A monetary donation item',
  targetAmount: 10000,
  currentAmount: 5000,
  isFulfilled: false,
  isPublished: true,
  imagePath: null,
  donationMode: 'both' as const,
  productType: 'regular' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  productCategories: [
    { categories: { id: 'cat-1', name: 'Sacristy' } },
  ],
};

const mockPhysicalProduct = {
  id: '2',
  name: 'Physical Product',
  description: 'A physical donation item',
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
    { categories: { id: 'cat-2', name: 'Garden' } },
  ],
};

describe('ProductCard', () => {
  describe('Required donor-facing fields', () => {
    it('should display product name', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      expect(screen.getByText('Monetary Product')).toBeInTheDocument();
    });

    it('should display product description', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      expect(screen.getByText('A monetary donation item')).toBeInTheDocument();
    });

    it('should display category name when present', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      expect(screen.getByText('Sacristy')).toBeInTheDocument();
    });

    it('should not display category when product has no categories', () => {
      const productNoCategories = {
        ...mockMonetaryProduct,
        productCategories: [],
      };
      render(<ProductCard product={productNoCategories} />);
      expect(screen.queryByText('Sacristy')).not.toBeInTheDocument();
    });
  });

  describe('Monetary product progress', () => {
    it('should display progress bar for monetary products', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      expect(screen.getByText('Progresso')).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should display full funding state for fully funded monetary product', () => {
      const fullyFunded = {
        ...mockMonetaryProduct,
        currentAmount: 10000,
      };
      render(<ProductCard product={fullyFunded} />);
      expect(screen.getByText('Meta atingida')).toBeInTheDocument();
    });
  });

  describe('Physical product status', () => {
    it('should display Fulfilled badge for fulfilled physical product', () => {
      render(<ProductCard product={mockPhysicalProduct} />);
      expect(screen.getByText('Meta atingida')).toBeInTheDocument();
    });

    it('should display progress bar for unfulfilled product', () => {
      const unfulfilled = { ...mockPhysicalProduct, isFulfilled: false };
      render(<ProductCard product={unfulfilled} />);
      expect(screen.getByText('Progresso')).toBeInTheDocument();
    });
  });

  describe('Product Photo Display', () => {
    it('should render next/image when product has imagePath', () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      render(<ProductCard product={productWithImage} />);
      const img = screen.getByRole('img', { name: 'Monetary Product' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('product-photos'));
    });

    it('should render placeholder image when product has no imagePath', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      const img = screen.getByRole('img', { name: 'Monetary Product' });
      expect(img).toHaveAttribute('src', expect.stringContaining('product-placeholder-sem-foto.svg'));
    });

    it('should use correct object-fit styling for images', () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      render(<ProductCard product={productWithImage} />);
      const img = screen.getByRole('img', { name: 'Monetary Product' });
      expect(img).toHaveClass('object-cover');
    });

    it('should pass correct sizes prop for responsive loading', () => {
      const productWithImage = {
        ...mockMonetaryProduct,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      };
      render(<ProductCard product={productWithImage} />);
      const img = screen.getByRole('img', { name: 'Monetary Product' });
      expect(img).toHaveAttribute('sizes', expect.stringContaining('100vw'));
      expect(img).toHaveAttribute('sizes', expect.stringContaining('33vw'));
    });
  });

  describe('Navigation', () => {
    it('should link to product detail page', () => {
      render(<ProductCard product={mockMonetaryProduct} />);
      const link = screen.getByRole('link', { name: /Monetary Product/ });
      expect(link).toHaveAttribute('href', '/products/1');
    });
  });
});
