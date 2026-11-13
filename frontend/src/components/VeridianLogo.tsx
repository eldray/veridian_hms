import React from 'react';

type VeridianLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Veridian HMS brand mark: a connected V motif with a clinical cross. */
export default function VeridianLogo({
  size = 32,
  className,
  title = 'Veridian HMS',
}: VeridianLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="veridian-mark-bg" x1="5" y1="4" x2="43" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#123B52" />
          <stop offset="1" stopColor="#087F72" />
        </linearGradient>
        <linearGradient id="veridian-mark-v" x1="9" y1="9" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#75E0B1" />
          <stop offset="1" stopColor="#27B6A0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#veridian-mark-bg)" />
      <path d="M10 11.5H17.2L24 29.2L30.8 11.5H38L25.8 39H22.2L10 11.5Z" fill="url(#veridian-mark-v)" />
      <path d="M21.25 16.2H26.75V21.05H31.6V26.55H26.75V31.4H21.25V26.55H16.4V21.05H21.25V16.2Z" fill="#F5FFFC" stroke="#087F72" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
