# CLAUDE.md — @sudobility/heavymath_ui

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `scripts/push_all.sh` **only when the
> user explicitly asks in that turn**. Approval for an earlier change does not carry
> forward, and finishing a task is not permission to commit it.
> **Stay on the current branch** — do not create feature branches for code changes.

## What this is

ESM-only shared **React UI library** for the Heavymath prediction-market apps
(`heavymath_app`, `wcprediction_app`). Ships compiled JS + `.d.ts` from `dist/`; the
public API is whatever `src/index.ts` re-exports. It is the UI layer — data comes from
the Heavymath indexer client/lib, on-chain calls from the contracts package.

See `README.md` for the full command list, consumer quick-start, and layout. This file
covers only what is non-obvious.

## Stack

- TypeScript (strict, `target ES2020`, `module ESNext`, `moduleResolution: bundler`)
- React 19 (peer range `>=18`), wagmi 2 + viem 2 for Web3
- `@tanstack/react-query` for data, i18next for all strings, Tailwind + `@sudobility/design`
- **Bun** is the package manager and runner — never npm/yarn/pnpm
- Vitest for tests, ESLint + Prettier

## Commands

```bash
bun run build        # tsc -p tsconfig.build.json  +  scripts/fix-esm-imports.mjs
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src   (lint:fix to autofix)
bun run test:unit    # vitest run   (NOTE: script is test:unit, not "test"; test:watch for watch)
bun run format       # prettier write (format:check to verify)
bun run verify       # typecheck + lint + test:unit + format:check  — run before pushing
bun publish          # prepublishOnly auto-runs clean + build
```

## Install gotcha — GitHub Packages

`.npmrc` maps the `@sudobility` scope to `https://npm.pkg.github.com`. `bun install`
cannot resolve the many `@sudobility/*` deps without a GitHub token (`read:packages`) in
`~/.npmrc`. CI uses the `GH_PACKAGES_READ_TOKEN` secret.

## Architecture / key conventions

- **Init before render.** Consumers MUST call `initHeavymathUI(config)` and
  `setContractAddresses(chainId, addrs)` before mounting components; config is read at
  runtime via `getAppConfig()` / `getContractAddress()`.
- **Provider + hook pattern.** `AuthProvider` (`context/WalletAuthContext`) exposes
  `useAuth` / `useWalletAuth` (address, isConnected, isDealer, dealerTokenIds).
  `IndexerProvider` (`context/IndexerContext`) exposes `useIndexer()` → `{ indexerClient }`.
- **Hook layering.** `hooks/useMarketContract.ts` has the base contract hooks (22, raw
  functionality). `hooks/useContractWithToast.ts` wraps 13 of them to add toast feedback
  (`use*WithToast`). Prefer the base hook unless you want the built-in UX feedback.
- **`EVMPredictionClient`** (`lib/evmClient.ts`) wraps viem contract calls and is a
  singleton cached per `chainId`.
- **Staggered cache invalidation.** `invalidateWithRetry` in `useMarketContract.ts`
  re-invalidates React Query keys at `[0, 5s, 12s, 20s, 30s]` because the on-chain tx
  confirms before the indexer picks up the event — a single refetch returns stale data.
  Keep this pattern for any new write hook.

## Code conventions

- **ESM output fix is mandatory.** `tsc` (bundler resolution) emits extensionless
  relative imports that break Node's ESM loader; `scripts/fix-esm-imports.mjs` rewrites
  them to `.js` paths after build. Never bypass `bun run build` with a bare `tsc`.
- **i18n:** every user-visible string goes through i18next `useTranslation()`. Do not
  hardcode. (`HeavymathUiTextProvider` supplies a text map for some components.)
- **Enums as `const` objects**, not the TS `enum` keyword:
  `const MarketStatus = { OPEN: 'open', ... } as const`.
- **Styling:** Tailwind with `@sudobility/design` tokens; match existing class patterns.
- Tests live in `src/**/__tests__/`; `.test.ts(x)` files are excluded from the build.

## Dependencies

~20 **peer** deps (React, wagmi/viem, react-query, react-router-dom, i18next, recharts,
heroicons, react-icons, and the `@sudobility/*` stack) — provided by the consuming app.
Direct runtime deps are only `dompurify`, `marked`, `react-markdown`, `rehype-sanitize`
(markdown rendering/sanitization in discussion & writings).

## Ecosystem

```
heavymath_contracts → heavymath_indexer → heavymath_indexer_client
→ heavymath_lib → heavymath_ui (here) → heavymath_app / wcprediction_app
```
