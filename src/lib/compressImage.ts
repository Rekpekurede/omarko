export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIMENSION = 1600;
      const QUALITY = 0.82;

      let { width, height } = img;

      // Scale down proportionally if either dimension exceeds max
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not available'));
      ctx.drawImage(img, 0, 0, width, height);

      // Use WebP if supported, fall back to JPEG
      const supportsWebP = canvas
        .toDataURL('image/webp')
        .startsWith('data:image/webp');
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
      const extension = supportsWebP ? 'webp' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression produced no output'));

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${extension}`),
            { type: mimeType }
          );

          // Dev logging — remove in production build if desired
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[Image Compression]
  Original:   ${(originalSize / 1024 / 1024).toFixed(2)} MB
  Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB
  Saved:      ${Math.round((1 - compressedFile.size / originalSize) * 100)}%
  Format:     ${mimeType}
  Dimensions: ${width}×${height}px`
            );
          }

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
          });
        },
        mimeType,
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image failed to load for compression'));
    };

    img.src = objectUrl;
  });
}
