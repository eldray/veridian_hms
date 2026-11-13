type VeridianLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Veridian HMS emblem: a sweeping V, medical cross, ECG pulse and growth arc. */
export default function VeridianLogo({ size = 32, className }: VeridianLogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 180 160"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="veridian-blue" x1="18" y1="18" x2="142" y2="145" gradientUnits="userSpaceOnUse">
          <stop stopColor="#078ACB" /><stop offset="1" stopColor="#063A78" />
        </linearGradient>
        <linearGradient id="veridian-green" x1="52" y1="12" x2="151" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63D51D" /><stop offset=".55" stopColor="#00A83B" /><stop offset="1" stopColor="#007C48" />
        </linearGradient>
        <linearGradient id="veridian-swoosh" x1="12" y1="135" x2="145" y2="155" gradientUnits="userSpaceOnUse">
          <stop stopColor="#063A78" /><stop offset=".52" stopColor="#00A8C9" /><stop offset="1" stopColor="#00A83B" />
        </linearGradient>
      </defs>
      <path d="M13 44H43L88 112L132 44H161L101 137H75L13 44Z" fill="url(#veridian-blue)" />
      <path d="M48 36C84 10 127 4 148 16C166 27 156 58 140 78L105 126L83 126L121 69C137 44 137 29 122 25C103 20 76 28 48 36Z" fill="url(#veridian-green)" />
      <path d="M20 91C3 119 15 139 48 145C84 152 127 140 161 119C132 148 82 160 42 154C3 148 -4 119 20 91Z" fill="url(#veridian-swoosh)" />
      <rect x="70" y="23" width="46" height="55" rx="7" fill="#064887" />
      <path d="M85 23V9H101V23H116V39H101V55H85V39H70V23H85Z" fill="#07539A" />
      <path d="M74 46H84L89 39L94 55L101 30L107 46H113" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
