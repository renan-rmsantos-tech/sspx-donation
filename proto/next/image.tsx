import type { ImgHTMLAttributes } from 'react';

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
};

/** Props do `next/image` sem equivalente no `<img>`; são descartadas. */
const NEXT_ONLY = ['priority', 'quality', 'unoptimized', 'placeholder', 'blurDataURL'] as const;

/** `next/image` na galeria: `<img>` comum, servido de `public/` pelo Vite. */
export default function Image({ src, alt, fill, style, ...rest }: ImageProps) {
  const props: ImgHTMLAttributes<HTMLImageElement> = { ...rest };
  for (const key of NEXT_ONLY) delete (props as Record<string, unknown>)[key];
  return (
    // Este é o substituto do próprio `next/image` na galeria.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={typeof src === 'string' ? src : src.src}
      style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style}
    />
  );
}
