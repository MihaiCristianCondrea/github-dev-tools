# Architecture

`github-dev-tools` is a Vite-built GitHub Pages application implemented as native web components. The app follows a layered structure so UI code, GitHub API access, domain formatting rules, and reusable infrastructure stay separated.

## Runtime boot path

1. `src/main.ts` imports the app shell, imports bundled Material Web registrations, renders a loading state, initializes shared data/state services, and mounts `<repo-mapper-app>` into `#app`.
2. `src/presentation/material/MaterialElements.ts` is the only project file that imports Material Web element definitions. Importing that module registers the `md-*` custom elements through the Vite bundle.
3. `src/presentation/components/RepoMapperApp/RepoMapperApp.ts` owns top-level navigation and coordinates the visible tools.
4. Feature actions call domain services and data adapters, then render results back into component templates.

## Source layers

### `src/presentation`

Presentation code renders markup, subscribes to DOM events, and translates user intent into domain/data calls.

- `components/` contains app-facing UI components such as `RepoMapperApp` and `AppShowcaseSection`.
- `material/` contains the bundled Material Web registration boundary.
- `webcomponents/` contains reusable native custom-element helpers and loading utilities.

The top-level `RepoMapperApp` is currently the app shell for navigation, favorites, mapper output, release statistics, and patch extraction. Future UI refactors should move feature-specific rendering into smaller panels such as `MapperPanel`, `ReleaseStatsPanel`, `PatchPanel`, and `FavoritesPanel` while keeping `RepoMapperApp` as the navigation shell.

### `src/domain`

Domain code contains business rules and typed concepts that are independent of the browser DOM:

- `GitHubUrlParser` converts repository and commit URLs into typed references.
- `RepositoryMapBuilder` converts repository tree entries into ASCII trees or path lists and computes file/folder counts.
- Domain models describe repositories, release stats, patch files, and promoted app items.

### `src/data`

Data code talks to external systems or persistence APIs and is grouped by responsibility:

- `dto/` contains remote API response shapes.
- `mappers/` converts remote DTOs into domain models.
- `local/` persists favorites in `localStorage`.
- `remote/` calls GitHub API and raw patch endpoints.
- `repositories/` implements domain repository interfaces.
- `DataServices` wires the data adapters and use cases used by the app shell.

### `src/core`

Core code provides reusable non-presentation foundations:

- `events/` contains observable/event utilities.
- `state/` contains global state, state wrappers, and the base model helper.
- `typings/` contains project-level TypeScript declarations.

## Product flows

The UI exposes three primary tools:

- **Repo Mapper** accepts a GitHub repository URL, an optional token, and an output format, then renders either an ASCII directory tree or a flat path list.
- **Release Stats** accepts a GitHub repository URL and renders total downloads, per-release totals, and asset-level download counts.
- **Git Patch** accepts a GitHub commit URL and returns the commit patch text for download or copying.

Favorites are shared across Repo Mapper and Release Stats, saved locally, and shown both on the Favorites page and as home-screen shortcuts.

## Custom-element registration rules

Custom elements are global to the page. A tag name can only be registered once, and the same constructor cannot be reused for multiple tag names. For that reason, project code must not define fake `md-*` elements as a production fallback and must not load the same Material Web element graph from multiple runtime CDNs. Material registrations belong in `src/presentation/material/MaterialElements.ts` and should stay as bundled imports.
