# Architecture

`github-dev-tools` is a Vite-built GitHub Pages application implemented as native web components. The app follows a layered structure so UI code, GitHub API access, domain formatting rules, and reusable infrastructure stay separated.

## Runtime boot path

1. `src/main.ts` starts the app through `src/app/App.ts`.
2. `src/app/App.ts` imports the GitHub Tools app shell, imports bundled Material Web registrations, renders a loading state, initializes shared data/state services, and mounts `<github-tools-app>` into `#app`.
3. `src/core/material/MaterialElements.ts` is the only project file that imports Material Web element definitions. Importing that module registers the `md-*` custom elements through the Vite bundle.
4. `src/features/github-tools/presentation/GitHubToolsApp.ts` owns top-level navigation, the drawer, shared layout, favorites wiring, and tool switching.
5. Tool actions call GitHub Tools core services plus tool-specific domain helpers, then render results back into the app shell template.

## Source layers

### `src/core`

Core code provides reusable app-wide foundations that are not specific to GitHub tools:

- `events/` contains observable/event utilities.
- `material/` contains the bundled Material Web registration boundary.
- `state/` contains global state, state wrappers, and the base model helper.
- `typings/` contains project-level TypeScript declarations.
- `webcomponents/` contains reusable native custom-element helpers and loading utilities.

### `src/features/github-tools`

The GitHub Tools feature group contains the GitHub-focused app shell, shared GitHub logic, and the current tool domains.

- `presentation/GitHubToolsApp.ts`, `.html`, and `.css` define the shell/coordinator for navigation, drawer behavior, shared layout, and current tool views.
- `core/models/` contains shared GitHub models such as repository, commit, and favorite repository references.
- `core/services/` contains shared GitHub parsing and API-client logic used by multiple tools.
- `core/components/` is reserved for shared GitHub Tools UI components when views are split out of the app shell.
- `tools/repo-mapper/` contains Repo Mapper-specific domain code, including repository-tree models and map formatting.
- `tools/release-stats/` contains Release Stats-specific domain models.
- `tools/git-patch/` contains Git Patch-specific domain models.

This first-pass structure intentionally keeps the existing app behavior centralized in `GitHubToolsApp` while moving obvious shared and tool-specific files to their future homes. Future UI refactors should move feature-specific rendering into smaller panels such as `MapperPanel`, `ReleaseStatsPanel`, `PatchPanel`, and `FavoritesPanel` without turning the feature group into a mini-framework.

### Other features

- `src/features/app-showcase/` owns the promoted apps section shown on the home view.
- `src/features/favorites/` remains a cross-feature persistence package. It currently stores GitHub repository favorites in `localStorage` and imports shared repository types from `src/features/github-tools/core/models/Repository.ts`.

### `src/app`

`src/app/DataServices.ts` wires the data adapters and use cases used by the app shell. It is the integration point for the GitHub API client, favorites persistence, and promoted apps.

## Product flows

The UI exposes three primary tools:

- **Repo Mapper** accepts a GitHub repository URL, an optional token, and an output format, then renders either an ASCII directory tree or a flat path list.
- **Release Stats** accepts a GitHub repository URL and renders total downloads, per-release totals, and asset-level download counts.
- **Git Patch** accepts a GitHub commit URL and returns the commit patch text for download or copying.

Favorites are shared across Repo Mapper and Release Stats, saved locally, and shown both on the Favorites page and as home-screen shortcuts.

## Custom-element registration rules

Custom elements are global to the page. A tag name can only be registered once, and the same constructor cannot be reused for multiple tag names. For that reason, project code must not define fake `md-*` elements as a production fallback and must not load the same Material Web element graph from multiple runtime CDNs. Material registrations belong in `src/core/material/MaterialElements.ts` and should stay as bundled imports.
