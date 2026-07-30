'use client';

import { useEffect, useId, useState } from 'react';
import { ImagePlus, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateBroadcastImageUploadUrl } from '../actions';
import type { BroadcastImage } from '../content';
import {
  BroadcastImageError,
  compressBroadcastImage,
} from '../image-processing';

interface ImageBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  composerId: string;
  kind: 'image' | 'imageLeft' | 'imageRight';
  onUploaded: (image: BroadcastImage) => void;
}

const TITLES = {
  image: 'Adicionar imagem inteira',
  imageLeft: 'Adicionar imagem à esquerda',
  imageRight: 'Adicionar imagem à direita',
};

export function ImageBlockDialog({
  open,
  onOpenChange,
  composerId,
  kind,
  onUploaded,
}: ImageBlockDialogProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setAlt('');
    setCaption('');
    setError(null);
    setIsUploading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isUploading) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleUpload = async () => {
    setError(null);
    if (!file) {
      setError('Escolha uma fotografia para continuar.');
      return;
    }
    if (alt.trim().length < 3) {
      setError(
        'Descreva a fotografia para quem não consegue visualizá-la.'
      );
      return;
    }

    setIsUploading(true);
    try {
      const optimized = await compressBroadcastImage(file);
      const upload = await generateBroadcastImageUploadUrl({ composerId });
      if (!upload.success || !upload.data) {
        throw new BroadcastImageError(
          upload.error === 'UNAUTHORIZED'
            ? 'Sua sessão expirou. Entre novamente antes de enviar a imagem.'
            : 'Não foi possível preparar o upload. Tente novamente.'
        );
      }

      const response = await fetch(upload.data.signedUrl, {
        method: 'PUT',
        body: optimized,
        headers: {
          'Content-Type': 'image/jpeg',
          'x-amz-acl': 'public-read',
        },
      });
      if (!response.ok) {
        throw new BroadcastImageError(
          'O Spaces recusou o upload. Verifique a configuração e tente novamente.'
        );
      }

      onUploaded({
        path: upload.data.path,
        alt: alt.trim(),
        caption: caption.trim() || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Não foi possível enviar a fotografia.'
      );
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{TITLES[kind]}</DialogTitle>
          <DialogDescription>
            A proporção original será preservada. A foto será otimizada antes
            do upload.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div>
            <Label htmlFor={inputId}>Fotografia</Label>
            <label
              htmlFor={inputId}
              className="mt-2 flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#A99575] bg-[#F8F6F1] text-center transition-colors hover:bg-[#F1ECE3] focus-within:ring-2 focus-within:ring-[#1E3D59] focus-within:ring-offset-2"
            >
              {previewUrl ? (
                // The original aspect ratio is intentionally preserved.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Prévia da fotografia selecionada"
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-2 px-6 py-8 text-sm text-[#536A7B]">
                  <ImagePlus
                    className="h-8 w-8 text-[#1E3D59]"
                    aria-hidden="true"
                  />
                  <strong className="text-[#1E3D59]">
                    Escolher fotografia
                  </strong>
                  JPEG, PNG ou WebP, até 10 MB
                </span>
              )}
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isUploading}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </label>
          </div>

          <div>
            <Label htmlFor={`${inputId}-alt`}>
              Descrição da imagem <span aria-hidden="true">*</span>
            </Label>
            <Textarea
              id={`${inputId}-alt`}
              value={alt}
              maxLength={180}
              rows={2}
              disabled={isUploading}
              aria-describedby={`${inputId}-alt-help`}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Ex.: Aluno utilizando o novo bebedouro do colégio"
              className="mt-2 resize-none"
            />
            <p
              id={`${inputId}-alt-help`}
              className="mt-1 text-sm text-[#536A7B]"
            >
              Será lida por tecnologias assistivas e exibida se a foto for
              bloqueada. {alt.length}/180
            </p>
          </div>

          <div>
            <Label htmlFor={`${inputId}-caption`}>Legenda — opcional</Label>
            <Input
              id={`${inputId}-caption`}
              value={caption}
              maxLength={200}
              disabled={isUploading}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Uma breve legenda abaixo da fotografia"
              className="mt-2"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#E2A8A8] bg-[#FDECEC] px-4 py-3 text-sm text-[#8C2F2F]"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Voltar ao comunicado
          </Button>
          <Button type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            {isUploading ? 'Otimizando e enviando…' : 'Adicionar fotografia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

