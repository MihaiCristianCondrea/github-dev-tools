// ====================================================== //
// ==================== WebComponent ==================== //
// ====================================================== //

// This class is used to create your custom web components.

// Usage:
// -> Extend this class from a component under src/features/*/presentation and provide HTML/CSS strings.

// Constructed stylesheets are shared between every instance that renders the same
// CSS text, so repeated components parse their styles once instead of per instance.
const sharedStyleSheets = new Map<string, CSSStyleSheet>();

const styleSheetFor = (css: string): CSSStyleSheet | null => {
	if (typeof CSSStyleSheet === "undefined" || !("replaceSync" in CSSStyleSheet.prototype)) return null;

	const cached = sharedStyleSheets.get(css);
	if (cached) return cached;

	const sheet = new CSSStyleSheet();
	sheet.replaceSync(css);
	sharedStyleSheets.set(css, sheet);
	return sheet;
};

export default abstract class WebComponent extends HTMLElement {
	html: string;
	css: string;
	private hasRendered = false;

	protected constructor(html?: string, css?: string) {
		super();
		this.html = html ?? "";
		this.css = css ?? "";
		this.attachShadow({ mode: "open" });
	}

	// Called, when the component is connected to the DOM
	// Override this method in your component to add listeners, set data, etc.
	abstract onConnected(): void;

	// Called, when the component is removed from the DOM
	// Override this method to release listeners and observers created in onConnected().
	onDisconnected(): void {}

	// Returns the HTML tag name of the component
	// The returned value is the custom element name registered in the browser.
	abstract get htmlTagName(): string;

	// Wrapper for making dispatchEvent consistent with the Observer pattern
	protected notifyAll(eventName: string, data?: unknown): void {
		this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
	}

	// Returns the root element of the component
	get root(): ShadowRoot {
		if (this.shadowRoot) return this.shadowRoot;
		else throw new Error("WebComponent.root is not available yet");
	}

	// shortcut for this.root.querySelector(selector)
	select<E extends HTMLElement>(selector: string): E | null {
		return this.root.querySelector(selector);
	}

	// shortcut for this.root.querySelectorAll(selector)
	selectAll<E extends Element = Element>(selectors: string): NodeListOf<E> {
		return this.root.querySelectorAll(selectors);
	}

	connectedCallback(): void {
		if (this.hasRendered) return;
		this.loadStylesheet();
		this.loadHtml();
		this.hasRendered = true;
		this.onConnected();
	}

	disconnectedCallback(): void {
		this.onDisconnected();
	}

	loadStylesheet(): void {
		if (this.css === "") return;

		const sheet = styleSheetFor(this.css);
		if (sheet) {
			this.root.adoptedStyleSheets = [...this.root.adoptedStyleSheets, sheet];
			return;
		}

		const style = document.createElement("style");
		style.textContent = this.css;
		this.root.appendChild(style);
	}

	loadHtml(): void {
		if (this.html === "") return;
		const template = document.createElement("template");
		template.innerHTML = this.html;
		this.root.appendChild(template.content.cloneNode(true));
	}
}
