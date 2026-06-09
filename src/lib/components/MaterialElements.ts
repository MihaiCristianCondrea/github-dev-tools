const MATERIAL_WEB_COMPONENT_IMPORTS = [
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/icon/icon.js/+esm",
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/iconbutton/icon-button.js/+esm",
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/button/filled-button.js/+esm",
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/button/outlined-button.js/+esm",
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/button/text-button.js/+esm",
	"https://cdn.jsdelivr.net/npm/@material/web@2.3.0/textfield/filled-text-field.js/+esm",
];

const MATERIAL_ICON_CLASS = "material-symbols-outlined";

class MdIconFallback extends HTMLElement {
	connectedCallback(): void {
		this.classList.add(MATERIAL_ICON_CLASS);
		this.setAttribute("aria-hidden", this.getAttribute("aria-hidden") ?? "true");
	}
}

class MdButtonFallback extends HTMLElement {
	static get observedAttributes(): string[] {
		return ["disabled", "type"];
	}

	connectedCallback(): void {
		this.setAttribute("role", "button");
		this.syncDisabledState();
		this.addEventListener("click", this.handleClick);
		this.addEventListener("keydown", this.handleKeyDown);
	}

	disconnectedCallback(): void {
		this.removeEventListener("click", this.handleClick);
		this.removeEventListener("keydown", this.handleKeyDown);
	}

	attributeChangedCallback(): void {
		this.syncDisabledState();
	}

	get disabled(): boolean {
		return this.hasAttribute("disabled");
	}

	set disabled(value: boolean) {
		this.toggleAttribute("disabled", value);
	}

	get type(): string {
		return this.getAttribute("type") ?? "button";
	}

	set type(value: string) {
		this.setAttribute("type", value);
	}

	private handleClick = (event: MouseEvent): void => {
		if (this.disabled) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}

		if (this.type.toLowerCase() === "submit") {
			this.closest("form")?.requestSubmit();
		}
	};

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		this.click();
		event.stopImmediatePropagation();
	};

	private syncDisabledState(): void {
		this.setAttribute("aria-disabled", String(this.disabled));
		this.tabIndex = this.disabled ? -1 : 0;
	}
}

class MdFilledTextFieldFallback extends HTMLElement {
	private readonly input = document.createElement("input");
	private readonly labelElement = document.createElement("label");
	private readonly shadow = this.attachShadow({ mode: "open" });

	static get observedAttributes(): string[] {
		return ["autocomplete", "disabled", "label", "placeholder", "type", "value"];
	}

	constructor() {
		super();
		this.shadow.innerHTML = `
			<style>
				:host { display: block; width: 100%; }
				label { display: block; margin: 0 0 6px; color: var(--md-filled-text-field-label-text-color, inherit); font: inherit; font-size: 13px; font-weight: 600; }
				input { box-sizing: border-box; width: 100%; min-height: 56px; border: 0; border-bottom: 2px solid transparent; border-radius: 12px 12px 4px 4px; padding: 18px 16px 10px; background: var(--md-filled-text-field-container-color, #f1f3f4); color: var(--md-filled-text-field-input-text-color, inherit); font: inherit; outline: none; }
				input::placeholder { color: color-mix(in srgb, currentColor 55%, transparent); }
				input:focus { border-bottom-color: var(--md-filled-text-field-focus-active-indicator-color, currentColor); }
				:host([disabled]) input { cursor: not-allowed; opacity: .72; }
			</style>
		`;
		this.shadow.append(this.labelElement, this.input);
	}

	connectedCallback(): void {
		this.syncAttributes();
		this.input.addEventListener("input", this.forwardInput);
		this.input.addEventListener("change", this.forwardChange);
	}

	disconnectedCallback(): void {
		this.input.removeEventListener("input", this.forwardInput);
		this.input.removeEventListener("change", this.forwardChange);
	}

	attributeChangedCallback(): void {
		this.syncAttributes();
	}

	get value(): string {
		return this.input.value;
	}

	set value(value: string) {
		this.input.value = value;
		this.setAttribute("value", value);
	}

	focus(): void {
		this.input.focus();
	}

	private forwardInput = (): void => {
		this.setAttribute("value", this.input.value);
		this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
	};

	private forwardChange = (): void => {
		this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	};

	private syncAttributes(): void {
		const label = this.getAttribute("label") ?? "";
		this.labelElement.textContent = label;
		this.labelElement.hidden = label === "";
		this.input.type = this.getAttribute("type") ?? "text";
		this.input.placeholder = this.getAttribute("placeholder") ?? "";
		this.input.autocomplete = this.getAttribute("autocomplete") ?? "";
		this.input.disabled = this.hasAttribute("disabled");
		if (this.hasAttribute("value") && this.input.value !== this.getAttribute("value")) {
			this.input.value = this.getAttribute("value") ?? "";
		}
	}
}

const defineElement = (name: string, constructor: CustomElementConstructor): void => {
	if (!customElements.get(name)) customElements.define(name, constructor);
};

const defineFallbackMaterialElements = (): void => {
	defineElement("md-icon", MdIconFallback);
	defineElement("md-icon-button", MdButtonFallback);
	defineElement("md-filled-button", MdButtonFallback);
	defineElement("md-outlined-button", MdButtonFallback);
	defineElement("md-text-button", MdButtonFallback);
	defineElement("md-filled-text-field", MdFilledTextFieldFallback);
};

const loadMaterialWebComponents = async (): Promise<void> => {
	await Promise.all(
		MATERIAL_WEB_COMPONENT_IMPORTS.map((componentImport) => import(/* @vite-ignore */ componentImport))
	);
};

export const defineMaterialElements = async (): Promise<void> => {
	try {
		await loadMaterialWebComponents();
	} catch (error) {
		console.warn("Material Web components could not be loaded; using local fallbacks instead.", error);
		defineFallbackMaterialElements();
	}
};
