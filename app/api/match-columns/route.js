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

CRITICAL: In the "source" field of your response, use the EXACT source column name as given above (e.g. "PT_FNAME"), even if it looks ugly or abbreviated. Do NOT rename it. Do NOT use the target name in the source field. The "source" must match a name from the SOURCE list verbatim, character for character.

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

Every target column must have an entry, in the same order as the TARGET list above.
Each "source" value must EXACTLY match one of the SOURCE column names above (or be null).`;

    // Abort the upstream request if Claude takes longer than 60s so the
    // Node worker doesn't hang indefinitely.
    const controller = new AbortController();
    const timeoutMs = 60000;
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
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
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr?.name === 'AbortError') {
        return Response.json({ error: `Claude did not respond within ${timeoutMs / 1000}s. Try again.` }, { status: 504 });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!upstream.ok) {
      // Don't log the upstream body — Claude may have echoed back prompt
      // content (which contains PHI sample values). Log only the status
      // and the upstream request id, which are useful for debugging
      // and contain no patient data.
      const upstreamReqId =
        upstream.headers.get('request-id') ||
        upstream.headers.get('x-request-id') ||
        '(none)';
      console.error('[match-columns] upstream error status=%d request-id=%s', upstream.status, upstreamReqId);
      return Response.json({ error: `Claude API returned ${upstream.status}` }, { status: 502 });
    }

    const data = await upstream.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) {
      return Response.json({ error: 'No text response from Claude' }, { status: 502 });
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
      // Don't log `cleaned` either — it can contain PHI from echoed samples.
      // We only need to know the failure happened; the prompt is reproducible.
      console.error('[match-columns] Claude returned invalid JSON (length=%d)', cleaned.length);
      return Response.json({ error: 'Claude returned invalid JSON' }, { status: 502 });
    }

    if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
      return Response.json({ error: 'Response missing mappings array' }, { status: 502 });
    }

    // Validate each mapping has the expected shape before returning.
    // The client's applyMapping assumes target/source/confidence/reason.
    const validShape = parsed.mappings.every(m =>
      m && typeof m === 'object' &&
      typeof m.target === 'string' && m.target.length > 0 &&
      (m.source === null || typeof m.source === 'string') &&
      (typeof m.confidence === 'number' || m.confidence === undefined)
    );
    if (!validShape) {
      // Don't log the items themselves — they may contain echoed PHI sample values.
      console.error('[match-columns] malformed mapping items (count=%d)', parsed.mappings.length);
      return Response.json({ error: 'Claude returned malformed mapping items' }, { status: 502 });
    }

    // Stricter contract validation: targets must exactly match the submitted
    // set (no hallucinated targets, no missing ones), sources (if non-null)
    // must exist in the submitted sourceColumns, and no source can be claimed
    // by two different targets — otherwise the client would render duplicate
    // columns or silently drop expected ones.
    const submittedTargets = new Set(targetColumns.map(t => String(t)));
    const submittedSources = new Set(sourceColumns.map(s => String(s)));
    const seenSource = new Set();
    let contractError = null;
    for (const m of parsed.mappings) {
      if (!submittedTargets.has(m.target)) {
        contractError = 'unknown_target';
        break;
      }
      if (m.source !== null && m.source !== undefined && m.source !== '') {
        if (!submittedSources.has(m.source)) {
          contractError = 'unknown_source';
          break;
        }
        if (seenSource.has(m.source)) {
          contractError = 'duplicate_source';
          break;
        }
        seenSource.add(m.source);
      }
    }
    if (contractError) {
      console.error('[match-columns] mapping contract violation: %s (target_count=%d, source_count=%d)',
        contractError, targetColumns.length, sourceColumns.length);
      return Response.json({ error: 'Claude returned an invalid mapping; please retry' }, { status: 502 });
    }

    // Normalize: ensure confidence is a number in [0,1] and reason is a string
    const normalized = parsed.mappings.map(m => ({
      target: m.target,
      source: m.source || null,
      confidence: typeof m.confidence === 'number' ? Math.max(0, Math.min(1, m.confidence)) : 0,
      reason: typeof m.reason === 'string' ? m.reason : '',
    }));

    return Response.json({ mappings: normalized });
  } catch (err) {
    console.error('[match-columns] unexpected error', err);
    return Response.json({ error: 'Server error while matching columns' }, { status: 500 });
  }
}
