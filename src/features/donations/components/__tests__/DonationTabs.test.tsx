import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DonationTabs } from '../DonationTabs';

describe('DonationTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Um form está oculto (wrapper com classe `hidden`) quando não é a aba ativa,
  // mas permanece montado no DOM para preservar seu estado.
  const isHidden = (id: string) =>
    !!document.getElementById(id)?.closest('div.hidden');

  const renderTabs = () =>
    render(
      <DonationTabs
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );

  it('renders both tab triggers and defaults to the Pix (monetary) tab', () => {
    renderTabs();

    expect(screen.getByRole('button', { name: 'Pix' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Doação de Material' })
    ).toBeInTheDocument();

    // Both forms are mounted; only the monetary one is visible by default.
    expect(isHidden('monetary-donorEmail')).toBe(false);
    expect(isHidden('physical-donorName')).toBe(true);
  });

  it('toggles which form is visible when switching tabs', () => {
    renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'Doação de Material' }));
    expect(isHidden('monetary-donorEmail')).toBe(true);
    expect(isHidden('physical-donorName')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Pix' }));
    expect(isHidden('monetary-donorEmail')).toBe(false);
    expect(isHidden('physical-donorName')).toBe(true);
  });

  // Both forms stay mounted (hidden via CSS), so field values are preserved
  // across tab switches instead of being discarded.
  it('preserves each form\'s input across tab switches', () => {
    renderTabs();

    const monetaryEmail = document.getElementById(
      'monetary-donorEmail'
    ) as HTMLInputElement;
    fireEvent.change(monetaryEmail, { target: { value: 'money@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Doação de Material' }));

    const physicalName = document.getElementById(
      'physical-donorName'
    ) as HTMLInputElement;
    fireEvent.change(physicalName, { target: { value: 'Material Donor' } });

    // Switch back to Pix: monetary value must still be there...
    fireEvent.click(screen.getByRole('button', { name: 'Pix' }));
    expect(
      (document.getElementById('monetary-donorEmail') as HTMLInputElement).value
    ).toBe('money@example.com');

    // ...and the physical form's value is preserved too (still mounted).
    expect(
      (document.getElementById('physical-donorName') as HTMLInputElement).value
    ).toBe('Material Donor');
  });
});
