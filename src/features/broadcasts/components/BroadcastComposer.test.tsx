import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { BroadcastComposer } from './BroadcastComposer';

vi.mock('../actions', () => ({
  sendBroadcastEmail: vi.fn(),
  sendTestBroadcastEmail: vi.fn(),
  deleteTemporaryBroadcastImage: vi.fn(),
  uploadBroadcastImage: vi.fn(),
}));

describe('BroadcastComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with one editable text block and recipient context', async () => {
    render(<BroadcastComposer recipientCount={12} />);

    expect(
      screen.getByRole('heading', { name: 'Montar comunicado' })
    ).toBeInTheDocument();
    expect(screen.getByText('1 bloco(s) · 0/5 foto(s)')).toBeInTheDocument();
    expect(screen.getByText('12 destinatário(s) elegível(is)')).toBeInTheDocument();
    expect(
      await screen.findByLabelText('Texto do bloco Texto')
    ).toBeInTheDocument();
  });

  it('adds another text block and exposes it in the ordered structure', () => {
    render(<BroadcastComposer recipientCount={2} />);

    fireEvent.click(screen.getByRole('button', { name: 'Texto' }));

    expect(screen.getByText('2 bloco(s) · 0/5 foto(s)')).toBeInTheDocument();
    expect(screen.getByText('2. Texto')).toBeInTheDocument();
  });

  it('keeps the full editor available on mobile through the preview tabs', () => {
    render(<BroadcastComposer recipientCount={2} />);

    const previewTab = screen.getByRole('tab', { name: 'Prévia' });
    fireEvent.click(previewTab);

    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { name: 'Prévia do email' })
    ).toBeInTheDocument();
    expect(screen.getByTitle('Prévia do comunicado')).toBeInTheDocument();
  });

  it('explains the first missing field before opening send confirmation', () => {
    render(<BroadcastComposer recipientCount={2} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar e enviar' })
    );

    expect(toast.error).toHaveBeenCalledWith(
      'Escreva o assunto do email.'
    );
  });
});
