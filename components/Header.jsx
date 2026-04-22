'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/excel-to-excel', label: 'Excel to Excel', live: true },
  { href: '/excel-to-pdf', label: 'Excel to PDF', live: false },
  { href: '/pdf-to-excel', label: 'PDF to Excel', live: false },
  { href: '/image-to-excel', label: 'Image to Excel', live: false },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      style={{
        background: 'var(--white)',
        borderBottom: '0.5px solid var(--gray-2)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: '24px',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--black)',
              letterSpacing: '-0.02em',
            }}
          >
            Zeus
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--gray-4)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            File Converter
          </span>
        </div>
      </Link>

      <nav
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/excel-to-excel' && pathname === '/');
          return (
            <Link
              key={tab.href}
              href={tab.live ? tab.href : '#'}
              onClick={(e) => { if (!tab.live) e.preventDefault(); }}
              style={{
                position: 'relative',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: isActive ? 'var(--cyan)' : tab.live ? 'var(--gray-4)' : 'var(--gray-3)',
                background: isActive ? 'var(--cyan-bg)' : 'transparent',
                borderRadius: '6px',
                cursor: tab.live ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (!isActive && tab.live) e.currentTarget.style.background = 'var(--gray-1)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {tab.label}
              {!tab.live && (
                <span
                  style={{
                    fontSize: '9px',
                    background: 'var(--gray-2)',
                    color: 'var(--gray-4)',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Image
          src="/cosentus-logo.png"
          alt="Cosentus"
          width={140}
          height={26}
          priority
          style={{ height: '26px', width: 'auto' }}
        />
      </div>
    </header>
  );
}
