'use client';

import dynamic from 'next/dynamic';
import AppShell from '../../components/AppShell';

const ExcelConverter = dynamic(() => import('../../components/ExcelConverter'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '50vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--gray-4)',
      fontSize: '13px',
    }}>
      Loading converter…
    </div>
  ),
});

export default function ExcelToExcelPage() {
  return (
    <AppShell>
      <ExcelConverter />
    </AppShell>
  );
}
