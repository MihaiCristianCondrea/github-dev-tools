# Repository Instructions

## Application source

The production application source lives in `src/`. Runtime code must be implemented from project source and npm dependencies, not copied from reference snapshots.

## Reference-only Material Web source

The `references/` folder is preview/research only. It contains external open-source Material Web source code for comparison, documentation, and AI context.

Rules for `references/`:

- Do not edit files under `references/`.
- Do not import, bundle, or execute code from `references/`.
- Do not copy reference code blindly into application source.
- Use the folder only to inspect implementation patterns and component APIs.
- Consume Material Web components through npm imports from `@material/web`.

## Material Web imports

Keep Material Web custom element registration centralized in `src/core/material/MaterialElements.ts` unless there is a strong reason to add a separate import boundary.

## Material Web styling

Do not override Material Web component structure, sizing, shape, padding, borders, typography, cursor, ripple, icon placement, disabled behavior, or animation in application CSS. Prefer component attributes and slots, and limit CSS customization on Material Web components to supported color/design tokens unless a documented accessibility or layout exception is required.

## GitHub Tools feature structure

The GitHub developer tools live under `src/features/github-tools/`:

- `presentation/GitHubToolsApp.ts/html/css` is the shell for navigation, drawer state, shared layout, favorites wiring, and current tool switching.
- `core/models/`, `core/services/`, and `core/components/` hold GitHub Tools code shared by multiple tools.
- `tools/repo-mapper/`, `tools/release-stats/`, and `tools/git-patch/` hold tool-specific data, domain, and presentation code.

When adding GitHub-focused functionality, prefer placing shared GitHub parsing/client/model code in `github-tools/core` and tool-only behavior in the matching `github-tools/tools/<tool-name>` package. Keep truly app-wide utilities in `src/core`, and keep favorites in `src/features/favorites` unless they become private to GitHub Tools.
