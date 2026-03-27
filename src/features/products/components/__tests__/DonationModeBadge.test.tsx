import { render, screen } from '@testing-library/react';
import { DonationModeBadge } from '../DonationModeBadge';
import { describe, it, expect } from 'vitest';

describe('DonationModeBadge', () => {
  it('renders Dinheiro label with green color class for monetary mode', () => {
    const { container } = render(<DonationModeBadge donationMode="monetary" />);
    const badge = screen.getByText('Dinheiro');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveClass('bg-green-100');
    expect(span).toHaveClass('text-green-700');
  });

  it('renders Material label with blue color class for physical mode', () => {
    const { container } = render(<DonationModeBadge donationMode="physical" />);
    const badge = screen.getByText('Material');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveClass('bg-blue-100');
    expect(span).toHaveClass('text-blue-700');
  });

  it('renders Dinheiro ou Material label with purple color class for both mode', () => {
    const { container } = render(<DonationModeBadge donationMode="both" />);
    const badge = screen.getByText('Dinheiro ou Material');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveClass('bg-purple-100');
    expect(span).toHaveClass('text-purple-700');
  });

  it('renders with correct badge styling', () => {
    const { container } = render(<DonationModeBadge donationMode="monetary" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('inline-block');
    expect(span).toHaveClass('px-3');
    expect(span).toHaveClass('py-1');
    expect(span).toHaveClass('rounded-full');
    expect(span).toHaveClass('text-xs');
    expect(span).toHaveClass('font-medium');
  });
});
