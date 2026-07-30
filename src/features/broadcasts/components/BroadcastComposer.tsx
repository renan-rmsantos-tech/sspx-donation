'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Loader2,
  MailCheck,
  Monitor,
  Plus,
  Save,
  Send,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  deleteBroadcastDraft,
  deleteTemporaryBroadcastImage,
  saveBroadcastDraft,
  sendBroadcastEmail,
  sendTestBroadcastEmail,
} from '../actions';
import {
  BROADCAST_MAX_IMAGES,
  BROADCAST_SIGNATURE_MAX_LENGTH,
  DEFAULT_BROADCAST_SIGNATURE,
  BroadcastBlock,
  BroadcastContentV1,
  BroadcastDraftSnapshot,
  broadcastContentSchema,
  countBroadcastImages,
  createEmptyRichTextDocument,
  extractBroadcastImagePaths,
  extractRichTextPlainText,
} from '../content';
import { EmailPreview } from './EmailPreview';
import { ImageBlockDialog } from './ImageBlockDialog';
import { RichTextEditor } from './RichTextEditor';

const SUBJECT_MAX = 150;
const SENDER_NAME_MAX = 150;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BroadcastComposerProps {
  recipientCount: number;
  initialDraft?: BroadcastDraftSnapshot | null;
}

type ImageDialogKind = 'image' | 'imageLeft' | 'imageRight';

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function newTextBlock(): BroadcastBlock {
  return {
    id: newId(),
    type: 'text',
    richText: createEmptyRichTextDocument(),
  };
}

function blockLabel(block: BroadcastBlock): string {
  if (block.type === 'text') return 'Texto';
  if (block.type === 'image') return 'Imagem inteira';
  return block.imagePosition === 'left'
    ? 'Imagem à esquerda'
    : 'Imagem à direita';
}

function blockSummary(block: BroadcastBlock): string {
  if (block.type === 'image') return block.image.alt;
  const text = extractRichTextPlainText(block.richText)
    .replace(/\s+/g, ' ')
    .trim();
  if (text) return text;
  if (block.type === 'imageText') return block.image.alt;
  return 'Comece a escrever este bloco.';
}

function formatDraftUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function errorDetail(result: { details?: unknown }, fallback: string): string {
  if (
    result.details &&
    typeof result.details === 'object' &&
    'message' in result.details &&
    typeof result.details.message === 'string'
  ) {
    return result.details.message;
  }
  if (result.details && typeof result.details === 'object') {
    if (
      'formErrors' in result.details &&
      Array.isArray(result.details.formErrors) &&
      typeof result.details.formErrors[0] === 'string'
    ) {
      return result.details.formErrors[0];
    }
    if (
      'fieldErrors' in result.details &&
      result.details.fieldErrors &&
      typeof result.details.fieldErrors === 'object'
    ) {
      for (const messages of Object.values(result.details.fieldErrors)) {
        if (Array.isArray(messages) && typeof messages[0] === 'string') {
          return messages[0];
        }
      }
    }
  }
  return fallback;
}

interface SortableBlockProps {
  block: BroadcastBlock;
  index: number;
  total: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

function SortableBlock({
  block,
  index,
  total,
  selected,
  disabled,
  onSelect,
  onDuplicate,
  onDelete,
  onMove,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled });

  const icon =
    block.type === 'text' ? (
      <AlignLeft aria-hidden="true" />
    ) : block.type === 'image' ? (
      <ImageIcon aria-hidden="true" />
    ) : (
      <Images aria-hidden="true" />
    );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-lg border bg-white p-2 transition-colors',
        selected
          ? 'border-[#1E3D59] bg-[#F4F7FA]'
          : 'border-[#DED4C3] hover:border-[#A99575]',
        isDragging && 'z-10 opacity-70 shadow-md'
      )}
    >
      <button
        type="button"
        className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-[#6A7C89] hover:bg-[#E8EEF4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3D59] active:cursor-grabbing"
        aria-label={`Reordenar ${blockLabel(block)}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3D59]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#EEE7DB] text-[#1E3D59] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#1E3D59]">
            {index + 1}. {blockLabel(block)}
          </span>
          <span className="block truncate text-sm text-[#536A7B]">
            {blockSummary(block)}
          </span>
        </span>
      </button>
      <div className="hidden shrink-0 items-center sm:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onMove(-1)}
          disabled={disabled || index === 0}
          aria-label="Mover bloco para cima"
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onMove(1)}
          disabled={disabled || index === total - 1}
          aria-label="Mover bloco para baixo"
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={onDuplicate}
          disabled={disabled}
          aria-label="Duplicar bloco"
        >
          <Copy aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-[#A33232] hover:bg-[#FDECEC] hover:text-[#8C2F2F]"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Excluir bloco"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function BroadcastComposer({
  recipientCount,
  initialDraft = null,
}: BroadcastComposerProps) {
  const [composerId, setComposerId] = useState(
    () => initialDraft?.composerId ?? newId()
  );
  const [subject, setSubject] = useState(() => initialDraft?.subject ?? '');
  const [senderName, setSenderName] = useState(
    () => initialDraft?.senderName ?? ''
  );
  const [signatureText, setSignatureText] = useState(
    () => initialDraft?.signatureText ?? DEFAULT_BROADCAST_SIGNATURE
  );
  const [bccEmail, setBccEmail] = useState(
    () => initialDraft?.bccEmail ?? ''
  );
  const [testEmail, setTestEmail] = useState(
    () => initialDraft?.testEmail ?? ''
  );
  const [blocks, setBlocks] = useState<BroadcastBlock[]>(() =>
    initialDraft
      ? structuredClone(initialDraft.content.blocks)
      : [newTextBlock()]
  );
  const [selectedBlockId, setSelectedBlockId] = useState(() => blocks[0].id);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop'
  );
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');
  const [imageDialogKind, setImageDialogKind] =
    useState<ImageDialogKind | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(initialDraft !== null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(
    initialDraft?.updatedAt ?? null
  );
  const [savedDraftImagePaths, setSavedDraftImagePaths] = useState<Set<string>>(
    () =>
      new Set(
        initialDraft ? extractBroadcastImagePaths(initialDraft.content) : []
      )
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const content = useMemo<BroadcastContentV1>(
    () => ({ version: 1, blocks }),
    [blocks]
  );
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? blocks[0];
  const imageCount = countBroadcastImages(content);
  const bccValid =
    bccEmail.trim().length === 0 || EMAIL_REGEX.test(bccEmail.trim());
  const testEmailValid = EMAIL_REGEX.test(testEmail.trim());
  const busy = isSending || isTesting || isSaving || isDiscarding;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const markDirty = () => setIsDirty(true);

  const updateBlock = (
    blockId: string,
    updater: (block: BroadcastBlock) => BroadcastBlock
  ) => {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? updater(block) : block))
    );
    markDirty();
  };

  const addTextBlock = () => {
    const block = newTextBlock();
    setBlocks((current) => [...current, block]);
    setSelectedBlockId(block.id);
    setMobilePane('editor');
    markDirty();
  };

  const addImageBlock = (
    kind: ImageDialogKind,
    image: Exclude<BroadcastBlock, { type: 'text' }>['image']
  ) => {
    const block: BroadcastBlock =
      kind === 'image'
        ? { id: newId(), type: 'image', image }
        : {
            id: newId(),
            type: 'imageText',
            imagePosition: kind === 'imageLeft' ? 'left' : 'right',
            image,
            richText: createEmptyRichTextDocument(),
          };
    setBlocks((current) => [...current, block]);
    setSelectedBlockId(block.id);
    markDirty();
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) {
        return current;
      }
      return arrayMove(current, index, destination);
    });
    markDirty();
  };

  const duplicateBlock = (blockId: string) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index < 0) return;
    const original = blocks[index];
    if (
      original.type !== 'text' &&
      imageCount >= BROADCAST_MAX_IMAGES
    ) {
      toast.error(`O comunicado pode ter até ${BROADCAST_MAX_IMAGES} fotos.`);
      return;
    }
    const duplicate = structuredClone(original);
    duplicate.id = newId();
    setBlocks((current) => [
      ...current.slice(0, index + 1),
      duplicate,
      ...current.slice(index + 1),
    ]);
    setSelectedBlockId(duplicate.id);
    markDirty();
  };

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      toast.error('O comunicado precisa ter pelo menos um bloco.');
      return;
    }
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index < 0) return;
    const removed = blocks[index];
    const nextBlocks = blocks.filter((block) => block.id !== blockId);
    setBlocks(nextBlocks);
    setSelectedBlockId(
      nextBlocks[Math.min(index, nextBlocks.length - 1)].id
    );
    markDirty();

    let undone = false;
    toast.info('Bloco excluído do comunicado.', {
      duration: 6000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          undone = true;
          setBlocks((current) => [
            ...current.slice(0, index),
            removed,
            ...current.slice(index),
          ]);
          setSelectedBlockId(removed.id);
        },
      },
    });

    if (
      removed.type !== 'text' &&
      removed.image.path.startsWith('temporary/') &&
      !savedDraftImagePaths.has(removed.image.path)
    ) {
      const stillUsed = nextBlocks.some(
        (block) =>
          block.type !== 'text' && block.image.path === removed.image.path
      );
      if (!stillUsed) {
        window.setTimeout(() => {
          if (!undone) {
            void deleteTemporaryBroadcastImage({ path: removed.image.path });
          }
        }, 6500);
      }
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setBlocks((current) => {
      const oldIndex = current.findIndex((block) => block.id === active.id);
      const newIndex = current.findIndex((block) => block.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    markDirty();
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    const result = await saveBroadcastDraft({
      composerId,
      subject,
      senderName,
      signatureText,
      bccEmail,
      testEmail,
      content,
    });
    setIsSaving(false);

    if (result.success && result.data) {
      setHasDraft(true);
      setDraftUpdatedAt(result.data.updatedAt);
      setSavedDraftImagePaths(new Set(extractBroadcastImagePaths(content)));
      setIsDirty(false);
      toast.success('Rascunho salvo.');
    } else if (result.error === 'UNAUTHORIZED') {
      toast.error('Sua sessão expirou. Entre novamente.');
    } else {
      toast.error(
        errorDetail(result, 'Não foi possível salvar o rascunho.')
      );
    }
  };

  const validateComposer = (requiresTestEmail: boolean): boolean => {
    if (!subject.trim()) {
      toast.error('Escreva o assunto do email.');
      return false;
    }
    if (!senderName.trim()) {
      toast.error('Informe quem assina o comunicado.');
      return false;
    }
    if (!bccValid) {
      toast.error('O email de cópia oculta não é válido.');
      return false;
    }
    if (requiresTestEmail && !testEmailValid) {
      toast.error('Informe um email de teste válido.');
      return false;
    }
    const parsed = broadcastContentSchema.safeParse(content);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revise o comunicado.');
      return false;
    }
    return true;
  };

  const handleSendTest = async () => {
    if (!validateComposer(true)) return;
    setIsTesting(true);
    const result = await sendTestBroadcastEmail({
      subject: subject.trim(),
      senderName: senderName.trim(),
      signatureText,
      content,
      testEmail: testEmail.trim(),
    });
    setIsTesting(false);

    if (result.success && result.data) {
      toast.success(`Email de teste enviado para ${result.data.to}.`);
    } else if (result.error === 'UNAUTHORIZED') {
      toast.error('Sua sessão expirou. Entre novamente.');
    } else if (result.error === 'VALIDATION_ERROR') {
      toast.error(
        errorDetail(
          result,
          'Revise os campos e o conteúdo do comunicado.'
        )
      );
    } else {
      toast.error(
        errorDetail(
          result,
          'Não foi possível enviar o teste. Tente novamente.'
        )
      );
    }
  };

  const openConfirmation = () => {
    if (!validateComposer(false)) return;
    if (recipientCount === 0) {
      toast.error('Nenhum doador com email cadastrado.');
      return;
    }
    setConfirmOpen(true);
  };

  const resetComposer = () => {
    const firstBlock = newTextBlock();
    setComposerId(newId());
    setSubject('');
    setSenderName('');
    setSignatureText(DEFAULT_BROADCAST_SIGNATURE);
    setBccEmail('');
    setTestEmail('');
    setBlocks([firstBlock]);
    setSelectedBlockId(firstBlock.id);
    setPreviewMode('desktop');
    setMobilePane('editor');
    setIsDirty(false);
    setHasDraft(false);
    setDraftUpdatedAt(null);
    setSavedDraftImagePaths(new Set());
  };

  const handleDiscardDraft = async () => {
    setDiscardConfirmOpen(false);
    setIsDiscarding(true);
    const result = await deleteBroadcastDraft();

    if (result.success) {
      const unsavedTemporaryPaths = extractBroadcastImagePaths(content).filter(
        (path) =>
          path.startsWith('temporary/') && !savedDraftImagePaths.has(path)
      );
      await Promise.all(
        unsavedTemporaryPaths.map((path) =>
          deleteTemporaryBroadcastImage({ path })
        )
      );
      resetComposer();
      toast.success('Rascunho descartado.');
    } else if (result.error === 'UNAUTHORIZED') {
      toast.error('Sua sessão expirou. Entre novamente.');
    } else {
      toast.error(
        errorDetail(result, 'Não foi possível descartar o rascunho.')
      );
    }
    setIsDiscarding(false);
  };

  const handleConfirmedSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    const result = await sendBroadcastEmail({
      subject: subject.trim(),
      senderName: senderName.trim(),
      signatureText,
      content,
      bccEmail: bccEmail.trim() || undefined,
    });
    setIsSending(false);

    if (result.success && result.data) {
      const { successCount, failureCount } = result.data;
      if (failureCount === 0) {
        toast.success(`Comunicado enviado para ${successCount} destinatário(s).`);
      } else {
        toast.warning(
          `Enviado para ${successCount}; ${failureCount} envio(s) falharam.`
        );
      }
      resetComposer();
    } else if (result.error === 'NO_RECIPIENTS') {
      toast.error('Nenhum doador com email cadastrado.');
    } else if (result.error === 'UNAUTHORIZED') {
      toast.error('Sua sessão expirou. Entre novamente.');
    } else if (result.error === 'VALIDATION_ERROR') {
      toast.error(
        errorDetail(
          result,
          'Revise os campos e o conteúdo do comunicado.'
        )
      );
    } else {
      toast.error(
        errorDetail(
          result,
          'Não foi possível enviar o comunicado. O conteúdo foi mantido para você tentar novamente.'
        )
      );
    }
  };

  const editorPanel = (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-[#CDBD9F] bg-white"
      aria-labelledby="broadcast-editor-heading"
    >
      <div className="flex flex-col gap-4 border-b border-[#E5DFD4] px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2
            id="broadcast-editor-heading"
            className="text-lg font-semibold text-[#1E3D59]"
          >
            Montar comunicado
          </h2>
          <p className="mt-1 text-sm text-[#536A7B]">
            Adicione e organize os blocos na ordem em que serão lidos.
          </p>
          {draftUpdatedAt && (
            <p className="mt-2 text-xs font-medium text-[#486579]">
              Rascunho salvo em {formatDraftUpdatedAt(draftUpdatedAt)}
              {isDirty ? ' · há alterações não salvas' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDraft && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDiscardConfirmOpen(true)}
              disabled={busy}
              className="h-11 text-[#A33232] hover:bg-[#FDECEC] hover:text-[#8C2F2F]"
            >
              <Trash2 aria-hidden="true" />
              Descartar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={busy || (hasDraft && !isDirty)}
            className="h-11 bg-white"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isSaving ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 border-b border-[#E5DFD4] px-4 py-5 sm:grid-cols-2 sm:px-6">
        <div className="sm:col-span-2">
          <Label htmlFor="broadcast-subject">Assunto</Label>
          <Input
            id="broadcast-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            disabled={busy}
            onChange={(event) => {
              setSubject(event.target.value);
              markDirty();
            }}
            placeholder="Assunto que aparecerá na caixa de entrada"
            className="mt-2 h-11"
          />
          <p className="mt-1 text-right text-xs text-[#657887]">
            {subject.length}/{SUBJECT_MAX}
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="broadcast-signature-text">
            Texto acima do nome na assinatura
          </Label>
          <Textarea
            id="broadcast-signature-text"
            value={signatureText}
            maxLength={BROADCAST_SIGNATURE_MAX_LENGTH}
            rows={2}
            disabled={busy}
            onChange={(event) => {
              setSignatureText(event.target.value);
              markDirty();
            }}
            placeholder="Ex.: Nos Corações de Jesus e Maria,"
            className="mt-2 resize-y"
          />
          <p className="mt-1 text-right text-xs text-[#657887]">
            {signatureText.length}/{BROADCAST_SIGNATURE_MAX_LENGTH}
          </p>
        </div>
        <div>
          <Label htmlFor="broadcast-sender">Quem está enviando</Label>
          <Input
            id="broadcast-sender"
            value={senderName}
            maxLength={SENDER_NAME_MAX}
            disabled={busy}
            onChange={(event) => {
              setSenderName(event.target.value);
              markDirty();
            }}
            placeholder="Ex.: Pe. João Maria Ferreira da Costa"
            className="mt-2 h-11"
          />
        </div>
        <div>
          <Label htmlFor="broadcast-bcc">Cópia oculta — opcional</Label>
          <Input
            id="broadcast-bcc"
            type="email"
            value={bccEmail}
            disabled={busy}
            aria-invalid={!bccValid}
            onChange={(event) => {
              setBccEmail(event.target.value);
              markDirty();
            }}
            placeholder="secretaria@colegio.com"
            className="mt-2 h-11"
          />
          {!bccValid && (
            <p className="mt-1 text-sm text-[#A33232]" role="alert">
              Inclua um endereço de email válido.
            </p>
          )}
        </div>
      </div>

      <div className="border-b border-[#E5DFD4] px-4 py-5 sm:px-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#1E3D59]">Estrutura do email</h3>
            <p className="mt-1 text-sm text-[#536A7B]">
              {blocks.length} bloco(s) · {imageCount}/{BROADCAST_MAX_IMAGES}{' '}
              foto(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addTextBlock}
              disabled={busy}
              className="h-11"
            >
              <Plus aria-hidden="true" />
              Texto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageDialogKind('image')}
              disabled={busy || imageCount >= BROADCAST_MAX_IMAGES}
              className="h-11"
            >
              <ImagePlus aria-hidden="true" />
              Imagem inteira
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageDialogKind('imageLeft')}
              disabled={busy || imageCount >= BROADCAST_MAX_IMAGES}
              className="h-11"
            >
              <Images aria-hidden="true" />
              Imagem à esquerda
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageDialogKind('imageRight')}
              disabled={busy || imageCount >= BROADCAST_MAX_IMAGES}
              className="h-11"
            >
              <Images aria-hidden="true" />
              Imagem à direita
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="grid gap-2">
              {blocks.map((block, index) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  selected={block.id === selectedBlock?.id}
                  disabled={busy}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                  onMove={(direction) => moveBlock(block.id, direction)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>

      {selectedBlock && (
        <div className="border-b border-[#E5DFD4] px-4 py-5 sm:px-6">
          <div className="mb-4">
            <h3 className="font-semibold text-[#1E3D59]">
              Editar: {blockLabel(selectedBlock)}
            </h3>
            <p className="mt-1 text-sm text-[#536A7B]">
              A prévia é atualizada enquanto você escreve.
            </p>
          </div>

          {selectedBlock.type !== 'image' && (
            <RichTextEditor
              key={selectedBlock.id}
              label={`Texto do bloco ${blockLabel(selectedBlock)}`}
              value={selectedBlock.richText}
              disabled={busy}
              onChange={(richText) =>
                updateBlock(selectedBlock.id, (block) =>
                  block.type === 'image' ? block : { ...block, richText }
                )
              }
            />
          )}

          {selectedBlock.type !== 'text' && (
            <div
              className={cn(
                'grid gap-4',
                selectedBlock.type === 'imageText' && 'mt-5'
              )}
            >
              {selectedBlock.type === 'imageText' && (
                <fieldset>
                  <legend className="text-sm font-medium text-[#243746]">
                    Posição da fotografia
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['left', 'right'] as const).map((position) => (
                      <Button
                        key={position}
                        type="button"
                        variant="outline"
                        aria-pressed={selectedBlock.imagePosition === position}
                        className={cn(
                          'h-11',
                          selectedBlock.imagePosition === position &&
                            'border-[#1E3D59] bg-[#E8EEF4]'
                        )}
                        disabled={busy}
                        onClick={() =>
                          updateBlock(selectedBlock.id, (block) =>
                            block.type === 'imageText'
                              ? { ...block, imagePosition: position }
                              : block
                          )
                        }
                      >
                        {position === 'left'
                          ? 'Imagem à esquerda'
                          : 'Imagem à direita'}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              )}
              <div>
                <Label htmlFor={`alt-${selectedBlock.id}`}>
                  Descrição da imagem
                </Label>
                <Input
                  id={`alt-${selectedBlock.id}`}
                  value={selectedBlock.image.alt}
                  maxLength={180}
                  disabled={busy}
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateBlock(selectedBlock.id, (block) =>
                      block.type === 'text'
                        ? block
                        : {
                            ...block,
                            image: {
                              ...block.image,
                              alt: event.target.value,
                            },
                          }
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor={`caption-${selectedBlock.id}`}>
                  Legenda — opcional
                </Label>
                <Input
                  id={`caption-${selectedBlock.id}`}
                  value={selectedBlock.image.caption ?? ''}
                  maxLength={200}
                  disabled={busy}
                  className="mt-2 h-11"
                  onChange={(event) =>
                    updateBlock(selectedBlock.id, (block) =>
                      block.type === 'text'
                        ? block
                        : {
                            ...block,
                            image: {
                              ...block.image,
                              caption: event.target.value || undefined,
                            },
                          }
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 bg-[#F8F6F1] px-4 py-5 sm:px-6">
        <div>
          <Label htmlFor="broadcast-test-email">Enviar teste para</Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="broadcast-test-email"
              type="email"
              value={testEmail}
              disabled={busy}
              aria-invalid={testEmail.length > 0 && !testEmailValid}
              onChange={(event) => {
                setTestEmail(event.target.value);
                markDirty();
              }}
              placeholder="voce@exemplo.com"
              className="h-11 flex-1 bg-white"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTest}
              disabled={busy || !testEmailValid}
              className="h-11 bg-white"
            >
              {isTesting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <MailCheck aria-hidden="true" />
              )}
              {isTesting ? 'Enviando teste…' : 'Enviar teste'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[#DED4C3] pt-4 sm:flex-row sm:items-center">
          <p className="text-sm text-[#536A7B]">
            {recipientCount} destinatário(s) elegível(is)
          </p>
          <Button
            type="button"
            onClick={openConfirmation}
            disabled={busy || recipientCount === 0}
            className="h-11 px-5"
          >
            {isSending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {isSending ? 'Enviando comunicado…' : 'Revisar e enviar'}
          </Button>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <div
        className="mb-4 grid grid-cols-2 rounded-lg border border-[#CDBD9F] bg-white p-1 xl:hidden"
        role="tablist"
        aria-label="Alternar entre editor e prévia"
      >
        <Button
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={mobilePane === 'editor'}
          className={cn(
            'h-11',
            mobilePane === 'editor' &&
              'bg-[#1E3D59] text-white hover:bg-[#1E3D59] hover:text-white'
          )}
          onClick={() => setMobilePane('editor')}
        >
          <AlignLeft aria-hidden="true" />
          Editor
        </Button>
        <Button
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={mobilePane === 'preview'}
          className={cn(
            'h-11',
            mobilePane === 'preview' &&
              'bg-[#1E3D59] text-white hover:bg-[#1E3D59] hover:text-white'
          )}
          onClick={() => setMobilePane('preview')}
        >
          {previewMode === 'desktop' ? (
            <Monitor aria-hidden="true" />
          ) : (
            <Smartphone aria-hidden="true" />
          )}
          Prévia
        </Button>
      </div>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(420px,0.88fr)_minmax(600px,1.12fr)] xl:items-start">
        <div className={cn(mobilePane !== 'editor' && 'hidden xl:block')}>
          {editorPanel}
        </div>
        <div
          className={cn(
            'min-w-0 xl:sticky xl:top-6',
            mobilePane !== 'preview' && 'hidden xl:block'
          )}
        >
          <EmailPreview
            subject={subject}
            senderName={senderName}
            signatureText={signatureText}
            content={content}
            mode={previewMode}
            onModeChange={setPreviewMode}
          />
        </div>
      </div>

      <ImageBlockDialog
        open={imageDialogKind !== null}
        onOpenChange={(open) => {
          if (!open) setImageDialogKind(null);
        }}
        composerId={composerId}
        kind={imageDialogKind ?? 'image'}
        onUploaded={(image) => addImageBlock(imageDialogKind ?? 'image', image)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar este comunicado?</AlertDialogTitle>
            <AlertDialogDescription>
              O email será enviado individualmente para{' '}
              <strong>{recipientCount} destinatário(s)</strong>. Ele contém{' '}
              {blocks.length} bloco(s) e {imageCount} fotografia(s).
              {bccEmail.trim() && bccValid
                ? ` Uma cópia oculta de cada envio irá para ${bccEmail.trim()}.`
                : ''}{' '}
              Confira o teste antes de continuar; o envio não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>
              Voltar e revisar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSend}
              disabled={isSending}
            >
              Enviar para {recipientCount} destinatário(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar este rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo salvo e as imagens vinculadas serão removidos. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardDraft}
              disabled={isDiscarding}
              className="bg-[#A33232] text-white hover:bg-[#8C2F2F]"
            >
              {isDiscarding ? 'Descartando…' : 'Descartar rascunho'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
