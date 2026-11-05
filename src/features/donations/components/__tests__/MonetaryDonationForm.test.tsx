import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as baseRender, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MonetaryDonationForm } from '../MonetaryDonationForm';
import { ServerActionsProvider } from '@/components/server-actions';

const createMonetaryDonation = vi.fn();
const uploadFile = vi.fn();

const render = (ui: ReactElement) =>
  baseRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ServerActionsProvider actions={{ createMonetaryDonation, uploadFile }}>
        {children}
      </ServerActionsProvider>
    ),
  });

describe('MonetaryDonationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render PIX payment details when settings available', () => {
    render(
      <MonetaryDonationForm
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );
    expect(
      screen.getByText('Informe o valor que deseja doar')
    ).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('Registrar Doação')).toBeInTheDocument();
  });

  it('should show warning when PIX settings not configured', () => {
    render(
      <MonetaryDonationForm
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl={null}
        copiaEColaCode={null}
      />
    );
    expect(
      screen.getByText(/Os dados de pagamento PIX ainda não foram configurados/)
    ).toBeInTheDocument();
  });

  it('should display remaining amount', () => {
    render(
      <MonetaryDonationForm
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={5000}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );
    expect(screen.getByText(/Restante:/)).toBeInTheDocument();
  });

  it('should render required donor email field', () => {
    render(
      <MonetaryDonationForm
        productId="123e4567-e89b-12d3-a456-426614174000"
        targetAmount={10000}
        currentAmount={0}
        qrCodeImageUrl="https://example.com/qr.png"
        copiaEColaCode="00020126..."
      />
    );

    const emailInput = screen.getByLabelText('E-mail *');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeRequired();
  });
});
