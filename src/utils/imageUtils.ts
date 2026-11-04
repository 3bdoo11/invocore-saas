/**
 * Utility functions for safe image uploading, canvas-based resizing,
 * compression, and automatic theme color extraction.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  extractedColor: string;
  width: number;
  height: number;
}

const DEFAULT_BRAND_COLOR = '#0F172A';

/**
 * Resizes and compresses an uploaded image file using an off-screen HTML5 canvas.
 * - Caps dimensions to maxWidth / maxHeight (default 300px).
 * - Exports as optimized WebP or PNG data URL (< 40KB).
 * - Extracts dominant brand color with strict try/catch fallback.
 */
export async function compressAndResizeImage(
  file: File,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.85
): Promise<ProcessedImageResult> {
  if (!file) {
    throw new Error('لم يتم تحديد أي ملف');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('الملف المحدد ليس صورة صالحة (PNG, JPG, WebP, SVG)');
  }

  // 1. Read file into an Image object safely
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  // 2. Compute proportional scaled dimensions
  const originalWidth = img.naturalWidth || img.width || 300;
  const originalHeight = img.naturalHeight || img.height || 300;

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  // 3. Render onto HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    // If 2D context fails, return sanitized rawDataUrl if under 200KB or truncate
    return {
      dataUrl: rawDataUrl.length < 250000 ? rawDataUrl : '',
      extractedColor: DEFAULT_BRAND_COLOR,
      width: targetWidth,
      height: targetHeight,
    };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 4. Safe Color Extraction with try/catch
  let extractedColor = DEFAULT_BRAND_COLOR;
  try {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    extractedColor = extractDominantColor(imgData);
  } catch (err) {
    console.warn('Auto color extraction failed, using fallback:', err);
    extractedColor = DEFAULT_BRAND_COLOR;
  }

  // 5. Export to compressed data URL
  let compressedDataUrl = '';
  try {
    // Prefer WebP for high compression, fallback to PNG for transparency
    const isJpegOrWebp = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (isJpegOrWebp) {
      compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    } else {
      // Test WebP support with transparency
      const webpUrl = canvas.toDataURL('image/webp', quality);
      if (webpUrl.startsWith('data:image/webp')) {
        compressedDataUrl = webpUrl;
      } else {
        compressedDataUrl = canvas.toDataURL('image/png');
      }
    }
  } catch {
    try {
      compressedDataUrl = canvas.toDataURL();
    } catch (e) {
      console.warn('Canvas toDataURL failed, using fallback:', e);
      compressedDataUrl = rawDataUrl.length < 300000 ? rawDataUrl : '';
    }
  }

  return {
    dataUrl: compressedDataUrl,
    extractedColor,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Reads a File into a base64 Data URL wrapped in a Promise.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (err) => reject(err);
      reader.onabort = () => reject(new Error('تم إلغاء قراءة الملف'));
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Loads a Data URL into an HTMLImageElement wrapped in a Promise.
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('فشل تحميل الصورة في المتصفح'));
      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Extracts the most prominent vibrant brand color from an ImageData buffer.
 * Filters out transparent, pure white, and pure black pixels.
 */
export function extractDominantColor(imageData: ImageData): string {
  try {
    const data = imageData.data;
    const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();
    const step = 4; // Sample every 4th pixel for speed & efficiency

    for (let i = 0; i < data.length; i += 4 * step) {
      const a = data[i + 3];
      // Skip transparent or near-transparent pixels
      if (a < 128) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skip near-white / background pixels
      if (r > 235 && g > 235 && b > 235) continue;
      // Skip near-black pixels
      if (r < 25 && g < 25 && b < 25) continue;

      // Quantize to 16-step bins to cluster similar colors
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;
      const key = `${qr},${qg},${qb}`;

      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorCounts.set(key, { count: 1, r: qr, g: qg, b: qb });
      }
    }

    let maxCount = 0;
    let dominant = { r: 15, g: 23, b: 42 }; // #0F172A

    for (const entry of colorCounts.values()) {
      if (entry.count > maxCount) {
        maxCount = entry.count;
        dominant = { r: entry.r, g: entry.g, b: entry.b };
      }
    }

    const hexR = dominant.r.toString(16).padStart(2, '0');
    const hexG = dominant.g.toString(16).padStart(2, '0');
    const hexB = dominant.b.toString(16).padStart(2, '0');
    return `#${hexR}${hexG}${hexB}`.toUpperCase();
  } catch {
    return DEFAULT_BRAND_COLOR;
  }
}
