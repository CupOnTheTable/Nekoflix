export default function NekoflixLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cat ears */}
      <path d="M10 18 L14 6 L20 14 Z" fill="#F59E0B" />
      <path d="M38 18 L34 6 L28 14 Z" fill="#F59E0B" />
      <path d="M12 16 L15 8 L19 14 Z" fill="#FBBF24" />
      <path d="M36 16 L33 8 L29 14 Z" fill="#FBBF24" />

      {/* Cat head */}
      <ellipse cx="24" cy="26" rx="16" ry="14" fill="#F59E0B" />

      {/* White face patch */}
      <ellipse cx="24" cy="30" rx="10" ry="9" fill="white" />

      {/* Eyes */}
      <ellipse cx="18" cy="24" rx="3.5" ry="4" fill="#1E293B" />
      <ellipse cx="30" cy="24" rx="3.5" ry="4" fill="#1E293B" />
      <ellipse cx="17" cy="23" rx="1.2" ry="1.5" fill="white" />
      <ellipse cx="29" cy="23" rx="1.2" ry="1.5" fill="white" />

      {/* Nose */}
      <ellipse cx="24" cy="28" rx="2" ry="1.5" fill="#F97316" />

      {/* Mouth */}
      <path d="M24 29.5 Q21 32 19 30" stroke="#1E293B" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M24 29.5 Q27 32 29 30" stroke="#1E293B" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* Whiskers */}
      <line x1="6" y1="26" x2="16" y2="28" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="6" y1="30" x2="16" y2="30" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="42" y1="26" x2="32" y2="28" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="42" y1="30" x2="32" y2="30" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />

      {/* Play button circle overlapping right side */}
      <circle cx="36" cy="22" r="10" fill="#1E3A5F" />
      <circle cx="36" cy="22" r="8" fill="#0D9488" />
      <path d="M33 17 L33 27 L41 22 Z" fill="white" />
    </svg>
  );
}
