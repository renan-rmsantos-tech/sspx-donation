import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { BroadcastComposer } from './BroadcastComposer';
import {
  deleteBroadcastDraft,
  saveBroadcastDraft,
} from '../actions';

vi.mock('../actions', () => ({
  saveBroadcastDraft: vi.fn(),
  deleteBroadcastDraft: vi.fn(),
  sendBroadcastEmail: vi.fn(),
  sendTestBroadcastEmail: vi.fn(),
  deleteTemporaryBroadcastImage: vi.fn(),
  uploadBroadcastImage: vi.fn(),
}));

describe('BroadcastComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveBroadcastDraft).mockResolvedValue({
      success: true,
      data: { updatedAt: '2026-07-30T02:15:00.000Z' },
    });
    vi.mocked(deleteBroadcastDraft).mockResolvedValue({
      success: true,
      data: null,
    });
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
    expect(
      screen.getByLabelText('Texto acima do nome na assinatura')
    ).toHaveValue('Nos Corações de Jesus e Maria,');
  });

  it('restores and saves the complete draft state', async () => {
    render(
      <BroadcastComposer
        recipientCount={12}
        initialDraft={{
          composerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          subject: 'Notícias do colégio',
          senderName: 'Pe. João',
          signatureText: 'Com gratidão,',
          bccEmail: 'secretaria@example.com',
          testEmail: 'teste@example.com',
          content: {
            version: 1,
            blocks: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                type: 'text',
                richText: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Texto salvo.' }],
                    },
                  ],
                },
              },
            ],
          },
          updatedAt: '2026-07-30T02:15:00.000Z',
        }}
      />
    );

    expect(screen.getByLabelText('Assunto')).toHaveValue(
      'Notícias do colégio'
    );
    expect(
      screen.getByLabelText('Texto acima do nome na assinatura')
    ).toHaveValue('Com gratidão,');
    expect(screen.getByText(/Rascunho salvo em/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Assunto'), {
      target: { value: 'Notícias atualizadas' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Salvar rascunho' })
    );

    await waitFor(() =>
      expect(saveBroadcastDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          composerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          subject: 'Notícias atualizadas',
          senderName: 'Pe. João',
          signatureText: 'Com gratidão,',
          bccEmail: 'secretaria@example.com',
          testEmail: 'teste@example.com',
        })
      )
    );
    expect(toast.success).toHaveBeenCalledWith('Rascunho salvo.');
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
