'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#faf8ff',
          padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              width: '64px', height: '64px', background: '#fee2e2',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
              fontSize: '2rem',
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#131b2e', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#454655', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem', background: '#0623bb',
                color: 'white', border: 'none', borderRadius: '0.75rem',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
