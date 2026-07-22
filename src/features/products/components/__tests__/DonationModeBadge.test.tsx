import { render, screen } from '@testing-library/react';
import { DonationModeBadge } from '../DonationModeBadge';
import { describe, it, expect } from 'vitest';

describe('DonationModeBadge', () => {
  it('renders Dinheiro label with green color style for monetary mode', () => {
    const { container } = render(<DonationModeBadge donationMode="monetary" />);
    const badge = screen.getByText('Dinheiro');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ backgroundColor: '#DCFCE7' });
    expect(span).toHaveStyle({ color: '#15803D' });
  });

  it('renders Material label with blue color style for physical mode', () => {
    const { container } = render(<DonationModeBadge donationMode="physical" />);
    const badge = screen.getByText('Material');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ backgroundColor: '#DBEAFE' });
    expect(span).toHaveStyle({ color: '#1D4ED8' });
  });

  it('renders Dinheiro ou Material label with purple color style for both mode', () => {
    const { container } = render(<DonationModeBadge donationMode="both" />);
    const badge = screen.getByText('Dinheiro ou Material');
    expect(badge).toBeInTheDocument();
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ backgroundColor: '#F3E8FF' });
    expect(span).toHaveStyle({ color: '#7E22CE' });
  });

  it('renders with correct badge styling', () => {
    const { container } = render(<DonationModeBadge donationMode="monetary" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('inline-block');
    expect(span).toHaveClass('px-[10px]');
    expect(span).toHaveClass('py-[2px]');
    expect(span).toHaveClass('rounded-full');
    expect(span).toHaveClass('text-[11px]');
    expect(span).toHaveClass('font-medium');
  });
});
