import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  MapPin,
  Camera,
  Upload,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { isValidIndianPhone } from '../../utils/validators';
import { processUploadFile } from '../../services/fileStorageService';

interface AddPartyFormProps {
  onSave: (data: {
    name: string;
    phone: string;
    address: string;
    photoUrl?: string;
    documentUrl?: string;
    documentName?: string;
    documentType?: string;
  }) => Promise<void>;
}

export const AddPartyForm: React.FC<AddPartyFormProps> = ({ onSave }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus cursor in first field when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
    }
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
    setError('');
  };

  const clearUploadedFile = () => {
    setPhotoUrl('');
    setDocumentUrl('');
    setDocumentName('');
    setDocumentType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploadingFile(true);
    try {
      const processed = await processUploadFile(file, {
        allowPdf: true,
        maxDimension: 800,
        quality: 0.78,
        preserveTransparency: false,
      });

      if (processed.isImage) {
        setPhotoUrl(processed.dataUrl);
        setDocumentUrl('');
      } else {
        setPhotoUrl('');
        setDocumentUrl(processed.dataUrl);
      }
      setDocumentName(processed.fileName);
      setDocumentType(processed.fileType);
    } catch (err: any) {
      setError(err?.message || 'Unable to process selected file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter Party Name.');
      return;
    }

    if (!isValidIndianPhone(phone)) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }

    if (!address.trim()) {
      setError('Please enter Party Address.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photoUrl: photoUrl || undefined,
        documentUrl: documentUrl || undefined,
        documentName: documentName || undefined,
        documentType: documentType || undefined,
      });

      // Reset and collapse form after successful save as specified
      setName('');
      setPhone('');
      setAddress('');
      clearUploadedFile();
      setIsExpanded(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save customer record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      {/* Minimized / Collapsed Bar */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-950">Add Party</h3>
            <p className="text-xs text-slate-500">Register a new customer / borrower</p>
          </div>
        </div>
        <div className="p-1 rounded-full text-slate-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Animated Form */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-fadeIn">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Party Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Party Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Varma"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              {/* Party Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Party Phone Number (10 Digits) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            {/* Party Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Party Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Landmark, City/Town"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            {/* Optional Customer Photo / Document File Upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Optional Customer Photo / Document Upload
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center space-x-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-left text-sm text-slate-600 transition-colors min-w-0 cursor-pointer"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Selected preview"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : documentUrl ? (
                    <FileText className="w-4 h-4 text-accent-600 shrink-0" />
                  ) : (
                    <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate text-xs sm:text-sm">
                    {documentName || 'Select photo (JPG, PNG, WEBP) or PDF (optional)'}
                  </span>
                </button>

                {(photoUrl || documentUrl) && (
                  <button
                    type="button"
                    onClick={clearUploadedFile}
                    title="Remove selected file"
                    className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{photoUrl || documentUrl ? 'Change' : 'Browse File'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports JPG, PNG, WEBP, GIF images (up to 5 MB) or PDF documents (up to 450 KB).
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Party...</span>
                  </>
                ) : (
                  <span>Save Party</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
