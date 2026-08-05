# Architecture

`github-dev-tools` is a Vite-built GitHub Pages application implemented with native Web Components. Its high-level organization mirrors the `profile` project: a root entry point, application orchestration, reusable core foundations, and feature-owned product code.

## Runtime boot path

1. `index.html` loads the single browser entry point at `src/main.ts`.
2. `src/main.ts` calls `startApp()` from `src/app/App.ts`.
3. `src/app/App.ts` applies localized document metadata, renders the startup state, initializes Material Web, and mounts `<github-tools-app>` into `#app`.
4. `src/core/material/MaterialElements.ts` is the only production file that imports Material Web element definitions.
5. `src/features/github-tools/presentation/GitHubToolsApp.ts` owns top-level navigation, the drawer, shared layout, favorites wiring, leaderboard paging and filtering, and tool switching.
6. Tool actions call shared GitHub services and tool-specific domain helpers, then render results into the localized app-shell template.

Do not add another application entry point or duplicate startup orchestration under a feature package.

## GitHub Tools routing

GitHub Tools uses hash-based routing for top-level views. The public deep-link routes are:

- `#home`
- `#repo-mapper`
- `#release-stats`
- `#git-patch`
- `#favorites`
- `#leaderboard`

The hash is the source of truth for refresh restoration, direct deep links, and browser back/forward navigation. GitHub Pages works without a `404.html` fallback because URL fragments are handled entirely by the browser.

## Source layers

### `src/main.ts`

The root browser entry point contains only bootstrapping. This matches the placement used by the `profile` project and keeps `src/app` focused on application behavior.

### `src/app`

- `App.ts` owns startup, localized document metadata, loading/error boot states, and application mounting.
- `DataServices.ts` is the composition root for GitHub access, favorites, leaderboard access, and promoted apps.

### `src/core`

Core contains reusable foundations that are active across the application:

- `components/` contains app-wide visual components.
- `localization/` imports locale resources and provides template resolution, interpolation, plural, number, date, and ordinal formatting.
- `material/` contains the bundled Material Web registration boundary.
- `types/` contains project-level TypeScript declarations.
- `webcomponents/` contains the reusable custom-element base class.

Disconnected observable/global-state scaffolding and unused automatic component loading are intentionally not retained.

### `src/features/github-tools`

- `presentation/GitHubToolsApp.ts`, `.html`, and `.scss` define the shell and coordinator.
- `core/models/` contains shared GitHub models.
- `core/services/` contains GitHub parsing and API-client logic shared by multiple tools.
- `tools/repo-mapper/domain/` contains repository-tree models and map formatting.
- `tools/release-stats/domain/` contains release statistics models.
- `tools/git-patch/domain/` contains the patch model.
- `tools/leaderboard/` contains remote ranking access, country location, ranking search, and presentation logic.

The shell currently coordinates several tools in one component. Future UI refactors may move tool rendering into smaller panels without duplicating GitHub clients, locale access, routing, or Material registration.

Only implemented layers belong in the repository. Empty placeholder directories should not be committed.

### Other features

- `src/features/app-showcase/` owns the promoted applications section shown on Home.
- `src/features/favorites/` owns favorite repository persistence and generated favorites UI.

## Localization architecture

English is the active and canonical locale under `src/locales/en/`. `src/core/localization/Localization.ts` is the only module that imports locale JSON. It exposes the active locale, immutable resources, interpolation and formatting helpers, and safe template substitution.

User-facing text, accessibility labels, loading and error states, generated UI copy, and application metadata belong in locale resources. Technical identifiers such as Material icon names, route IDs, URLs, API payload values, and country slugs are not translated.

The browser requires static fallback metadata in `index.html` and `public/manifest.webmanifest`. `common.app` remains canonical, and locale validation requires those copies to match.

See [`localization.md`](localization.md) for the complete resource ownership, coding, translation, and review workflow.

## Verification

`scripts/validate-locales.mjs` validates locale completeness, interpolation placeholders, template tokens, hardcoded user-facing copy, the locale-import boundary, and browser metadata synchronization.

`npm run check` runs locale validation, the production build, and all tests. CI executes that command for pull requests and pushes to `master`.

## Product flows

- **Repo Mapper** accepts a GitHub repository URL, an optional token, and an output format, then renders an ASCII tree or flat path list.
- **Release Stats** accepts a repository URL and renders total downloads, per-release totals, and asset-level counts.
- **Git Patch** accepts a commit URL and returns patch text for copying or download.
- **GitHub Leaderboard** starts with the global ranking, supports country chips, optional location lookup, username search, and paginated results.
- **Favorites** are shared by Repo Mapper and Release Stats, stored locally, and shown on Home and the Favorites view.

## Custom-element registration rules

Custom elements are global to the page. A tag name can only be registered once, and the same constructor cannot be reused for multiple tag names. Material registrations belong in `src/core/material/MaterialElements.ts` and remain bundled npm imports.
