# Troubleshooting

## `Failed to start GitHub Tools`

**Meaning:** the startup sequence in `src/main.ts` threw before `<github-tools-app>` was mounted.

**First checks:**

1. Open DevTools Console and look for the first exception above the startup error.
2. Confirm `npm run build` passes locally.
3. Verify the live GitHub Pages artifact was built from the commit you are inspecting.

## `the name "md-focus-ring" has already been used with this registry`

**Meaning:** browser custom-element names are global, and `md-focus-ring` was registered more than once.

**Likely cause in this project:** Material Web modules were previously loaded through multiple remote CDN `+esm` URLs. Shared Material internals could be evaluated more than once, causing duplicate custom-element registration.

**Fix:** keep Material Web as bundled npm imports in `src/core/material/MaterialElements.ts`; do not dynamically import Material from runtime CDN URLs.

## `this constructor has already been used with this registry`

**Meaning:** the same JavaScript class constructor was passed to `customElements.define()` for two or more tag names.

**Likely cause in this project:** the old fallback Material registry reused one `MdButtonFallback` class for several tags such as `md-icon-button`, `md-filled-button`, `md-outlined-button`, and `md-text-button`.

**Fix:** do not register local fallback classes under Material tag names. If a non-Material compatibility layer is ever introduced, every custom-element tag must get its own constructor and must be guarded against duplicate registration.

MDN documents both failure cases for `CustomElementRegistry.define()`: `NotSupportedError` is thrown when the registry already contains the same name or the same constructor.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define

## 404 while loading the app

**Meaning:** one requested URL could not be found. The important detail is the exact URL, not just the status code.

**First checks:**

1. Open DevTools Network.
2. Reload with cache disabled.
3. Filter by `404`.
4. Copy the full missing URL.
5. Decide whether it is a built asset, a runtime app fetch, a GitHub API request, an image, or an external endpoint.

If the missing URL is a hashed asset under `/github-dev-tools/assets/`, suspect stale HTML or a deployment/source mismatch. If the missing URL is external JSON or an API endpoint, inspect the data adapter that makes that request.

## Material component does not behave like a native control

**Meaning:** Material components are custom elements that proxy form, link, focus, and accessibility behavior through their own implementations.

**First checks:**

- Do not nest interactive elements, such as an `<md-outlined-button>` inside an `<a>`.
- Use Material link-button attributes (`href`, `target`) for navigation buttons.
- Give icon-only buttons explicit accessible labels.
- Verify field attributes such as `list`, `autocomplete`, and `type` still work after dependency upgrades.
