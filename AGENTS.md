# Repository Instructions

## Application source

The production application source lives in `src/`. Runtime code must be implemented from project source and npm dependencies, not copied from reference snapshots.

The browser entry point is `src/app/main.ts`. Application startup and mounting belong in `src/app/App.ts`; do not create a second competing entry point.

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

- `presentation/GitHubToolsApp.ts`, `.html`, and `.scss` form the shell for navigation, drawer state, shared layout, favorites wiring, and current tool switching.
- `core/models/`, `core/services/`, and `core/components/` hold GitHub Tools code shared by multiple tools.
- `tools/repo-mapper/`, `tools/release-stats/`, `tools/git-patch/`, and `tools/leaderboard/` hold tool-specific data, domain, and presentation code.

When adding GitHub-focused functionality, prefer placing shared GitHub parsing, client, and model code in `github-tools/core` and tool-only behavior in the matching `github-tools/tools/<tool-name>` package. Keep truly app-wide utilities in `src/core`, and keep favorites in `src/features/favorites` unless they become private to GitHub Tools.

## Localization

English under `src/locales/en/` is the canonical locale. Every locale directory must contain:

- `common.json`
- `github-tools.json`
- `favorites.json`
- `leaderboard.json`

All visible or screen-reader-exposed application copy belongs in locale resources, including headings, descriptions, actions, form labels, placeholders, accessibility labels, loading states, generated sentences, and user-facing errors.

Rules:

- Use `{{namespace.key}}` tokens in raw HTML templates.
- Use `strings`, `formatMessage`, and the formatting helpers from `src/core/localization/Localization.ts` in TypeScript.
- Do not import locale JSON directly outside `src/core/localization/Localization.ts`.
- Do not concatenate translated sentence fragments. Use named placeholders such as `{repository}` or `{count}`.
- Preserve every placeholder name across all locale values.
- Keep Material icon names, routes, IDs, CSS classes, URLs, API values, repository data, release data, usernames, and country slugs outside localization.
- Internal diagnostics may remain technical only when the UI replaces them with localized user-facing copy.
- Keep `index.html` and `public/manifest.webmanifest` fallback metadata synchronized with `common.app`.
- Adding a locale directory does not activate language switching. Do not expose an incomplete locale in the UI.
- Run `npm run validate:locales` after changing resources or user-facing UI.
- Run `npm run check` before opening or merging a pull request.

See `docs/localization.md` for namespace ownership, coding examples, the translation workflow, and validation details.

## Material Web cleanup rule

When working on UI that uses Material Web components, do not recreate Material behavior with custom CSS or custom wrapper markup.

Before adding styles or custom logic, check whether the Material Web component already provides the needed behavior through:

- component choice
- attributes
- slots
- supported design tokens
- native selected, disabled, or toggle behavior

Application CSS must not override Material Web component structure, shape, padding, sizing, icon placement, ripple, focus, disabled state, or animation unless there is a documented accessibility or layout exception.

Prefer deleting interfering CSS over adding new CSS.
