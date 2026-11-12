export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'] as const;

export const MAX_RAW_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB raw before optimization
export const MAX_PDF_BYTES = 450 * 1024; // 450 KB PDF (~600 KB base64 safely inside Firestore 1 MiB doc cap)
export const MAX_PROCESSED_DATA_URL_LENGTH = 720 * 1024; // ~720 KB string ceiling per file

export interface UploadProcessOptions {
  allowPdf?: boolean;
  maxDimension?: number;
  quality?: number;
  preserveTransparency?: boolean;
}

export interface ProcessedUploadFile {
  dataUrl: string;
  fileName: string;
  fileType: string;
  isImage: boolean;
  sizeBytes: number;
}

export interface FileValidationResult {
  valid: boolean;
  isImage: boolean;
  error?: string;
}

/**
 * Validates file MIME type and size constraints before processing.
 */
export function validateUploadFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  options: Pick<UploadProcessOptions, 'allowPdf'> = {}
): FileValidationResult {
  const allowPdf = options.allowPdf ?? false;
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const isImageByMime = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
  const isImageByExt = !mime && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  const isPdfByMime = mime === 'application/pdf';
  const isPdfByExt = !mime && ext === 'pdf';

  const isImage = isImageByMime || isImageByExt;
  const isPdf = allowPdf && (isPdfByMime || isPdfByExt);

  if (!isImage && !isPdf) {
    return {
      valid: false,
      isImage: false,
      error: allowPdf
        ? 'Unsupported file type. Please select a JPG, PNG, WEBP, GIF image or a PDF document.'
        : 'Unsupported image format. Please select a JPG, PNG, WEBP, or GIF image.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      isImage,
      error: 'Selected file appears to be empty.',
    };
  }

  if (isImage && file.size > MAX_RAW_IMAGE_BYTES) {
    return {
      valid: false,
      isImage: true,
      error: 'Image file size exceeds the 5 MB limit. Please choose a smaller image.',
    };
  }

  if (isPdf && file.size > MAX_PDF_BYTES) {
    return {
      valid: false,
      isImage: false,
      error: 'PDF document must be 450 KB or smaller so it can be synced across devices.',
    };
  }

  return { valid: true, isImage };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file contents.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function compressImageDataUrl(
  rawDataUrl: string,
  mimeType: string,
  maxDimension: number,
  quality: number,
  preserveTransparency: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        reject(new Error('Invalid or corrupted image file.'));
        return;
      }

      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      const keepAlpha = preserveTransparency && (mimeType === 'image/png' || mimeType === 'image/webp');
      if (!keepAlpha) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let output = '';
      if (keepAlpha) {
        output = canvas.toDataURL('image/png');
        if (output.length > MAX_PROCESSED_DATA_URL_LENGTH) {
          output = canvas.toDataURL('image/webp', quality);
        }
      } else {
        output = canvas.toDataURL('image/jpeg', quality);
      }

      // Extra quality pass if image still exceeds Firestore-safe ceiling
      if (output.length > MAX_PROCESSED_DATA_URL_LENGTH) {
        output = canvas.toDataURL('image/jpeg', 0.62);
      }

      resolve(output);
    };
    img.onerror = () => reject(new Error('Unable to decode selected image. Please try another file.'));
    img.src = rawDataUrl;
  });
}

/**
 * Validates and prepares an image or PDF upload for Spark-compatible Firestore persistence.
 * Ensures files survive logout, login, refresh, and multi-device access without external storage buckets.
 */
export async function processUploadFile(
  file: File,
  options: UploadProcessOptions = {}
): Promise<ProcessedUploadFile> {
  const validation = validateUploadFile(file, options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const resolvedType =
    file.type ||
    (validation.isImage
      ? `image/${file.name.split('.').pop()?.toLowerCase() || 'jpeg'}`
      : 'application/pdf');

  if (!validation.isImage) {
    if (rawDataUrl.length > MAX_PROCESSED_DATA_URL_LENGTH) {
      throw new Error('Document is too large after encoding. Please upload a PDF under 450 KB.');
    }
    return {
      dataUrl: rawDataUrl,
      fileName: file.name,
      fileType: resolvedType,
      isImage: false,
      sizeBytes: file.size,
    };
  }

  // Keep animated GIF as-is if already compact, otherwise optimize via canvas
  if (resolvedType === 'image/gif' && rawDataUrl.length <= MAX_PROCESSED_DATA_URL_LENGTH) {
    return {
      dataUrl: rawDataUrl,
      fileName: file.name,
      fileType: resolvedType,
      isImage: true,
      sizeBytes: file.size,
    };
  }

  const optimizedDataUrl = await compressImageDataUrl(
    rawDataUrl,
    resolvedType,
    options.maxDimension ?? 800,
    options.quality ?? 0.8,
    options.preserveTransparency ?? false
  );

  if (optimizedDataUrl.length > MAX_PROCESSED_DATA_URL_LENGTH) {
    throw new Error('Processed image is still too large. Please select an image with smaller dimensions.');
  }

  const outputMime = optimizedDataUrl.startsWith('data:image/png')
    ? 'image/png'
    : optimizedDataUrl.startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  return {
    dataUrl: optimizedDataUrl,
    fileName: file.name,
    fileType: outputMime,
    isImage: true,
    sizeBytes: file.size,
  };
}
