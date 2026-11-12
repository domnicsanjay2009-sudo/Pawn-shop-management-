import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { useModalScrollLock } from '../../utils/modalScrollLock';

interface MediaPreviewModalProps {
  isOpen: boolean;
  title: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  title,
  url,
  fileName,
  fileType,
  onClose,
}) => {
  useModalScrollLock(isOpen && Boolean(url), onClose);

  if (!isOpen || !url) return null;

  const isPdf =
    fileType === 'application/pdf' ||
    url.startsWith('data:application/pdf') ||
    fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-media-preview-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h3 id="modal-media-preview-title" className="text-sm font-bold text-brand-950 truncate">{title}</h3>
            {fileName && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{fileName}</p>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={url}
              download={fileName || (isPdf ? 'document.pdf' : 'customer-photo.jpg')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-950 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-100 flex items-center justify-center flex-1 overflow-auto">
          {isPdf ? (
            <div className="w-full space-y-3">
              <iframe
                src={url}
                title={title}
                className="w-full h-[62vh] rounded-xl border border-slate-200 bg-white"
              />
              <div className="flex items-center justify-center text-xs text-slate-500 gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>If the PDF does not render inline on your device, click Download above.</span>
              </div>
            </div>
          ) : (
            <img
              src={url}
              alt={title}
              className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-sm bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
