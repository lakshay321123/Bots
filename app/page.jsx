'use client';

import dynamic from 'next/dynamic';

const ExcelConverter = dynamic(() => import('../components/ExcelConverter'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#616161',
      fontSize: '13px',
    }}>
      Loading Zeus…
    </div>
  ),
});

export default function Page() {
  return <ExcelConverter />;
}
