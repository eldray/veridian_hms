import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

export interface PatientAvatarProps {
  patient?: any;
  imageUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
  fallbackIcon?: React.ElementType<{ className?: string }>;
}

export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  patient,
  imageUrl: imageUrlProp,
  name: nameProp,
  size = 'md',
  className = '',
  fallbackClassName = '',
  fallbackText,
  fallbackIcon: FallbackIcon = User,
}) => {
  const imageUrl = imageUrlProp ?? patient?.imageUrl ?? patient?.photoUrl ?? patient?.photo ?? '';
  const name = nameProp ?? patient?.fullName ?? patient?.name ?? [patient?.surname, patient?.otherNames].filter(Boolean).join(' ');
  // Only load photos from the hospital's own patient-upload endpoint.
  const safeImageUrl = imageUrl && /^\/(?:api\/)?uploads\/patients\/[A-Za-z0-9._-]+$/.test(imageUrl) ? imageUrl : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => {
    setFailedUrl(null);
    if (!safeImageUrl) return;
    const retryWhenOnline = () => setFailedUrl(null);
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [safeImageUrl]);
  const dimensions = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' }[size];
  const iconSize = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' }[size];
  const showImage = Boolean(safeImageUrl) && failedUrl !== safeImageUrl;
  return (
    <div
      className={`${dimensions} shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      aria-label={name ? `Photo of ${name}` : 'Patient photo'}
    >
      {showImage ? (
        <img
          src={safeImageUrl!}
          alt={name ? `${name} patient photo` : 'Patient photo'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(safeImageUrl)}
        />
      ) : fallbackText ? (
        <span className={`text-xs font-bold tracking-wide ${fallbackClassName || 'text-white'}`}>{fallbackText}</span>
      ) : (
        <FallbackIcon className={`${iconSize} ${fallbackClassName || 'text-[var(--icon-cyan-text)]'}`} aria-hidden="true" />
      )}
    </div>
  );
};

export default PatientAvatar;
