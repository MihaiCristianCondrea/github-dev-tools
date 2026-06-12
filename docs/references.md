# Reference-only source

The `references/` folder contains external open-source code that is available only for research, comparison, documentation, and AI context.

## What belongs there

- Material Web source snapshots used to inspect component APIs and implementation patterns.
- External code examples that help explain how a dependency is intended to work.
- Documentation context that is useful during maintenance but is not part of the app runtime.

## Hard rules

Code in `references/` must never be:

- Edited as part of application work.
- Imported from production code.
- Bundled into the Vite application.
- Copied blindly into `src/`.
- Treated as the source of truth for runtime behavior.

The real application source lives in `src/`.

## Material Web usage

Material Web must be consumed through npm imports from `@material/web`, not from `references/`.

Use the reference Material Web source only to understand component names, attributes, slots, events, and styling patterns. After researching a component in `references/material-web-components`, register the production custom element from the matching `@material/web` package path in `src/core/material/MaterialElements.ts`.
