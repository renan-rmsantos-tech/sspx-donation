import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DonationTabs } from '../DonationTabs';

vi.mock('../../actions', () => ({
  createMonetaryDonation: vi.fn(),
  createPhysicalPledge: vi.fn(),
  uploadFile: vi.fn(),
}));

describe('DonationTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both tab triggers and defaults to Dinheiro content', () => {
    render(
      <DonationTabs
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );

    expect(screen.getByRole('button', { name: 'Pix' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Doação de Material' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Informe o valor que deseja doar')
    ).toBeInTheDocument();
  });

  it('switches between Dinheiro and Material tabs', () => {
    render(
      <DonationTabs
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Doação de Material' }));
    expect(
      screen.getByText(/Preencha seus dados de contato/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pix' }));
    expect(
      screen.getByText('Informe o valor que deseja doar')
    ).toBeInTheDocument();
  });

  // NOTE: The current DonationTabs mounts only the active tab's form via a
  // conditional (`activeTab === ... && <Form />`), so each form holds its own
  // local `useState`. Switching tabs unmounts the inactive form and discards
  // its state, so field values are NOT preserved across tab switches. This test
  // documents that current behavior (see agent report re: possible regression).
  it('renders an independent, freshly-mounted form per tab', () => {
    render(
      <DonationTabs
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );

    const monetaryEmail = document.getElementById(
      'monetary-donorEmail'
    ) as HTMLInputElement;
    fireEvent.change(monetaryEmail, { target: { value: 'money@example.com' } });
    expect(
      (document.getElementById('monetary-donorEmail') as HTMLInputElement).value
    ).toBe('money@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Doação de Material' }));

    // Monetary form is unmounted while the Material tab is active.
    expect(document.getElementById('monetary-donorEmail')).toBeNull();

    const physicalName = document.getElementById(
      'physical-donorName'
    ) as HTMLInputElement;
    const physicalEmail = document.getElementById(
      'physical-donorEmail'
    ) as HTMLInputElement;
    fireEvent.change(physicalName, { target: { value: 'Material Donor' } });
    fireEvent.change(physicalEmail, { target: { value: 'material@example.com' } });
    expect(
      (document.getElementById('physical-donorName') as HTMLInputElement).value
    ).toBe('Material Donor');

    // Switching back re-mounts a fresh monetary form: previous value is gone.
    fireEvent.click(screen.getByRole('button', { name: 'Pix' }));
    expect(
      (document.getElementById('monetary-donorEmail') as HTMLInputElement).value
    ).toBe('');
    expect(document.getElementById('physical-donorName')).toBeNull();
  });
});
