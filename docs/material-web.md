# Material Web Usage

This project uses Material Web for buttons, icon buttons, icons, outlined text fields, and selected labs components such as cards, drawer items, modal navigation drawers, and segmented buttons. Material Web is installed as an npm dependency and bundled by Vite; production code must not dynamically import Material modules from a runtime CDN.

## Import contract

Material's quick-start documentation distinguishes CDN use for prototyping from the install/build path for production, and notes that Material Web uses bare module specifiers that need a build tool to resolve them. In this app, `src/presentation/material/MaterialElements.ts` is the single import boundary for Material element definitions.

Approved imports:

```ts
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/labs/card/outlined-card.js";
import "@material/web/labs/item/item.js";
import "@material/web/labs/navigationdrawer/navigation-drawer-modal.js";
import "@material/web/labs/segmentedbutton/outlined-segmented-button.js";
import "@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js";
```

Do not reintroduce `import(/* @vite-ignore */ "https://...")` for Material components. Runtime CDN imports make local builds less reproducible and can evaluate shared internals more than once.

## Components in use

- `md-icon`
- `md-icon-button`
- `md-filled-button`
- `md-outlined-button`
- `md-text-button`
- `md-outlined-text-field`
- `md-outlined-card`
- `md-item`
- `md-navigation-drawer-modal`
- `md-outlined-segmented-button`
- `md-outlined-segmented-button-set`

## Buttons and links

Material button docs expose `href` and `target` properties for link-button behavior. Use a single Material button element with `href`/`target` when an action navigates away. Do not wrap a Material button in an `<a>` tag, and do not put an anchor inside a button.

Correct pattern:

```html
<md-outlined-button href="https://example.com" target="_blank" aria-label="Open example">
  <md-icon slot="icon">open_in_new</md-icon>
  Open
</md-outlined-button>
```

## Icon buttons and favorite actions

Icon buttons usually have no visible text label. Material's icon-button accessibility guidance calls for an `aria-label` when the label needs to be more descriptive. Every standalone icon button in this project must have an accessible label. Repository favorite actions use `md-outlined-button` with an icon and an accessible label so the form action remains an outlined Material button instead of an icon-button variant.

## Labs components

The app uses Material Web labs components from npm for experimental cards, segmented buttons, modal navigation drawers, and drawer items. Labs APIs can change between Material Web versions, so inspect `references/material-web-components/labs/` for usage patterns before upgrading, but keep production imports pointed at `@material/web/labs/...`.

## Text fields

Text fields should provide a meaningful `label`, appropriate `type`, and relevant browser hints such as `autocomplete`. Repository URL fields may use `list` with datalists when favorite suggestions are available, but that wiring should be tested after Material Web upgrades because attributes are mediated by the component implementation.

## Theming

The app themes Material controls with CSS custom properties in component styles, including button tokens such as `--md-filled-button-container-color`, `--md-outlined-button-outline-color`, and `--md-text-button-label-text-color`, plus outlined text-field color tokens. Prefer token overrides in component CSS over imperative style changes in TypeScript.

## Fallback policy

Do not implement production fallbacks by registering local classes under official `md-*` tag names. The browser's custom-element registry rejects duplicate names and reused constructors, and partial local clones can drift from Material's accessibility and form behavior. If Material cannot be installed or bundled, fail the build rather than shipping a runtime fake implementation.

## References

- Material Web quick start: https://github.com/material-components/material-web/blob/v2.3.0/docs/quick-start.md
- Material Web buttons: https://github.com/material-components/material-web/blob/v2.3.0/docs/components/button.md
- Material Web icon buttons: https://github.com/material-components/material-web/blob/v2.3.0/docs/components/icon-button.md
- Material Web text fields: https://github.com/material-components/material-web/blob/v2.3.0/docs/components/text-field.md
- Local reference-source policy: ./references.md
