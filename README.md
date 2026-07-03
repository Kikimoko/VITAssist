# VITAssist

A Chrome extension for VIT students that auto-organises VTOP study materials and enables on-device AI-powered exam prep. Zero cost, zero setup, fully private.

---

## Quick start

```bash
npm install
npm run dev        # watch mode — rebuilds on every save
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

---

## Project structure

```
VITAssist/
├── public/
│   └── manifest.json              # Chrome extension manifest v3
├── popup.html                     # Popup entry point
├── sidepanel.html                 # Side panel entry point
├── vite.config.js                 # Build config — multiple entry points
├── package.json
└── src/
    ├── background/
    │   └── background.js          # Service worker — download hook, portal polling, message router
    ├── content/
    │   └── content.js             # Runs on VTOP portal — MutationObserver, inject button
    ├── popup/
    │   ├── popup.jsx              # Dashboard — subjects, stats, quick search
    │   └── popup.css
    ├── sidepanel/
    │   ├── sidepanel.jsx          # Side panel shell — tabs, subject selector
    │   ├── sidepanel.css
    │   └── tabs/
    │       ├── SearchTab.jsx      # RAG search — Fuse.js + LLM cascade
    │       ├── ReviseTab.jsx      # Revision checklist — per subject
    │       ├── NotesTab.jsx       # Slide-level sticky notes
    │       └── SummaryTab.jsx     # LLM exam bullet generator with cache
    └── shared/
        ├── courseCodeMap.js       # VIT course codes → subject names + filename parser
        ├── llm/
        │   └── llmCascade.js      # 3-tier LLM — Gemini Nano → WebLLM → Transformers.js
        ├── parser/
        │   └── pptxParser.js      # JSZip PPTX/DOCX parser + PDF.js PDF parser
        ├── search/
        │   └── searchEngine.js    # Fuse.js retrieval + RAG pipeline
        └── storage/
            └── storage.js         # All chrome.storage.local operations
```

---

## What each file does

| File | Responsibility |
|---|---|
| `background.js` | Intercepts downloads, renames files, routes messages, polls VTOP |
| `content.js` | MutationObserver on portal DOM, injects VITAssist button |
| `courseCodeMap.js` | Maps `BCSE318L` → `Network Security`, parses VIT filename format |
| `pptxParser.js` | Unzips PPTX, extracts slide titles and text using DOMParser |
| `llmCascade.js` | Detects best LLM tier, generates answers and summaries |
| `searchEngine.js` | Fuse.js fuzzy retrieval + LLM context injection (RAG pipeline) |
| `storage.js` | Single source of truth for all chrome.storage.local reads/writes |
| `popup.jsx` | Subject dashboard with exam countdown, progress bars, quick search |
| `sidepanel.jsx` | Main workspace shell — 4 tabs, subject filter |
| `SearchTab.jsx` | Query input → Fuse.js → LLM answer → file results with notes |
| `ReviseTab.jsx` | Per-subject checklist — auto-populated from indexed slides |
| `NotesTab.jsx` | Slide-keyed notes — add, edit, delete |
| `SummaryTab.jsx` | Per-file summary generation → 5 exam bullets → cached |

---

## Before you ship — checklist

- [ ] Add your full course code list to `src/shared/courseCodeMap.js`
- [ ] Add your Gemini Flash API key to `src/shared/llm/llmCascade.js` (line with `YOUR_GEMINI_FLASH_API_KEY_HERE`)
- [ ] Test PPTX parsing with 5 real VIT files — check slide extraction works
- [ ] Test the download hook on the actual VTOP portal
- [ ] Verify portal polling selector matches VTOP's actual DOM (inspect element on study material page)
- [ ] Add icons to `public/icons/` (icon16.png, icon32.png, icon48.png, icon128.png)
- [ ] Get 5+ students to beta test — collect before/after metrics

---

## Storage schema

All data in `chrome.storage.local` — never leaves the device.

```
vitassist_file_index    { [filename]: { subject, slides[], path, slideCount } }
vitassist_checklist     { [subject]: { topics: [{id, label, done}] } }
vitassist_notes         { [`${filename}::${slideNo}`]: { text, timestamp } }
vitassist_summaries     { [filename]: { bullets[], generatedAt, llmTier } }
vitassist_subjects      { [subject]: { examDate, color } }
vitassist_settings      { llmTier, notificationsEnabled, lastPortalCheck }
vitassist_portal_cache  { fileList[], lastChecked }
```

---

## LLM cascade — how it selects tiers

```
1. Check window.ai?.languageModel  →  Gemini Nano (Chrome 127+)
2. Check navigator.gpu              →  WebLLM / Phi-3 mini (WebGPU)
3. Fallback                         →  Transformers.js / TinyLlama (WASM)
4. All fail                         →  Fuse.js results only (no LLM)
```

Tier is detected once per session and cached. Student never sees the switching.

---

## Resume bullet (fill in metrics after launch)

> Built VITAssist, a Chrome extension adopted by __ VIT students that auto-organises VTOP study materials and enables natural language search using a three-tier on-device LLM cascade (Gemini Nano → WebLLM/Phi-3 → WASM/TinyLlama) with zero backend, zero cost, and zero student setup — implementing browser-native RAG, multimodal document intelligence, and privacy-by-design architecture.
