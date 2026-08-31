export default function KuroPlayLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#kg)" />
      <path d="M15 10L30 20L15 30V10Z" fill="white" fillOpacity="0.95" />
    </svg>
  );
}
