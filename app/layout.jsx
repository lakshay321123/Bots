export const metadata = {
  title: 'Zeus File Converter',
  description: 'Excel to Excel converter with templates and AI rename — by Cosentus',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F5F7F8' }}>
        {children}
      </body>
    </html>
  );
}
