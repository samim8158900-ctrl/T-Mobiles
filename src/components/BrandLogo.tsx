import React from 'react';

interface BrandLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  storeName?: string;
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  theme = 'dark',
  size = 'md',
  storeName = 'T Mobiles',
  showSubtitle = true,
}) => {
  const iconDimensions =
    size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const titleSize =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl';
  const subSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  const parts = storeName.trim().split(/\s+/);
  const firstPart = parts[0] || 'T';
  const restPart = parts.slice(1).join(' ') || 'Mobiles';

  return (
    <div className="inline-flex items-center gap-3 select-none shrink-0">
      {/* Custom T Mobiles 3D Angled Phone + Orbital Swoosh SVG */}
      <div className={`relative ${iconDimensions} flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
          aria-hidden="true"
        >
          {/* Phone Outer Bezel tilted slightly */}
          <g transform="rotate(-8 32 32)">
            <rect
              x="16"
              y="6"
              width="30"
              height="52"
              rx="6"
              fill={theme === 'dark' ? '#0F2547' : '#0B192C'}
              stroke={theme === 'dark' ? '#60A5FA' : '#1E40AF'}
              strokeWidth="2.5"
            />
            {/* Screen Gradient */}
            <rect
              x="19"
              y="10"
              width="24"
              height="43"
              rx="3.5"
              fill="url(#tmScreenGrad)"
            />
            {/* Bold T inside Screen */}
            <path
              d="M24 18H38V22H33V38H29V22H24V18Z"
              fill="#FFFFFF"
              fillOpacity="0.92"
            />
            {/* Speaker notch & home bar */}
            <rect x="28" y="7.5" width="6" height="1.5" rx="0.75" fill="#93C5FD" />
            <circle cx="31" cy="55" r="1.5" fill="#93C5FD" />
          </g>
          {/* Dynamic Orbital Swoosh around Phone */}
          <path
            d="M8 42C14 50 34 48 49 36C57 29 60 21 53 19C49 18 44 20 40 23"
            stroke="url(#tmSwooshGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient
              id="tmScreenGrad"
              x1="19"
              y1="10"
              x2="43"
              y2="53"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#38BDF8" />
              <stop offset="0.5" stopColor="#0066FF" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient
              id="tmSwooshGrad"
              x1="8"
              y1="42"
              x2="58"
              y2="20"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#0066FF" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <div className={`${titleSize} font-extrabold tracking-tight whitespace-nowrap`}>
          <span className="text-[#0066FF]">{firstPart}</span>{' '}
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            {restPart}
          </span>
        </div>
        {showSubtitle && (
          <div
            className={`${subSize} font-medium tracking-wider mt-1 whitespace-nowrap ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Buy <span className="text-[#0066FF] mx-0.5">•</span> Sell{' '}
            <span className="text-[#0066FF] mx-0.5">•</span> Manage
          </div>
        )}
      </div>
    </div>
  );
};
