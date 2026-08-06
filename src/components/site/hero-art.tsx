export function HeroArt() {
  return (
    <svg
      viewBox="0 0 520 420"
      role="img"
      aria-label="Abstract illustration of stacked tool panels"
      className="w-full max-w-lg"
    >
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>

      <circle cx="120" cy="90" r="70" fill="url(#g2)" opacity="0.18" />
      <circle cx="420" cy="330" r="90" fill="url(#g1)" opacity="0.16" />

      <g className="animate-float">
        <rect x="60" y="120" width="300" height="190" rx="30" fill="url(#g1)" opacity="0.95" />
        <rect x="88" y="152" width="150" height="14" rx="7" fill="#fff" opacity="0.85" />
        <rect x="88" y="182" width="240" height="10" rx="5" fill="#fff" opacity="0.5" />
        <rect x="88" y="204" width="200" height="10" rx="5" fill="#fff" opacity="0.4" />
        <rect x="88" y="240" width="110" height="34" rx="17" fill="#fff" opacity="0.9" />
        <rect x="210" y="240" width="80" height="34" rx="17" fill="#fff" opacity="0.35" />
      </g>

      <g style={{ animation: "float-slow 8.5s ease-in-out infinite" }}>
        <rect x="290" y="60" width="170" height="120" rx="26" fill="url(#g3)" />
        <rect x="314" y="88" width="80" height="10" rx="5" fill="#fff" opacity="0.9" />
        <rect x="314" y="110" width="120" height="8" rx="4" fill="#fff" opacity="0.55" />
        <rect x="314" y="128" width="96" height="8" rx="4" fill="#fff" opacity="0.45" />
      </g>

      <g style={{ animation: "float-slow 6.5s ease-in-out infinite" }}>
        <rect x="230" y="270" width="200" height="96" rx="24" fill="url(#g2)" />
        <circle cx="262" cy="318" r="14" fill="#fff" opacity="0.9" />
        <rect x="288" y="304" width="112" height="10" rx="5" fill="#fff" opacity="0.8" />
        <rect x="288" y="324" width="80" height="8" rx="4" fill="#fff" opacity="0.5" />
      </g>
    </svg>
  );
}