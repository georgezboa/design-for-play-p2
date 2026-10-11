# NIGHTFALL 汉化 (Chinese patch, 2026-10-11)

Screens and subtitles in Simplified Chinese; voices stay English.
SETTINGS · 中文 switches it (a computer whose first language is Chinese
starts in Chinese). The game's code, voice lookups and saves stay English:
`src/shared/i18n/install.js` (injected first on every page by
`vite.config.js`) translates only where text reaches the screen.

Adding or changing English text:

1. `npm i --no-save acorn@8 acorn-walk@8 && node scripts/i18n/extract.mjs`
   rewrites `strings.json`.
2. Put the Chinese for any new string in `zh/<chunk>.json` (or `zh/extra.json`),
   following `GLOSSARY.md`; `node scripts/i18n/check_chunk.mjs <chunk>` checks
   placeholders, tags and separators.
3. `node scripts/i18n/build.mjs` regenerates `src/shared/i18n/zh.generated.js`.

`tests/i18n/chinese.test.mjs` fails when a string in `strings.json` has no
Chinese or the generated table is out of date.

Not translated: words painted into George's artwork (Chapter 1's station
boards) and Chapter 3's burning ground letters, which are spelled out in
fire one glyph at a time; their subtitles are translated.
