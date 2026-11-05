import React from 'react';

interface InvoCoreLogoProps {
  size?: number | string;
  showText?: boolean;
  variant?: 'light' | 'dark'; // 'light' for dark backgrounds (navbar/header), 'dark' for white/light backgrounds
  className?: string;
}

export const InvoCoreLogo: React.FC<InvoCoreLogoProps> = ({
  size = 36,
  showText = false,
  variant = 'light',
  className = '',
}) => {
  const isLight = variant === 'light';
  const navyColor = isLight ? '#FFFFFF' : '#0B192C';
  const subtextColor = isLight ? '#94A3B8' : '#64748B';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
      >
        <defs>
          {/* Document Gradient: Emerald to Gold */}
          <linearGradient id="invocore-doc-grad" x1="40" y1="12" x2="88" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>

          {/* Cloud Core Gradient: Navy to Emerald to Amber */}
          <linearGradient id="invocore-cloud-grad" x1="38" y1="56" x2="94" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isLight ? '#38BDF8' : '#0F2B48'} />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Core Loop Gradient */}
          <linearGradient id="invocore-loop-grad" x1="48" y1="70" x2="78" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* --- 1. Stylized Letter "i" (Left Column) --- */}
        {/* Square Dot of "i" */}
        <rect
          x="12"
          y="13"
          width="13"
          height="13"
          rx="1.5"
          fill={navyColor}
        />
        {/* Stem of "i" with top spur and wide bottom serif */}
        <path
          d="M 6 36 L 25 36 L 25 80 L 32 80 L 32 88 L 6 88 L 6 80 L 13 80 L 13 44 L 6 44 Z"
          fill={navyColor}
        />

        {/* --- 2. Folded Document (Center-Right) --- */}
        <path
          d="M 39 80 L 39 17 C 39 14.5 41 13 43.5 13 L 68 13 L 83 28 L 83 55"
          stroke="url(#invocore-doc-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Folded Corner Triangle */}
        <path
          d="M 67 14 L 67 27 C 67 28 68 29 69 29 L 82 29"
          stroke="url(#invocore-doc-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Document Green Verification Checkmark */}
        <path
          d="M 50 43 L 58 51 L 71 37"
          stroke="#10B981"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* --- 3. Overlapping Financial Cloud with Central Core Loop --- */}
        {/* Cloud Perimeter */}
        <path
          d="M 52 87 C 43 87 38 79 41 71 C 43 65 50 63 56 65 C 58 57 66 52 74 54 C 82 56 86 63 85 70 C 91 71 95 76 94 82 C 93 88 88 92 81 92 L 64 92"
          stroke="url(#invocore-cloud-grad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner Core Swirl / Check */}
        <path
          d="M 57 80 C 54 75 58 70 64 70 C 70 70 73 75 70 81 C 67 86 60 86 56 83"
          stroke="url(#invocore-loop-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight select-none">
            <span style={{ color: navyColor }}>Invo</span>
            <span className="text-emerald-500">Core</span>
          </div>
          <span
            style={{ color: subtextColor }}
            className="text-[9.5px] font-bold tracking-wider uppercase mt-0.5"
          >
            B2B Invoicing
          </span>
        </div>
      )}
    </div>
  );
};
