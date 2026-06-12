// Material custom elements are registered exactly once by bundled @material/web imports.
// Do not load Material from runtime CDN URLs or define local md-* fallbacks here: duplicate
// tag names or reused constructors will make CustomElementRegistry.define() throw.
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/iconbutton/outlined-icon-button.js";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";

export const defineMaterialElements = (): void => {
	// Importing this module registers the Material Web custom elements through Vite's bundle.
};
