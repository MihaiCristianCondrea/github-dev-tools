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

Keep Material Web custom element registration centralized in `src/presentation/material/MaterialElements.ts` unless there is a strong reason to add a separate import boundary.
