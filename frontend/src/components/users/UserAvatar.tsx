import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fallbackText?: string;
}

/** Displays a staff member's uploaded profile photo; never substitutes a patient's photo. */
export default function UserAvatar({ imageUrl, name, size = 'sm', className = '', fallbackText }: UserAvatarProps) {
  const safeUrl = typeof imageUrl === 'string' && (
    /^\/(?:api\/)?uploads\/(?:users|staff|profiles)\/[A-Za-z0-9._-]+$/.test(imageUrl) ||
    /^https?:\/\//i.test(imageUrl) ||
    /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(imageUrl)
  ) ? imageUrl : null;
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [safeUrl]);
  const dims = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }[size];
  const initials = fallbackText || String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  return (
    <div className={`${dims} shrink-0 overflow-hidden rounded-full flex items-center justify-center bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] ${className}`}
      role="img" aria-label={name ? `Profile photo of ${name}` : 'Staff profile photo'} title={name || 'Staff profile'}>
      {safeUrl && !failed
        ? <img src={safeUrl} alt={name ? `${name} profile photo` : 'Staff profile photo'} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />
        : initials ? <span className="text-[10px] font-bold">{initials}</span> : <User className="w-4 h-4" aria-hidden="true" />}
    </div>
  );
}
