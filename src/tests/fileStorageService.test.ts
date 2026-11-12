import { describe, it, expect } from 'vitest';
import {
  validateUploadFile,
  MAX_RAW_IMAGE_BYTES,
  MAX_PDF_BYTES,
} from '../services/fileStorageService';

describe('File Upload Validation (Shop Logo & Customer Party Documents)', () => {
  it('accepts valid image MIME types within size limits', () => {
    const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const type of types) {
      const res = validateUploadFile({ name: 'test.png', type, size: 120 * 1024 });
      expect(res.valid).toBe(true);
      expect(res.isImage).toBe(true);
    }
  });

  it('rejects PDF files when allowPdf is false (Shop Logo)', () => {
    const res = validateUploadFile(
      { name: 'logo.pdf', type: 'application/pdf', size: 50 * 1024 },
      { allowPdf: false }
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported image format');
  });

  it('accepts PDF files up to 450 KB when allowPdf is true (Add Party)', () => {
    const res = validateUploadFile(
      { name: 'id-card.pdf', type: 'application/pdf', size: 300 * 1024 },
      { allowPdf: true }
    );
    expect(res.valid).toBe(true);
    expect(res.isImage).toBe(false);
  });

  it('rejects PDF files exceeding 450 KB so Firestore records remain valid', () => {
    const res = validateUploadFile(
      { name: 'oversize.pdf', type: 'application/pdf', size: MAX_PDF_BYTES + 1 },
      { allowPdf: true }
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('450 KB');
  });

  it('rejects images exceeding 5 MB raw limit', () => {
    const res = validateUploadFile(
      { name: 'huge.jpg', type: 'image/jpeg', size: MAX_RAW_IMAGE_BYTES + 1 },
      { allowPdf: true }
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('5 MB');
  });

  it('rejects empty files and unsupported file formats', () => {
    expect(validateUploadFile({ name: 'empty.jpg', type: 'image/jpeg', size: 0 }).valid).toBe(false);
    expect(
      validateUploadFile(
        { name: 'script.exe', type: 'application/x-msdownload', size: 1024 },
        { allowPdf: true }
      ).valid
    ).toBe(false);
  });
});
