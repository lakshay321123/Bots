# Zeus File Converter — by Cosentus

Excel → Excel converter for healthcare RCM workflows. Pick columns + rows, rename headers, save as a reusable template, AI-assist with healthcare-standard names.

Part of the **Zeus** suite running on the **MedCloud** platform.

## Stack

- Next.js 14 (App Router)
- React 18
- SheetJS (xlsx) for spreadsheet parsing
- lucide-react icons
- Anthropic API (server-side) for column rename suggestions
- `localStorage` for template persistence (will move to Supabase in v4)

## Local development

```bash
npm install
cp .env.example .env.local
# add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add `ANTHROPIC_API_KEY` in Project Settings → Environment Variables
4. Deploy

## Features

**v3 (current)**
- Upload Excel/CSV, preview as spreadsheet grid
- Tick columns AND rows to keep
- Rename column headers inline
- Column profiling: data type, % empty, unique count
- Row filter rules (10 operators, AND-combined)
- Save / load / auto-detect templates by column signature
- Two-step Pick → Preview flow with column reorder
- AI rename via Claude Sonnet 4.5
- Before/after summary
- Download cleaned `.xlsx`

**Roadmap (v4+)**
- Supabase persistence (multi-user templates, audit log, RBAC)
- Combine / split / format-transform column actions
- Validation rules (NPI Luhn, regex, required) + review queue
- Template versioning + approval workflow
- Client-level template scoping
- API endpoint for RPA / orchestrator integration
- PDF-to-Excel and Image-to-Excel converters as sibling routes

## License

Proprietary — Cosentus.
