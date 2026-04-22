# Zeus by Cosentus — File Converter

Intelligent file conversion for healthcare RCM. Turn messy exports from any EHR into the format your billing team needs. Build a template once, run it 10,000 times.

## Routes

| Path | Status | What it does |
|------|--------|--------------|
| `/` | ✅ Live | Landing page — hero animation, value props, CTA |
| `/excel-to-excel` | ✅ Live | The full converter (column + row selection, templates, AI rename) |
| `/excel-to-pdf` | 🔜 Soon | Excel → PDF report generator |
| `/pdf-to-excel` | 🔜 Soon | OCR-driven PDF → structured spreadsheet |
| `/image-to-excel` | 🔜 Soon | OCR-driven image → spreadsheet |

## Stack

- Next.js 14 App Router · React 18
- SheetJS for Excel parsing (browser-side)
- Anthropic Claude Sonnet 4.5 (server-proxied) for column rename suggestions
- lucide-react icons
- `localStorage` for template persistence (Supabase migration planned)

## Local development

```bash
npm install
cp .env.example .env.local       # add your ANTHROPIC_API_KEY
npm run dev
```

App runs at http://localhost:3000.

## Deploy

Hosted on Vercel. Push to `main` triggers a deploy. Required env var:

- `ANTHROPIC_API_KEY` — set in Vercel → Project Settings → Environment Variables

## Project structure

```
app/
├── layout.jsx                    Root layout, fonts, metadata
├── globals.css                   Brand variables, animations, reset
├── page.jsx                      Landing page (/)
├── excel-to-excel/page.jsx       Converter (/excel-to-excel)
└── api/suggest-names/route.js    Server proxy → Anthropic API
components/
├── Header.jsx                    Top nav with tabs + Cosentus logo
├── Footer.jsx                    Cosentus division attribution
├── AppShell.jsx                  Header + main + footer wrapper
├── HeroAnimation.jsx             Animated SVG: messy → Zeus → clean
└── ExcelConverter.jsx            The full converter component
public/
├── cosentus-logo.png             Horizontal lockup (header)
├── cosentus-mark.png             Lion mark (small spaces)
└── favicon.png                   Browser tab icon
```

## Brand

Primary cyan `#00B5D6` is the only chromatic accent. Everything else stays grayscale to keep healthcare-sober tone. Cosentus logo always sits top-right.

## License

Proprietary — Cosentus.
