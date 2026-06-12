# Material Web Usage

This project uses Material Web for buttons, icon buttons, icons, and outlined text fields. Material Web is installed as an npm dependency and bundled by Vite; production code must not dynamically import Material modules from a runtime CDN.

## Import contract

Material's quick-start documentation distinguishes CDN use for prototyping from the install/build path for production, and notes that Material Web uses bare module specifiers that need a build tool to resolve them. In this app, `src/presentation/material/MaterialElements.ts` is the single import boundary for Material element definitions.

Approved imports:

```ts
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/iconbutton/outlined-icon-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";
```

Do not reintroduce `import(/* @vite-ignore */ "https://...")` for Material components. Runtime CDN imports make local builds less reproducible and can evaluate shared internals more than once.

## Components in use

- `md-icon`
- `md-icon-button`
- `md-outlined-icon-button`
- `md-filled-button`
- `md-outlined-button`
- `md-text-button`
- `md-outlined-text-field`

## Buttons and links

Material button docs expose `href` and `target` properties for link-button behavior. Use a single Material button element with `href`/`target` when an action navigates away. Do not wrap a Material button in an `<a>` tag, and do not put an anchor inside a button.

Correct pattern:

```html
<md-outlined-button href="https://example.com" target="_blank" aria-label="Open example">
  <md-icon slot="icon">open_in_new</md-icon>
  Open
</md-outlined-button>
```

## Icon buttons

Icon buttons usually have no visible text label. Material's icon-button accessibility guidance calls for an `aria-label` when the label needs to be more descriptive. Every standalone icon button in this project must have an accessible label, and toggle icon buttons should use `aria-label-selected` when selected and unselected states need different labels.

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
