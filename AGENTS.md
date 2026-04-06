# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript application. Main app code lives in `src/`, with route entry points in `src/pages`, feature areas in `src/modules`, shared UI in `src/shared/components`, React context providers in `src/app/context`, hooks in `src/hooks`, and API/data helpers in `src/services` and `src/shared/utils`. Static files belong in `public/`; imported branding assets live in `src/assets`. Keep new code inside the closest feature folder before expanding shared layers.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local Vite server on port `3000`.
- `npm run build`: create the production bundle in `dist/`.
- `npm run preview`: serve the built app locally for a production-like check.
- `npm run lint`: run `tsc --noEmit` for type-checking.
- `node test-profiles.js`: manual Supabase profile smoke test; requires valid env vars.

## Coding Style & Naming Conventions
Use TypeScript and functional React components. Follow the existing style: 2-space indentation, semicolons, single quotes, and trailing commas where the formatter leaves them. Name components and pages in `PascalCase` (`WorkspaceLayout.tsx`), hooks as `useX.ts`, services as `*.service.ts` or `*Service.ts` based on the local pattern, and keep small reusable UI primitives under `src/shared/components`. Prefer the `@` alias only where it improves readability; otherwise keep relative imports consistent with nearby files.

## Testing Guidelines
There is no formal test runner configured in `package.json` yet. Until Vitest or another framework is added, treat `npm run lint`, `npm run build`, and focused manual flows in `npm run dev` as the minimum verification set. When adding tests, place them beside the feature or under a local `__tests__` folder and name them `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so use clear, imperative commit messages such as `feat: add approval token guard` or `fix: handle missing profile data`. Keep commits scoped to one change. PRs should include a short summary, linked issue or task, verification steps, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips
Copy `.env.example` for local setup and provide `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Never commit secrets. Preserve the SPA rewrite in `vercel.json`, and avoid changing Vite HMR behavior unless you understand the AI Studio note in `vite.config.ts`.
