'use client';

export default function HeroAnimation() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '5 / 4',
      maxWidth: '560px',
      margin: '0 auto',
    }}>
      <svg
        viewBox="0 0 560 448"
        style={{ width: '100%', height: '100%', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cleanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B5D6" />
            <stop offset="100%" stopColor="#36C2DE" />
          </linearGradient>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00B5D6" stopOpacity="0" />
            <stop offset="50%" stopColor="#00B5D6" stopOpacity="1" />
            <stop offset="100%" stopColor="#00B5D6" stopOpacity="0" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feFlood floodColor="#000000" floodOpacity="0.06" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === LEFT: Messy source spreadsheet === */}
        <g filter="url(#softShadow)">
          <rect x="20" y="60" width="220" height="328" rx="10" fill="white" stroke="#E6E6E6" strokeWidth="0.5" />

          {/* Mac-style window dots */}
          <circle cx="36" cy="76" r="3" fill="#E6E6E6" />
          <circle cx="46" cy="76" r="3" fill="#E6E6E6" />
          <circle cx="56" cy="76" r="3" fill="#E6E6E6" />
          <text x="130" y="80" fontFamily="ui-monospace,monospace" fontSize="9" fill="#CCCCCC" textAnchor="middle">athena_export.xlsx</text>

          {/* Header row, 4 cols (messy names) */}
          <rect x="20" y="92" width="220" height="22" fill="#F5F7F8" stroke="#E6E6E6" strokeWidth="0.5" />
          <text x="34" y="106" fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">PT_FNAME</text>
          <text x="92" y="106" fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">DOB_RAW</text>
          <text x="146" y="106" fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">MRN_ID</text>
          <text x="200" y="106" fontFamily="ui-monospace,monospace" fontSize="9" fill="#CCCCCC">_temp</text>

          {/* Dividers */}
          <line x1="86" y1="92" x2="86" y2="380" stroke="#E6E6E6" strokeWidth="0.5" />
          <line x1="140" y1="92" x2="140" y2="380" stroke="#E6E6E6" strokeWidth="0.5" />
          <line x1="190" y1="92" x2="190" y2="380" stroke="#E6E6E6" strokeWidth="0.5" />

          {/* Data rows — slightly messy */}
          {[
            { y: 130, a: 'john', b: '5/20/85', c: 'A12345', d: '---' },
            { y: 154, a: 'MARIA', b: '11-3-72', c: 'a98102', d: 'x' },
            { y: 178, a: 'David ', b: '02/14/90', c: 'A33871', d: '' },
            { y: 202, a: 'Priya', b: '7/22/88', c: ' A55019', d: 'NULL' },
            { y: 226, a: 'JAMES', b: '9/15/65', c: 'A71234', d: '' },
            { y: 250, a: 'sarah', b: '1-8-1991', c: 'a18472', d: '---' },
            { y: 274, a: 'Robert', b: '12/3/77', c: 'A29384', d: '' },
            { y: 298, a: 'LISA', b: '6/19/82', c: 'A40192', d: 'x' },
            { y: 322, a: 'Mike', b: '4/4/79', c: 'a55903', d: '' },
            { y: 346, a: 'anna', b: '8/22/94', c: 'A66271', d: 'NULL' },
          ].map((row, i) => (
            <g key={i}>
              <rect x="20" y={row.y - 14} width="220" height="22" fill={i % 2 === 0 ? 'white' : '#FAFAFA'} />
              <text x="34" y={row.y} fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">{row.a}</text>
              <text x="92" y={row.y} fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">{row.b}</text>
              <text x="146" y={row.y} fontFamily="ui-monospace,monospace" fontSize="9" fill="#616161">{row.c}</text>
              <text x="200" y={row.y} fontFamily="ui-monospace,monospace" fontSize="9" fill="#CCCCCC">{row.d}</text>
            </g>
          ))}

          {/* Label */}
          <text x="130" y="408" fontSize="11" fill="#616161" textAnchor="middle" fontWeight="500">Messy source</text>
          <text x="130" y="424" fontSize="9" fill="#CCCCCC" textAnchor="middle">inconsistent · noisy · 4 cols</text>
        </g>

        {/* === MIDDLE: Zeus engine + flowing data === */}
        <g>
          {/* Flow line */}
          <line x1="245" y1="220" x2="320" y2="220" stroke="#E6E6E6" strokeWidth="1" strokeDasharray="3,3" />

          {/* Zeus pill */}
          <rect x="248" y="200" width="64" height="40" rx="20" fill="white" stroke="#00B5D6" strokeWidth="1" />
          <circle cx="260" cy="220" r="3" fill="#00B5D6" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
          <text x="280" y="224" fontSize="11" fill="#00B5D6" fontWeight="600">ZEUS</text>

          {/* Animated flowing dots — 3 staggered */}
          <circle cx="0" cy="220" r="3" fill="#00B5D6">
            <animateMotion
              path="M 245 0 L 320 0"
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            />
          </circle>
          <circle cx="0" cy="220" r="3" fill="#36C2DE">
            <animateMotion
              path="M 245 0 L 320 0"
              dur="2s"
              repeatCount="indefinite"
              begin="0.7s"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="0.7s"
            />
          </circle>
          <circle cx="0" cy="220" r="3" fill="#68D1E6">
            <animateMotion
              path="M 245 0 L 320 0"
              dur="2s"
              repeatCount="indefinite"
              begin="1.3s"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
              begin="1.3s"
            />
          </circle>
        </g>

        {/* === RIGHT: Clean output spreadsheet === */}
        <g filter="url(#softShadow)">
          <rect x="320" y="60" width="220" height="328" rx="10" fill="white" stroke="#00B5D6" strokeWidth="0.5" />

          {/* Cyan header band */}
          <rect x="320" y="60" width="220" height="32" rx="10" fill="url(#cleanGrad)" />
          <rect x="320" y="76" width="220" height="16" fill="url(#cleanGrad)" />
          <text x="430" y="80" fontSize="10" fill="white" textAnchor="middle" fontWeight="600" letterSpacing="0.5">ZEUS · CLEAN OUTPUT</text>

          {/* Header row */}
          <rect x="320" y="92" width="220" height="22" fill="#D6EBF2" stroke="#A1DEED" strokeWidth="0.5" />
          <text x="334" y="106" fontSize="9" fill="#00B5D6" fontWeight="600">First Name</text>
          <text x="402" y="106" fontSize="9" fill="#00B5D6" fontWeight="600">Date of Birth</text>
          <text x="486" y="106" fontSize="9" fill="#00B5D6" fontWeight="600">MRN</text>

          {/* Dividers */}
          <line x1="396" y1="92" x2="396" y2="380" stroke="#E6E6E6" strokeWidth="0.5" />
          <line x1="478" y1="92" x2="478" y2="380" stroke="#E6E6E6" strokeWidth="0.5" />

          {/* Clean data rows */}
          {[
            { y: 130, a: 'John', b: '1985-05-20', c: 'A12345' },
            { y: 154, a: 'Maria', b: '1972-11-03', c: 'A98102' },
            { y: 178, a: 'David', b: '1990-02-14', c: 'A33871' },
            { y: 202, a: 'Priya', b: '1988-07-22', c: 'A55019' },
            { y: 226, a: 'James', b: '1965-09-15', c: 'A71234' },
            { y: 250, a: 'Sarah', b: '1991-01-08', c: 'A18472' },
            { y: 274, a: 'Robert', b: '1977-12-03', c: 'A29384' },
            { y: 298, a: 'Lisa', b: '1982-06-19', c: 'A40192' },
            { y: 322, a: 'Mike', b: '1979-04-04', c: 'A55903' },
            { y: 346, a: 'Anna', b: '1994-08-22', c: 'A66271' },
          ].map((row, i) => (
            <g key={i} className="fade-in" style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
              <rect x="320" y={row.y - 14} width="220" height="22" fill={i % 2 === 0 ? 'white' : '#FAFBFC'} />
              <text x="334" y={row.y} fontSize="9" fill="#000000">{row.a}</text>
              <text x="402" y={row.y} fontSize="9" fill="#000000" fontFamily="ui-monospace,monospace">{row.b}</text>
              <text x="486" y={row.y} fontSize="9" fill="#000000" fontFamily="ui-monospace,monospace">{row.c}</text>
            </g>
          ))}

          {/* Label */}
          <text x="430" y="408" fontSize="11" fill="#00B5D6" textAnchor="middle" fontWeight="500">Standardized output</text>
          <text x="430" y="424" fontSize="9" fill="#CCCCCC" textAnchor="middle">consistent · validated · 3 cols</text>
        </g>

        {/* Top floating badges */}
        <g style={{ animation: 'float-cell 4s ease-in-out infinite' }}>
          <rect x="20" y="20" width="100" height="22" rx="11" fill="white" stroke="#E6E6E6" strokeWidth="0.5" />
          <text x="70" y="35" fontSize="10" fill="#616161" textAnchor="middle">Athena · Epic · eCW</text>
        </g>
        <g style={{ animation: 'float-cell 4s ease-in-out infinite', animationDelay: '1s' }}>
          <rect x="430" y="20" width="110" height="22" rx="11" fill="white" stroke="#00B5D6" strokeWidth="0.5" />
          <circle cx="446" cy="31" r="3" fill="#00B5D6" />
          <text x="490" y="35" fontSize="10" fill="#00B5D6" textAnchor="middle" fontWeight="500">Your format</text>
        </g>
      </svg>
    </div>
  );
}
