# Repository Guidelines

## Project Structure & Module Organization
- Root: `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`.
- Source: `src/` (TypeScript + React). Entry is `src/main.tsx`, app shell in `src/App.tsx`, UI helpers in files like `src/toast.tsx`.
- Assets: colocate small assets in `src/` or import via URL. No `public/` directory by default.
- Tests: no test suite committed yet; see Testing Guidelines to add one.

## Build, Test, and Development Commands
- `npm ci`: install exact locked dependencies (`package-lock.json`).
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: type-check (`tsc -b`) and build production bundle (`vite build`).
- `npm run preview`: serve the production build locally.

## Coding Style & Naming Conventions
- Language: TypeScript (strict), React JSX (`react-jsx`), ES modules.
- Indentation: 2 spaces; keep lines focused and small functions.
- Naming: 
  - Components: `PascalCase` files (e.g., `SwapPanel.tsx`).
  - Hooks: `useX.ts(x)` (e.g., `useWallet.ts`).
  - Utilities/types: `camelCase.ts`, types in `*.d.ts` or colocated.
- Imports: third‑party first, then absolute/base-url, then relative. Prefer named exports.
- Formatting/Linting: no linter configured; keep consistent style. If adding tooling, prefer ESLint + Prettier with TypeScript and React presets.

## Testing Guidelines
- Framework: recommend `vitest` + `@testing-library/react` if adding tests.
- Location: colocate as `*.test.ts(x)` next to source or under `src/__tests__/`.
- Coverage: target critical paths (routing, SDK integrations, toasts). Add CI coverage later.
- Run (after adding vitest): `npx vitest` or `npm test` (wire a script).

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits seen in history: `feat:`, `fix:`, `chore:`, `feat(ui):` with concise scope and imperative subject.
- PRs: include summary, motivation, screenshots/GIFs for UI changes, reproduction steps, and linked issues. Note any SDK/version changes and breaking impacts.
- Size: prefer small, focused PRs; keep code and description aligned.

## Security & Configuration Tips
- Env vars: use `VITE_` prefix (e.g., `VITE_RPC_URL`) and keep secrets out of git (`.env.local`).
- Sui/SDKs: validate network selection and avoid hardcoding private keys. Guard async calls and handle failures with clear toasts.

