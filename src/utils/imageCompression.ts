/**
 * Pure utility to compress and crop an image into a squared WebP/JPEG format.
 * Focuses on maintaining a crisp 400x400 output while keeping file size small.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
}

export const compressImage = (
  file: File,
  targetSize = 400,
  quality = 0.85
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    // 1. Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please upload an image.'));
      return;
    }

    // 2. Read file as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 3. Calculate cropping dimensions (center square crop)
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        // 4. Draw to Canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas rendering context not supported.'));
          return;
        }

        // Draw image onto canvas, cropping to the center square and resizing to targetSize
        ctx.drawImage(
          img,
          startX, startY, size, size, // Source cropping
          0, 0, targetSize, targetSize // Destination resizing
        );

        // 5. Export to compressed format (prefer WebP, fallback to JPEG)
        const exportType = 'image/webp'; // Modern browsers support WebP encoding
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed.'));
              return;
            }

            // Fallback to JPEG if WebP resulted in null blob (very old browsers)
            if (blob.type !== exportType && exportType === 'image/webp') {
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) {
                     reject(new Error('Image compression fallback failed.'));
                     return;
                  }
                  resolveCompressed(jpegBlob, 'image/jpeg', file.name.replace(/\.[^/.]+$/, '.jpg'));
                },
                'image/jpeg',
                quality
              );
              return;
            }

            resolveCompressed(blob, exportType, file.name.replace(/\.[^/.]+$/, '.webp'));
          },
          exportType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for processing.'));
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);

    function resolveCompressed(blob: Blob, mimeType: string, filename: string) {
      const newFile = new File([blob], filename, { type: mimeType });
      const previewUrl = URL.createObjectURL(blob);
      resolve({ file: newFile, previewUrl });
    }
  });
};
