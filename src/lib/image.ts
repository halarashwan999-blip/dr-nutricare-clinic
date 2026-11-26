const MAX_BASE64_LENGTH = 700_000;

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to <img> for formats the decoder refuses.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('invalid_image'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Resizes and re-encodes a phone photo so the upload stays small but readable.
export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('invalid_image');
  const image = await loadImage(file);
  const width = 'width' in image ? image.width : 0;
  const height = 'height' in image ? image.height : 0;
  if (!width || !height) throw new Error('invalid_image');

  let maxSide = 1280;
  let quality = 0.74;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('invalid_image');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_BASE64_LENGTH) return dataUrl;
    maxSide = Math.round(maxSide * 0.82);
    quality = Math.max(0.42, quality - 0.08);
  }
  throw new Error('image_too_large');
}
