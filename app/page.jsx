import AppShell from '../components/AppShell';
import HeroAnimation from '../components/HeroAnimation';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <AppShell>
      <div className="hero-bg" style={{ paddingTop: '48px', paddingBottom: '64px' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          alignItems: 'center',
        }}>
          {/* Left side — copy + CTA */}
          <div className="fade-in" style={{ animationDelay: '0.1s' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--cyan-bg)',
              borderRadius: '20px',
              marginBottom: '24px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--cyan)',
              letterSpacing: '0.3px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--cyan)',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
              ZEUS · INTELLIGENT FILE CONVERSION
            </div>

            <h1 style={{
              fontSize: '48px',
              lineHeight: 1.1,
              fontWeight: 700,
              margin: '0 0 20px',
              letterSpacing: '-0.025em',
              color: 'var(--black)',
            }}>
              Every EHR speaks
              <br />
              a different language.
              <br />
              <span style={{ color: 'var(--cyan)' }}>We translate them all.</span>
            </h1>

            <p style={{
              fontSize: '17px',
              lineHeight: 1.55,
              color: 'var(--gray-4)',
              margin: '0 0 32px',
              maxWidth: '500px',
            }}>
              Zeus turns messy exports from Athena, Epic, eClinicalWorks and any other system into the exact format your billing team needs. Build the mapping once, run it on ten thousand files a day &mdash; with patient data integrity guaranteed.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                href="/excel-to-excel"
                style={{
                  background: 'var(--cyan)',
                  color: 'var(--white)',
                  padding: '13px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s',
                }}
              >
                Open Excel &rarr; Excel converter
              </Link>
              <a
                href="#how-it-works"
                style={{
                  background: 'var(--white)',
                  color: 'var(--gray-4)',
                  padding: '13px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: '0.5px solid var(--gray-2)',
                }}
              >
                See how it works
              </a>
            </div>

            <div style={{
              display: 'flex',
              gap: '32px',
              marginTop: '40px',
              paddingTop: '32px',
              borderTop: '0.5px solid var(--gray-2)',
            }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--cyan)' }}>10k+</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-4)', margin: '2px 0 0' }}>files / day capacity</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--cyan)' }}>100%</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-4)', margin: '2px 0 0' }}>data accuracy</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--cyan)' }}>0</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-4)', margin: '2px 0 0' }}>engineers needed</p>
              </div>
            </div>
          </div>

          {/* Right side — animation */}
          <div className="fade-in" style={{ animationDelay: '0.3s' }}>
            <HeroAnimation />
          </div>
        </div>
      </div>

      {/* How it works — 3 step section */}
      <section id="how-it-works" style={{
        background: 'var(--white)',
        padding: '80px 24px',
        borderTop: '0.5px solid var(--gray-2)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--cyan)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            margin: '0 0 12px',
            textAlign: 'center',
          }}>How it works</p>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: '0 0 56px',
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}>
            Build once. Run forever.
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
          }}>
            {[
              {
                num: '01',
                title: 'Upload your messy file',
                body: 'Drop any Excel or CSV from any EHR. Zeus reads every column, profiles the data, and shows you exactly what is in there.',
              },
              {
                num: '02',
                title: 'Pick, rename, transform',
                body: 'Tick the columns and rows you want to keep. Rename headers your way. Filter out junk rows with simple rules. AI suggests clean healthcare-standard names.',
              },
              {
                num: '03',
                title: 'Save as a reusable template',
                body: 'Next time the same file format arrives, Zeus auto-detects your template and applies everything. One click, clean output, every time.',
              },
            ].map((step, i) => (
              <div key={i} style={{
                padding: '32px 24px',
                background: 'var(--gray-1)',
                borderRadius: '12px',
                border: '0.5px solid var(--gray-2)',
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--cyan)',
                  letterSpacing: '1px',
                  marginBottom: '12px',
                }}>STEP {step.num}</div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: '0 0 10px',
                  color: 'var(--black)',
                }}>{step.title}</h3>
                <p style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--gray-4)',
                  margin: 0,
                }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Zeus section */}
      <section style={{
        background: 'var(--gray-1)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--cyan)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            margin: '0 0 12px',
            textAlign: 'center',
          }}>Built for RCM</p>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: '0 0 56px',
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}>
            Why Zeus is different
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
          }}>
            {[
              {
                t: 'No engineers in the loop',
                d: 'Your billing team builds and edits templates themselves. Drag, drop, tick, rename &mdash; no code, no tickets, no waiting.',
              },
              {
                t: '100% accuracy, by design',
                d: 'After you save a template, every conversion runs on deterministic logic. Same input, same output, every single time. Zero hallucination.',
              },
              {
                t: 'Templates that auto-match',
                d: 'Upload a file Zeus has seen before? It recognises the column signature and offers to apply the saved template instantly.',
              },
              {
                t: 'AI assists, never decides',
                d: 'Claude suggests clean healthcare-standard column names. A human always confirms before anything is saved or sent.',
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '28px',
                background: 'var(--white)',
                borderRadius: '12px',
                border: '0.5px solid var(--gray-2)',
                display: 'flex',
                gap: '16px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--cyan)',
                  marginTop: '8px',
                  flexShrink: 0,
                }} />
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: '0 0 8px',
                    color: 'var(--black)',
                  }}>{item.t}</h3>
                  <p style={{
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'var(--gray-4)',
                    margin: 0,
                  }} dangerouslySetInnerHTML={{ __html: item.d }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        background: 'var(--white)',
        padding: '64px 24px',
        textAlign: 'center',
        borderTop: '0.5px solid var(--gray-2)',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 700,
          margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          Ready to clean up your first file?
        </h2>
        <p style={{
          fontSize: '15px',
          color: 'var(--gray-4)',
          margin: '0 0 28px',
        }}>
          No signup needed for the demo. Drop a file, get a clean one back in seconds.
        </p>
        <Link
          href="/excel-to-excel"
          style={{
            display: 'inline-flex',
            background: 'var(--cyan)',
            color: 'var(--white)',
            padding: '14px 28px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Open the converter &rarr;
        </Link>
      </section>
    </AppShell>
  );
}
