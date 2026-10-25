# AED → INR Companion — agent notes

Chrome MV3 extension: shows INR estimates next to AED amounts on any page.

## Commands
```bash
node --test
```
Load unpacked from this folder in `chrome://extensions`.

## Layout
`content.js` / `converter.js` / `background.js` / popup files / `test/` / `manifest.json`.

## Conventions
Conventional commits. Keep rate fetch in background; pure conversion tested in `test/`. No env vars (n/a).

## Do / don't
Do run `node --test` before commit. Don't hardcode a stale rate as the only source without documenting override.
