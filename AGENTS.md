# Working in PictureToDots

Read `docs/HANDOFF.md` first. Then read only the focused document needed:

- `docs/ARCHITECTURE.md`: processing, coordinates, state and privacy contracts.
- `docs/TESTING.md`: commands, fixtures and verification limits.
- `docs/DECISIONS.md`: why key choices were made; do not rediscover them.
- `README.md`: user setup, feature inventory, limitations and Pages deployment.

## Non-negotiable product constraints

- Static React/TypeScript/Vite app for GitHub Pages. No server inference, paid APIs, accounts or API keys.
- Photos stay local. Keep original upload bytes; crop/rotate/importance edits are reversible metadata.
- Marker colors must come from the enabled physical/custom palette. Bundled swatches are explicitly unverified demonstrations, not official Ohuhu codes.
- Difficulty and conversion priority must not silently change grid resolution or physical marker limits.
- Subject detection is probabilistic. Never fabricate facial landmarks, claim a guaranteed likeness, or label saliency as semantic segmentation.
- Do not deploy publicly or configure a Git remote without an actual target. The supplied reference HEIC files remain private/ignored.

## Efficient workflow

- Use `rg` to find symbols; read narrow file ranges instead of dumping the large `src/main.tsx`.
- Reuse existing modules and tools. Do not re-download model assets that exist in `public/vision/`.
- Keep changes focused. Run relevant unit tests, then build and affected browser tests. Full browser suite is appropriate before handoff.
- Preserve user edits, imported projects and unrelated files. Avoid broad rewrites just for style.
- Update HANDOFF with completed work, exact checks/results and remaining issues. Keep it concise; link details rather than repeat logs.
- Source is formatted with Prettier (`npm run format`). No lint requirement.

## Fast commands

`npm run dev` · `npm test` · `npm run build` · `npm run test:e2e`
Build before the full browser suite: production tests serve `dist/` at a repository subpath. Development defaults to 127.0.0.1:5173.
