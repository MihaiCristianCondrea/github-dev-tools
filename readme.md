# GitHub Dev Tools

GitHub Dev Tools is a browser-native TypeScript Web Components app for working with GitHub repositories. It provides three focused utilities:

- **RepoMapper**: generate an ASCII directory tree or a newline-delimited path list for a public GitHub repository.
- **Release Stats**: inspect release download totals and per-asset download performance.
- **Git Patch**: fetch a raw `.patch` file from a GitHub commit URL for use with `git apply`.

The app runs entirely in the browser and uses the GitHub REST API directly. Personal access tokens are optional and are only used client-side to increase GitHub API rate limits for the current request.

## Architecture

The project follows a clean data / domain / presentation split:

```text
src/
├── components/              # Presentation layer: Web Components, HTML, and CSS
│   └── RepoMapperApp/
├── data/                    # Data layer: GitHub API client and browser storage adapters
├── domain/                  # Domain layer: app models and pure business services
│   ├── models/
│   └── services/
├── lib/                     # Generic Web Component, event, data, and state primitives
└── main.ts                  # Application bootstrap
```

### Layer responsibilities

- **Domain (`src/domain`)** contains the app's stable business concepts, such as repositories, release stats, repository trees, patch files, URL parsing, and map building.
- **Data (`src/data`)** adapts external systems into domain models. Today this includes the GitHub REST API and `localStorage` favorites.
- **Presentation (`src/components`)** renders the UI and coordinates user interactions. Components should call data/domain services instead of embedding API response mapping or tree-building logic directly.
- **Library (`src/lib`)** contains reusable Web Component infrastructure that is not specific to GitHub Dev Tools.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Then open the Vite dev-server URL printed in the terminal.

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Notes

- Public GitHub API requests can be rate-limited. Use the optional token fields in the app if you need higher limits.
- Favorites are stored locally in your browser using `localStorage`.
