// Server-side proxy to Anthropic. Keeps ANTHROPIC_API_KEY out of the browser.
// Set ANTHROPIC_API_KEY in Vercel environment variables.

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY env var not set on server' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
