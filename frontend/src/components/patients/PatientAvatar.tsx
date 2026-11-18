import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

interface PatientAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
  fallbackIcon?: React.ElementType<{ className?: string }>;
}

/** Consistent patient photo rendering with a reliable fallback when no photo is available. */
export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  imageUrl, name, size = 'md', className = '', fallbackClassName = '', fallbackText, fallbackIcon: FallbackIcon = User,
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Patient photos are uploaded to this application's protected upload area. Never
  // request arbitrary third-party URLs supplied through patient data.
  const safeImageUrl = imageUrl && /^\/(?:api\/)?uploads\/patients\/[A-Za-z0-9._-]+$/.test(imageUrl) ? imageUrl : null;
  const showImage = Boolean(safeImageUrl) && failedUrl !== safeImageUrl;
  useEffect(() => {
    setFailedUrl(null);
    if (!safeImageUrl) return;
    const retryWhenOnline = () => setFailedUrl(null);
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [safeImageUrl]);
  const sizes = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden flex items-center justify-center ${sizes[size]} ${className}`}
      aria-label={name ? `Photo of ${name}` : 'Patient photo'}
    >
      {showImage ? (
        <img
          src={safeImageUrl!}
          alt={name ? `${name} patient photo` : 'Patient photo'}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(safeImageUrl || null)}
        />
      ) : (
        fallbackText ? (
          <span className={`text-xs font-bold tracking-wide ${fallbackClassName || 'text-white'}`}>{fallbackText}</span>
        ) : (
          <FallbackIcon className={`w-1/2 h-1/2 ${fallbackClassName || 'text-white'}`} aria-hidden="true" />
        )
      )}
    </div>
  );
};
