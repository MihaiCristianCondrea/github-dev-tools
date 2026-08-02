# GitHub Dev Tools

GitHub Dev Tools is a browser-native TypeScript application for inspecting public GitHub repositories. It is built with Vite, native Web Components, and Material Web.

Live site: `https://mihaicristiancondrea.github.io/github-dev-tools/`

## Tools

- **Repo Mapper** generates an ASCII directory tree or newline-delimited path list.
- **Release Stats** shows total release downloads and per-asset performance.
- **Git Patch** fetches a raw `.patch` file from a GitHub commit URL for use with `git apply`.
- **GitHub Leaderboard** provides global and country rankings, username search, and paginated results sourced from committers.top.

Favorites are shared by Repo Mapper and Release Stats and are stored in the browser. GitHub access tokens are optional, remain client-side, and are used only for the current GitHub API request.

## Technology

- TypeScript
- Vite
- Native Web Components and Shadow DOM
- Material Web from `@material/web`
- GitHub REST API
- GitHub Pages
- Node's built-in test runner

## Project structure

```text
src/
├── app/
│   ├── main.ts                     # Browser entry point
│   ├── App.ts                      # Startup and application mounting
│   └── DataServices.ts             # Data adapter and use-case wiring
├── core/
│   ├── components/                 # App-wide visual components
│   ├── events/                     # Reusable event primitives
│   ├── localization/               # Locale loading and formatting boundary
│   ├── material/                   # Central Material Web registration
│   ├── state/                      # Shared state infrastructure
│   ├── typings/                    # Project-level declarations
│   └── webcomponents/              # Base custom-element helpers
├── features/
│   ├── app-showcase/               # Promoted Android applications
│   ├── favorites/                  # Favorite repository persistence and UI
│   └── github-tools/
│       ├── core/                   # Shared GitHub models and services
│       ├── presentation/           # Main shell and navigation
│       └── tools/                  # Mapper, releases, patch, and leaderboard domains
└── locales/
    ├── README.md
    └── en/
        ├── common.json
        ├── github-tools.json
        ├── favorites.json
        └── leaderboard.json
```

See [`docs/architecture.md`](docs/architecture.md) for runtime flow, routing, source-layer responsibilities, and integration boundaries.

## Setup

Node.js 22 is used by CI and is recommended locally.

```bash
npm install
```

## Commands

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run validate:locales
```

Validates locale directories, namespace files, key parity, placeholders, template tokens, user-facing source copy, and browser metadata synchronization.

```bash
npm run build
```

Runs strict TypeScript compilation and creates the production Vite bundle.

```bash
npm test
```

Runs the unit and localization tests with Node's built-in test runner.

```bash
npm run check
```

Runs locale validation, the production build, and all tests. This is the main pre-pull-request command.

```bash
npm run preview
```

Serves the generated production bundle locally.

## Localization

English is currently the active and canonical locale. All readable or screen-reader-exposed application copy belongs under `src/locales/en/` and is accessed through `src/core/localization/Localization.ts`.

Every future language must reproduce the same four namespace files and JSON keys. Locale validation checks missing files, missing or unknown keys, empty values, interpolation placeholders, unresolved template tokens, common hardcoded UI sinks, and metadata drift.

Adding a locale directory does not activate language switching by itself. See [`docs/localization.md`](docs/localization.md) for namespace ownership, coding examples, translation rules, validation behavior, and the complete language-addition workflow.

## CI and deployment

Pull requests and pushes to `master` run `npm run check`. The GitHub Pages workflow validates locale resources again before building and deploying `dist/`.

The Vite base path is `/github-dev-tools/`, matching the GitHub Pages project site.

## Security and data handling

- Public GitHub requests can be rate-limited.
- Optional access tokens are trimmed and sent as bearer credentials only to GitHub API requests.
- Authenticated responses are not retained in the shared in-memory response cache.
- Favorites remain in the browser through `localStorage`.
- The `references/` directory is research-only and is never imported into production code.
