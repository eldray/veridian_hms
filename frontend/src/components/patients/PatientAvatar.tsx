import React, { useState } from 'react';
import { User } from 'lucide-react';

export interface PatientAvatarProps {
  patient?: any;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PatientAvatar: React.FC<PatientAvatarProps> = ({ patient, size = 'md', className = '' }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const dimensions = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' }[size];
  const iconSize = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' }[size];
  const imageUrl = patient?.imageUrl || patient?.photoUrl || patient?.photo || '';
  const name = patient?.fullName || patient?.name || [patient?.surname, patient?.otherNames].filter(Boolean).join(' ');
  return (
    <div className={`${dimensions} shrink-0 overflow-hidden rounded-lg bg-[var(--icon-cyan-bg)] flex items-center justify-center ${className}`}>
      {imageUrl && !imageFailed
        ? <img src={imageUrl} alt={name || 'Patient photo'} className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
        : <User className={`${iconSize} text-[var(--icon-cyan-text)]`} aria-hidden="true" />}
    </div>
  );
};

export default PatientAvatar;
