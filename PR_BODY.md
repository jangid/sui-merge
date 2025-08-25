Add Contributor Guide (AGENTS.md) and Testing Suite with Coverage

Summary
- Introduces a concise contributor guide.
- Sets up Vitest + RTL with jsdom, stable single-thread config, and coverage.
- Adds unit and component tests for core flows; raises App coverage.

Changes
- Docs: added `AGENTS.md` with structure, commands, style, PR guidelines, and security tips.
- Config: updated `vite.config.ts` (test env, coverage), `tsconfig.json` (vitest types), and `package.json` scripts (`test`, `test:run`, `test:watch`, `coverage`).
- Refactor: extracted pure helpers to `src/lib/utils.ts` and imported where used.
- Tests:
  - `src/App.test.tsx`: pure helpers (formatUnits, URLs, grouping).
  - `src/App.render.test.tsx`: app render smoke (header/nav, tab switch).
  - `src/App.behavior.test.tsx`: merge view grouping, claim staging, basic a11y cues.
  - `src/App.more.test.tsx`: unauthenticated InfoBoxes, hash routing, network switch, split/transfer, best-quote validation; stabilized claim/swap interactions; mocked toast to avoid act warnings.
  - `src/main.test.tsx`: bootstrap test for `createRoot` and render.
- Stability: mocked CSS import globally and toast provider in tests to avoid act warnings.

How To Test
- Install: `npm ci`
- Dev server: `npm run dev`
- Tests (watch): `npm run test:watch`
- Headless: `npm run test:run`
- Coverage: `npm run coverage`

Coverage
- Overall: 80.26% lines
- `App.tsx`: 72.27% lines, 62.22% branches, 72.6% functions
- `main.tsx`: 100% across metrics

Notes/Risks
- New tests rely on SDK and provider mocks; no network or wallet required.
- Kept app logic unchanged except extracting pure helpers.
- A few deeper swap branches are exercised via deterministic counters rather than toasts to avoid flakiness.

Next Steps (Optional)
- Enforce coverage thresholds in `vite.config.ts` (e.g., 70%+ for `src`).
- Extract adapter functions for 7k/Cetus flows to unit-test success/error branches and raise coverage further.

Checklist
- [x] All tests pass locally (`npm run coverage`)
- [x] No act warnings or test flakiness
- [x] Guide reflects current scripts and structure
- [x] No breaking changes to runtime behavior
