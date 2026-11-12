import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

interface ShopLogoBadgeProps {
  logoUrl?: string;
  shopName?: string;
  sizeClass?: string;
  iconClass?: string;
  roundedClass?: string;
  fallbackBgClass?: string;
}

export const ShopLogoBadge: React.FC<ShopLogoBadgeProps> = ({
  logoUrl,
  shopName = 'Pawn Shop Logo',
  sizeClass = 'w-10 h-10',
  iconClass = 'w-6 h-6 text-white',
  roundedClass = 'rounded-xl',
  fallbackBgClass = 'bg-accent-600 shadow-md shadow-accent-600/30',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imgFailed) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} overflow-hidden border border-white/15 bg-white flex items-center justify-center shrink-0 shadow-xs`}
      >
        <img
          src={logoUrl}
          alt={shopName}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} ${fallbackBgClass} flex items-center justify-center shrink-0`}
    >
      <ShieldCheck className={iconClass} />
    </div>
  );
};
