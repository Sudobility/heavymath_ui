# @sudobility/heavymath_ui

Shared UI component library for **Heavymath** prediction-market apps. It provides
React components, hooks, context providers, utilities, and configuration for wallet
authentication, prediction markets, dealer management, sports data display, and
discussion/writings features.

Consuming apps (e.g. `heavymath_app`, `wcprediction_app`) compose these pieces into
full pages. This package is the UI layer only — it depends on the Heavymath indexer
client and lib for data, and on the contracts package for on-chain interactions.

- **Package:** `@sudobility/heavymath_ui` (published to GitHub Packages)
- **License:** BUSL-1.1
- **Type:** ESM-only library (`"type": "module"`), ships compiled JS + `.d.ts` from `dist/`

## Requirements

- [Bun](https://bun.sh) (package manager and script runner — do **not** use npm/yarn/pnpm)
- Node.js (used by the build; Bun also works)
- Access to the **`@sudobility` GitHub Packages registry**. `.npmrc` points the
  `@sudobility` scope at `https://npm.pkg.github.com`, so you need a GitHub token with
  `read:packages` configured in your `~/.npmrc` before `bun install` can resolve the
  scoped dependencies.

## Install

```bash
bun install
```

### Using it in an app

```bash
bun add @sudobility/heavymath_ui
```

It is distributed with a large set of **peer dependencies** (React 18/19, wagmi, viem,
`@tanstack/react-query`, `react-router-dom`, i18next, recharts, `@heroicons/react`,
`react-icons`, and the `@sudobility/*` packages) — see `peerDependencies` in
`package.json`. The consuming app must provide them.

## Scripts

```bash
bun run build          # tsc (tsconfig.build.json) -> dist/, then fix ESM import paths
bun run build:watch    # build in watch mode
bun run clean          # remove dist/
bun run typecheck      # tsc --noEmit
bun run lint           # ESLint over src
bun run lint:fix       # ESLint --fix
bun run format         # Prettier write on src/**/*.{ts,tsx}
bun run format:check   # Prettier check
bun run test:unit      # Vitest (run once)
bun run test:watch     # Vitest watch mode
bun run verify         # typecheck + lint + test:unit + format:check
```

Run `bun run verify` before pushing — CI runs the equivalent checks.

### Build details

The build runs `tsc -p tsconfig.build.json` and then `scripts/fix-esm-imports.mjs`.
`tsc` emits with `moduleResolution: "bundler"`, which leaves extensionless relative
imports (`from './core'`) that Node's native ESM loader rejects. The post-build script
rewrites every relative import/export in the emitted `.js` and `.d.ts` files to a
fully-qualified path (`./core` -> `./core/index.js`, `../x` -> `../x.js`). Output
(`.js`, `.d.ts`, `.d.ts.map`) lands in `dist/`.

## Test

Unit tests use [Vitest](https://vitest.dev) and live in `src/**/__tests__/`
(currently `utils/__tests__/format.test.ts` and `sportsSeason.test.ts`).

```bash
bun run test:unit
```

## Publish

```bash
bun publish            # prepublishOnly runs clean + build automatically
```

Publishing also happens via CI (`.github/workflows/ci-cd.yml`) on push to `main`/`develop`,
targeting GitHub Packages.

## Project layout

```
src/
├── index.ts         # Public barrel export (the package's API surface)
├── components/      # React components: auth, dealer, discussion, icons, market,
│                    #   sports, ui, wallet, writings + HeavymathUiTextProvider
├── config/          # app init, chains, contract addresses, sport codes
├── context/         # WalletAuthContext (AuthProvider), IndexerContext (IndexerProvider)
├── hooks/           # Contract, toast-wrapped, dealer, market, sports-data hooks
├── lib/evmClient.ts # EVMPredictionClient (viem wrapper, cached per chainId)
├── types/           # auth, dealer, market types
└── utils/           # format, oracleId, marketId, conditionData, datetime,
                     #   marketDisplay, sportsSeason (+ __tests__)
```

The authoritative list of what the package exports is `src/index.ts`.

## Quick start (consumer)

Initialize the library once, before rendering any components, then wrap the app in the
providers:

```tsx
import {
  initHeavymathUI,
  setContractAddresses,
  AuthProvider,
  IndexerProvider,
} from '@sudobility/heavymath_ui';

initHeavymathUI({
  name: 'MyApp',
  indexerUrl: 'http://localhost:42079',
  defaultChainId: 11155111,
});

setContractAddresses(11155111, {
  predictionMarket: '0x...',
  dealerNFT: '0x...',
  oracleResolver: '0x...',
  usdc: '0x...',
});

function App() {
  return (
    <AuthProvider>
      <IndexerProvider>{/* useAuth(), useWalletAuth(), useIndexer() */}</IndexerProvider>
    </AuthProvider>
  );
}
```

All user-visible strings go through i18next (`useTranslation()`); do not hardcode them.

## Ecosystem

```
heavymath_contracts        (smart contracts, ABIs)
  └─ heavymath_indexer      (REST API, sports proxy)
      └─ heavymath_indexer_client  (IndexerClient, React Query hooks)
          └─ heavymath_lib          (sports + favorites merging)
              └─ heavymath_ui       ← this package (UI components, hooks, contexts)
                  └─ heavymath_app / wcprediction_app  (consuming apps)
```
