export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        background: 'var(--white)',
        borderTop: '0.5px solid var(--gray-2)',
        padding: '20px 24px',
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: 'var(--gray-4)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--black)' }}>Zeus</span>
        <span style={{ color: 'var(--gray-3)' }}>·</span>
        <span>Built on the MedCloud platform</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: 'var(--gray-4)',
          letterSpacing: '0.3px',
        }}
      >
        <span>© {year} Cosentus</span>
        <span style={{ color: 'var(--gray-3)' }}>·</span>
        <span style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>A Cosentus Division</span>
      </div>
    </footer>
  );
}
