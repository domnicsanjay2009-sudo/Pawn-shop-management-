import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { MediaPreviewModal } from './MediaPreviewModal';

interface CustomerAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  allowZoom?: boolean;
}

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  photoUrl,
  name,
  size = 'md',
  className = '',
  allowZoom = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size];

  const initials = (name || 'Customer')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const hasPhoto = Boolean(photoUrl && photoUrl.trim() && !imageError);

  return (
    <>
      <div
        className={`inline-flex items-center justify-center flex-shrink-0 rounded-full border border-slate-200 shadow-xs overflow-hidden select-none bg-slate-100 text-slate-700 font-semibold ${sizeClasses} ${
          hasPhoto && allowZoom ? 'cursor-pointer hover:ring-2 hover:ring-amber-500 hover:opacity-90 transition-all' : ''
        } ${className}`}
        onClick={(e) => {
          if (hasPhoto && allowZoom) {
            e.stopPropagation();
            setPreviewOpen(true);
          }
        }}
        title={name ? `${name}${hasPhoto && allowZoom ? ' (Click to view photo)' : ''}` : undefined}
      >
        {hasPhoto ? (
          <img
            src={photoUrl!}
            alt={name || 'Customer'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UserIcon className={`${iconSizes} text-slate-400`} />
        )}
      </div>

      {previewOpen && hasPhoto && (
        <MediaPreviewModal
          isOpen={previewOpen}
          url={photoUrl!}
          fileType="image/jpeg"
          title={`${name || 'Customer'} - Photo`}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
};
