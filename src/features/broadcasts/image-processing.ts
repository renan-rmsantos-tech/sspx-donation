const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1600;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class BroadcastImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BroadcastImageError';
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new BroadcastImageError(
          'Não foi possível abrir a imagem. Escolha outro arquivo.'
        )
      );
    };
    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(
            new BroadcastImageError(
              'Não foi possível preparar a imagem para envio.'
            )
          );
      },
      'image/jpeg',
      quality
    );
  });
}

export async function compressBroadcastImage(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new BroadcastImageError(
      'Use uma imagem JPEG, PNG ou WebP.'
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new BroadcastImageError(
      'A imagem deve ter no máximo 10 MB.'
    );
  }

  const image = await loadImage(file);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const initialScale = Math.min(1, MAX_EDGE / largestEdge);
  let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
  let quality = 0.86;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new BroadcastImageError(
      'Seu navegador não conseguiu preparar esta imagem.'
    );
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size <= MAX_OUTPUT_BYTES) return blob;

    if (quality > 0.68) {
      quality -= 0.06;
    } else {
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
  }

  throw new BroadcastImageError(
    'A imagem continuou muito grande após a otimização. Escolha uma foto menor.'
  );
}

