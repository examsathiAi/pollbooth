const fs = require('fs');

const ogFile = 'apps/web/src/app/poll/[id]/opengraph-image.tsx';
const ogCode = `import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PollBooth Opinion Poll';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default async function Image({ params }: { params: { id: string } }) {
  try {
    const res = await fetch(\`\${API_URL}/api/v1/polls/\${params.id}\`, { cache: "no-store" });
    const poll = res.ok ? await res.json() : null;
    
    const title = poll?.question || "Have your say on PollBooth.it";
    const category = poll?.category || "PUBLIC OPINION";

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f4efe7',
            padding: '60px 80px',
            borderTop: '20px solid #8a2a1b',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', width: '100%' }}>
            <div style={{ display: 'flex', fontSize: '32px', fontWeight: 900, color: '#8a2a1b', letterSpacing: '-0.05em' }}>
              PollBooth<span style={{ color: '#1f1b18' }}>.it</span>
            </div>
            <div style={{ display: 'flex', fontSize: '24px', fontWeight: 800, color: '#8a2a1b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {category}
            </div>
          </div>

          {/* Main Question */}
          <div
            style={{
              display: 'flex',
              fontSize: '68px',
              fontWeight: 800,
              color: '#1f1b18',
              lineHeight: 1.15,
              marginBottom: 'auto',
            }}
          >
            {title.length > 110 ? title.substring(0, 110) + '...' : title}
          </div>

          {/* Footer Call to Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '40px' }}>
            <div style={{ display: 'flex', fontSize: '36px', fontWeight: 600, color: '#6b665c' }}>
              Join the debate and see live results
            </div>
            <div
              style={{
                display: 'flex',
                padding: '20px 40px',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '32px',
                fontWeight: 800,
                borderRadius: '16px',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)',
              }}
            >
              Vote Now
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e) {
    return new Response('Failed to generate image', { status: 500 });
  }
}
`;

fs.writeFileSync(ogFile, ogCode);
console.log('Native Open Graph image generator created successfully.');
