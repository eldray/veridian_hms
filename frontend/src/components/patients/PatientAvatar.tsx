import React, { useState } from 'react';
import { User } from 'lucide-react';

interface PatientAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

/** Consistent patient photo rendering with a reliable fallback when no photo is available. */
export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  imageUrl, name, size = 'md', className = '', fallbackClassName = '',
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;
  const sizes = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden flex items-center justify-center ${sizes[size]} ${className}`}
      aria-label={name ? `Photo of ${name}` : 'Patient photo'}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={name ? `${name} patient photo` : 'Patient photo'}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(imageUrl || null)}
        />
      ) : (
        <User className={`w-1/2 h-1/2 ${fallbackClassName || 'text-white'}`} aria-hidden="true" />
      )}
    </div>
  );
};
