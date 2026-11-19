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

// These are illustrative, photorealistic sample portraits, not verified patient
// photographs. A patient's own uploaded photo always takes precedence.
const PLACEHOLDER_PORTRAITS = [
  'https://randomuser.me/api/portraits/men/11.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/women/32.jpg',
  'https://randomuser.me/api/portraits/men/45.jpg',
  'https://randomuser.me/api/portraits/women/45.jpg',
  'https://randomuser.me/api/portraits/men/56.jpg',
  'https://randomuser.me/api/portraits/women/56.jpg',
  'https://randomuser.me/api/portraits/men/65.jpg',
  'https://randomuser.me/api/portraits/women/65.jpg',
  'https://randomuser.me/api/portraits/men/75.jpg',
  'https://randomuser.me/api/portraits/women/75.jpg',
  'https://randomuser.me/api/portraits/men/82.jpg',
  'https://randomuser.me/api/portraits/women/82.jpg',
  'https://randomuser.me/api/portraits/men/90.jpg',
  'https://randomuser.me/api/portraits/women/90.jpg',
];

const getPortraitIndex = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % PLACEHOLDER_PORTRAITS.length;
};

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
  // Only load patient photographs from the hospital's own patient-upload endpoint.
  const safeImageUrl = imageUrl && /^\/(?:api\/)?uploads\/patients\/[A-Za-z0-9._-]+$/.test(imageUrl) ? imageUrl : null;
  const patientKey = String(patient?.id ?? patient?.patientId ?? patient?.folderNumber ?? name ?? 'unknown-patient');
  const placeholderUrl = PLACEHOLDER_PORTRAITS[getPortraitIndex(patientKey)];
  const displayImageUrl = safeImageUrl || placeholderUrl;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
    const retryWhenOnline = () => setFailedUrl(null);
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [displayImageUrl]);

  const dimensions = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' }[size];
  const iconSize = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' }[size];
  const showImage = displayImageUrl !== failedUrl;

  return (
    <div
      className={`${dimensions} shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      aria-label={name ? (safeImageUrl ? `Photo of ${name}` : `Illustrative placeholder portrait for ${name}; not a verified patient photo`) : 'Patient portrait'}
      title={safeImageUrl ? (name ? `Photo of ${name}` : 'Patient photo') : 'Illustrative placeholder portrait — not a verified patient photo'}
    >
      {showImage ? (
        <img
          src={displayImageUrl}
          alt={safeImageUrl ? (name ? `${name} patient photo` : 'Patient photo') : 'Illustrative sample portrait, not the patient\'s verified photo'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(displayImageUrl)}
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
