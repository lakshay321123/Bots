// Server-side proxy: ask Claude to map source columns to a target format's columns.
// Keeps ANTHROPIC_API_KEY out of the browser.

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY env var not set on server' }, { status: 500 });
    }

    const { sourceColumns, targetColumns, sampleRows } = await req.json();

    if (!Array.isArray(sourceColumns) || !Array.isArray(targetColumns)) {
      return Response.json({ error: 'sourceColumns and targetColumns are required arrays' }, { status: 400 });
    }
    if (sourceColumns.length === 0 || targetColumns.length === 0) {
      return Response.json({ error: 'columns cannot be empty' }, { status: 400 });
    }

    // Build a compact preview of source data so Claude can use values to disambiguate
    const sourceWithSamples = sourceColumns.map((name, i) => ({
      name,
      samples: (sampleRows || [])
        .slice(0, 3)
        .map(r => r[i])
        .filter(v => v !== '' && v != null)
        .map(v => String(v).slice(0, 40))
    }));

    const prompt = `You are mapping columns from a healthcare RCM source export to a target billing format.

SOURCE columns (with sample values):
${JSON.stringify(sourceWithSamples, null, 2)}

TARGET columns (this is the format we need to output to):
${JSON.stringify(targetColumns)}

For each TARGET column, pick the BEST matching source column (or null if there is no good match).
Use both the column names AND the sample values to decide. For example, if target is "Date of Birth" and a source column has values like "5/20/85" or "1985-05-20", that is a strong match even if the source name is "DOB_RAW" or "patient_dob".

Confidence rubric:
  high (0.9-1.0): unmistakable match (e.g. "PT_FNAME" → "First Name")
  medium (0.6-0.89): likely correct based on name or values, but worth confirming
  low (0-0.59): a guess, user should review

Return ONLY a JSON object in this exact shape, no preamble or markdown:
{
  "mappings": [
    { "target": "First Name", "source": "PT_FNAME", "confidence": 0.95, "reason": "name match" },
    { "target": "Date of Birth", "source": "DOB_RAW", "confidence": 0.92, "reason": "values like 5/20/85 are dates" },
    { "target": "Some Field", "source": null, "confidence": 0, "reason": "no source column matches" }
  ]
}

Every target column must have an entry, in the same order as the TARGET list above.`;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return Response.json({ error: `Claude API ${upstream.status}: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const data = await upstream.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) {
      return Response.json({ error: 'no text response from Claude' }, { status: 502 });
    }

    const cleaned = textBlock.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return Response.json({ error: 'Claude returned invalid JSON', raw: cleaned.slice(0, 300) }, { status: 502 });
    }

    if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
      return Response.json({ error: 'response missing mappings array' }, { status: 502 });
    }

    return Response.json({ mappings: parsed.mappings });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
