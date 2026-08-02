# Architecture

`github-dev-tools` is a Vite-built GitHub Pages application implemented with native Web Components. The app follows a layered, feature-first structure so UI code, GitHub API access, domain formatting rules, localization, and reusable infrastructure remain separated.

## Runtime boot path

1. `index.html` loads the single browser entry point at `src/app/main.ts`.
2. `src/app/main.ts` calls `startApp()` from `src/app/App.ts`.
3. `src/app/App.ts` applies localized document metadata, renders the startup state, initializes Material Web and shared services, and mounts `<github-tools-app>` into `#app`.
4. `src/core/material/MaterialElements.ts` is the only production file that imports Material Web element definitions. Importing that module registers the `md-*` custom elements through the Vite bundle.
5. `src/features/github-tools/presentation/GitHubToolsApp.ts` owns top-level navigation, the drawer, shared layout, favorites wiring, leaderboard paging and filtering, and tool switching.
6. Tool actions call shared GitHub services and tool-specific domain helpers, then render results back into the localized app-shell template.

Do not add another application entry point or duplicate startup orchestration under a feature package.

## GitHub Tools routing

GitHub Tools uses hash-based routing for top-level views. The public deep-link routes are:

- `#home`
- `#repo-mapper`
- `#release-stats`
- `#git-patch`
- `#favorites`
- `#leaderboard`

These route names are public URL API and should remain readable rather than exposing internal view IDs such as `mapper`, `releases`, or `gitpatch`.

The hash is the source of truth for refresh restoration, direct deep links, and browser back/forward navigation. GitHub Pages works without a `404.html` fallback because URL fragments are handled entirely by the browser and are not sent to the static host. Do not replace this with path-based routing unless deployment gains SPA fallbacks or rewrites.

## Source layers

### `src/app`

- `main.ts` is the browser entry point.
- `App.ts` owns startup, localized document metadata, loading/error boot states, and application mounting.
- `DataServices.ts` wires data adapters and use cases for GitHub access, favorites, leaderboard access, and promoted apps.

### `src/core`

Core code provides reusable app-wide foundations that are not specific to one feature:

- `components/` contains app-wide visual components.
- `events/` contains observable and event utilities.
- `localization/` imports locale resources and provides template resolution, interpolation, plural, number, date, and ordinal formatting.
- `material/` contains the bundled Material Web registration boundary.
- `state/` contains global state, state wrappers, and base model helpers.
- `typings/` contains project-level TypeScript declarations.
- `webcomponents/` contains reusable native custom-element helpers.

### `src/features/github-tools`

The GitHub Tools feature group contains the app shell, shared GitHub logic, and current tool domains.

- `presentation/GitHubToolsApp.ts`, `.html`, and `.scss` define the shell and coordinator.
- `core/models/` contains shared GitHub models such as repository and commit references.
- `core/services/` contains GitHub parsing and API-client logic shared by multiple tools.
- `core/components/` is reserved for shared GitHub Tools UI components.
- `tools/repo-mapper/` contains repository-tree models and map formatting.
- `tools/release-stats/` contains release statistics models.
- `tools/git-patch/` contains patch models.
- `tools/leaderboard/` contains remote ranking access, country location, ranking search, and presentation logic.

The current shell intentionally coordinates several tools in one component. Future UI refactors may move tool rendering into smaller panels without duplicating GitHub clients, locale access, routing, or Material registration.

### Other features

- `src/features/app-showcase/` owns the promoted applications section shown on Home.
- `src/features/favorites/` owns favorite repository persistence and generated favorites UI.

## Localization architecture

English is the active and canonical locale:

```text
src/locales/
├── README.md
└── en/
    ├── common.json
    ├── github-tools.json
    ├── favorites.json
    └── leaderboard.json
```

`src/core/localization/Localization.ts` is the only module that imports locale JSON. It exposes the active locale, immutable resources, `{variable}` interpolation, English plural and ordinal formatting, localized dates and numbers, and safe `{{namespace.key}}` substitution for raw HTML templates.

User-facing text, accessibility labels, loading and error states, generated UI copy, and application metadata belong in locale resources. Material icon names, route IDs, repository and release data, URLs, API payload values, country slugs, and other technical identifiers are not translated.

The browser requires static fallback metadata in `index.html` and `public/manifest.webmanifest`. `common.app` remains canonical, and locale validation requires those copies to match.

Every future locale must reproduce the same namespace files, keys, and interpolation placeholders before runtime language switching exposes it. The current `formatEnglishPlural()` helper must be generalized before enabling languages with plural categories beyond `one` and `other`.

See [`localization.md`](localization.md) for the complete resource ownership, coding, translation, and review workflow.

## Localization validation

`scripts/validate-locales.mjs` checks:

- Required locale directories and namespace files
- English key parity across every locale
- Non-empty string leaves
- Matching interpolation placeholders
- Resolvable HTML template tokens
- Hardcoded visible HTML and accessibility copy
- Common hardcoded TypeScript UI sinks
- The single locale-import boundary
- Synchronization of HTML and manifest metadata with `common.app`

`npm run check` runs locale validation, the production build, and all tests. CI executes that command for pull requests and pushes to `master`. The Pages workflow validates locale resources again before building the deployment artifact.

## Product flows

- **Repo Mapper** accepts a GitHub repository URL, an optional token, and an output format, then renders an ASCII tree or flat path list.
- **Release Stats** accepts a repository URL and renders total downloads, per-release totals, and asset-level counts.
- **Git Patch** accepts a commit URL and returns patch text for copying or download.
- **GitHub Leaderboard** starts with the global ranking, supports country chips, optional location lookup, top-bar username search, and paginated results.
- **Favorites** are shared by Repo Mapper and Release Stats, stored locally, and shown on Home and the Favorites view.

## Custom-element registration rules

Custom elements are global to the page. A tag name can only be registered once, and the same constructor cannot be reused for multiple tag names. Project code must not define fake `md-*` elements as a production fallback or load a second Material Web element graph from a runtime CDN. Material registrations belong in `src/core/material/MaterialElements.ts` and should remain bundled npm imports.
