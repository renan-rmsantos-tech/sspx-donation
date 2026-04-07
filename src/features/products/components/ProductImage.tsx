'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/constants';

interface ProductImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
}

export function ProductImage({ src, alt, width, height, className, sizes }: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const isExternal = imgSrc.startsWith('http');

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      unoptimized={isExternal}
      onError={() => setImgSrc(PRODUCT_PLACEHOLDER_IMAGE)}
    />
  );
}
