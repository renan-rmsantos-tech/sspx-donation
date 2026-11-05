import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as baseRender, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { PhysicalPledgeForm } from '../PhysicalPledgeForm';
import { ServerActionsProvider } from '@/components/server-actions';
import { toast } from 'sonner';

const createPhysicalPledge = vi.fn();

const render = (ui: ReactElement) =>
  baseRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ServerActionsProvider actions={{ createPhysicalPledge }}>
        {children}
      </ServerActionsProvider>
    ),
  });

describe('PhysicalPledgeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with required fields', () => {
    render(
      <PhysicalPledgeForm productId="123e4567-e89b-12d3-a456-426614174000" />
    );
    expect(
      screen.getByText(/Preencha seus dados de contato/)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/98765-4321/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByText('Registrar Compromisso')).toBeInTheDocument();
  });

  it('should show success toast after successful submission', async () => {
    createPhysicalPledge.mockResolvedValueOnce({
      success: true,
      data: { donationId: 'donation-123' },
    });

    render(
      <PhysicalPledgeForm productId="123e4567-e89b-12d3-a456-426614174000" />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), {
      target: { value: 'Test Donor' },
    });
    fireEvent.change(screen.getByPlaceholderText(/98765-4321/), {
      target: { value: '11987654321' },
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'donor@example.com' },
    });
    fireEvent.click(screen.getByText('Registrar Compromisso'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Obrigado! Seu compromisso foi registrado')
      );
    });
  });

  it('should show error toast on failed submission', async () => {
    createPhysicalPledge.mockResolvedValueOnce({
      success: false,
      error: 'ALREADY_FULFILLED',
    });

    render(
      <PhysicalPledgeForm productId="123e4567-e89b-12d3-a456-426614174000" />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), {
      target: { value: 'Test Donor' },
    });
    fireEvent.change(screen.getByPlaceholderText(/98765-4321/), {
      target: { value: '11987654321' },
    });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'donor@example.com' },
    });
    fireEvent.click(screen.getByText('Registrar Compromisso'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Este item já foi atendido.');
    });
  });

  it('should render required donor email field', () => {
    render(
      <PhysicalPledgeForm productId="123e4567-e89b-12d3-a456-426614174000" />
    );

    const emailInput = screen.getByLabelText('E-mail *');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeRequired();
  });
});
