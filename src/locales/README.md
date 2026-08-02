# Locale resources

English under `en/` is the canonical resource set for GitHub Dev Tools.

Every locale directory must contain:

```text
common.json
github-tools.json
favorites.json
leaderboard.json
```

When adding or editing translations:

- Keep file names and JSON keys identical to English.
- Translate values only.
- Preserve named placeholders such as `{count}`, `{country}`, and `{repository}`.
- Keep user-facing text, accessibility labels, loading states, and errors in these files.
- Do not translate route IDs, URLs, Material icon names, GitHub data, or other technical identifiers.
- Do not import locale JSON directly outside `src/core/localization/Localization.ts`.
- Run `npm run validate:locales` and `npm run check`.

Adding a locale folder does not activate language switching by itself. See [`docs/localization.md`](../../docs/localization.md) for namespace ownership, runtime usage, validation rules, and the language-addition workflow.
