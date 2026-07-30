'use client';

import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { RichTextDocument } from '../content';

interface RichTextEditorProps {
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  disabled?: boolean;
  label: string;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  label,
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      TextAlign.configure({ types: ['paragraph'], alignments: ['left', 'center', 'right'] }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON() as RichTextDocument);
    },
    editorProps: {
      attributes: {
        'aria-label': label,
        class:
          'min-h-[150px] px-4 py-3 text-base leading-7 text-[#243746] focus:outline-none [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6',
      },
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive('bold') ?? false,
      italic: currentEditor?.isActive('italic') ?? false,
      link: currentEditor?.isActive('link') ?? false,
      bulletList: currentEditor?.isActive('bulletList') ?? false,
      orderedList: currentEditor?.isActive('orderedList') ?? false,
      alignLeft: currentEditor?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: currentEditor?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: 'right' }) ?? false,
    }),
  });
  const state = editorState ?? {
    bold: false,
    italic: false,
    link: false,
    bulletList: false,
    orderedList: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
  };

  if (!editor) {
    return (
      <div
        className="h-[198px] animate-pulse rounded-lg border border-[#D4C4A8] bg-[#F8F6F1]"
        aria-label="Carregando editor de texto"
      />
    );
  }

  const toolbarButton = (
    active: boolean,
    labelText: string,
    icon: React.ReactNode,
    onClick: () => void
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={labelText}
      aria-pressed={active}
      className={cn(
        'h-11 w-11 rounded-md text-[#40586A]',
        active && 'bg-[#E8EEF4] text-[#1E3D59]'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  );

  const applyLink = () => {
    const href = linkValue.trim();
    if (!href) return;
    const normalized = /^[a-z]+:/i.test(href) ? href : `https://${href}`;
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: normalized })
      .run();
    setLinkValue('');
    setLinkOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#CDBD9F] bg-white focus-within:ring-2 focus-within:ring-[#1E3D59] focus-within:ring-offset-2">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-[#E5DFD4] bg-[#F8F6F1] px-1.5 py-1"
        role="toolbar"
        aria-label="Formatação do texto"
      >
        {toolbarButton(
          state.bold,
          'Negrito',
          <Bold aria-hidden="true" />,
          () => editor.chain().focus().toggleBold().run()
        )}
        {toolbarButton(
          state.italic,
          'Itálico',
          <Italic aria-hidden="true" />,
          () => editor.chain().focus().toggleItalic().run()
        )}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Adicionar link"
              aria-pressed={state.link}
              className={cn(
                'h-11 w-11 rounded-md text-[#40586A]',
                state.link && 'bg-[#E8EEF4] text-[#1E3D59]'
              )}
              disabled={disabled}
            >
              <LinkIcon aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <label
              htmlFor="broadcast-link"
              className="mb-2 block text-sm font-medium text-[#243746]"
            >
              Endereço do link
            </label>
            <div className="flex gap-2">
              <Input
                id="broadcast-link"
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://exemplo.com"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
              <Button type="button" onClick={applyLink}>
                Aplicar
              </Button>
            </div>
            {state.link && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full justify-start text-[#A33232]"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}
              >
                <Unlink aria-hidden="true" />
                Remover link
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <span className="mx-1 h-6 w-px bg-[#D4C4A8]" aria-hidden="true" />
        {toolbarButton(
          state.bulletList,
          'Lista com marcadores',
          <List aria-hidden="true" />,
          () => editor.chain().focus().toggleBulletList().run()
        )}
        {toolbarButton(
          state.orderedList,
          'Lista numerada',
          <ListOrdered aria-hidden="true" />,
          () => editor.chain().focus().toggleOrderedList().run()
        )}
        <span className="mx-1 h-6 w-px bg-[#D4C4A8]" aria-hidden="true" />
        {toolbarButton(
          state.alignLeft,
          'Alinhar à esquerda',
          <AlignLeft aria-hidden="true" />,
          () => editor.chain().focus().setTextAlign('left').run()
        )}
        {toolbarButton(
          state.alignCenter,
          'Centralizar',
          <AlignCenter aria-hidden="true" />,
          () => editor.chain().focus().setTextAlign('center').run()
        )}
        {toolbarButton(
          state.alignRight,
          'Alinhar à direita',
          <AlignRight aria-hidden="true" />,
          () => editor.chain().focus().setTextAlign('right').run()
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
