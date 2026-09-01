import { strings } from "../../../../core/localization/Localization";

export type ToolScope = "mapper" | "releases" | "patch" | "favorites";

// Error banners, button loading states, and copy-to-clipboard feedback are identical
// across the tools, so every tool view shares this one implementation.
export class ToolFeedbackView {
	constructor(private readonly root: ShadowRoot) {}

	showError(scope: ToolScope, message: string): void {
		const text = this.root.querySelector<HTMLElement>(`#${scope}-error-text`);
		const box = this.root.querySelector<HTMLElement>(`#${scope}-error`);
		if (!text || !box) return;
		text.textContent = message;
		box.classList.remove("hidden");
	}

	hideError(scope: ToolScope): void {
		this.root.querySelector<HTMLElement>(`#${scope}-error`)?.classList.add("hidden");
	}

	setLoading(buttonSelector: string, label: string): () => void {
		const progress = document.createElement("md-circular-progress");
		progress.setAttribute("slot", "icon");
		progress.setAttribute("data-icon", "");
		progress.setAttribute("indeterminate", "");
		progress.setAttribute("aria-label", strings.common.actions.loading);
		return this.setButtonState(buttonSelector, label, progress, true, "is-loading");
	}

	setButtonState(
		buttonSelector: string,
		label: string,
		iconReplacement: HTMLElement | string,
		disabled: boolean,
		stateClass: string,
	): () => void {
		const button = this.root.querySelector<HTMLElement>(buttonSelector);
		const icon = button?.querySelector<HTMLElement>("[data-icon]");
		const text = button?.querySelector<HTMLElement>("[data-label]");
		if (!button || !icon || !text) return () => {};

		const replacement = typeof iconReplacement === "string" ? slottedIcon(iconReplacement) : iconReplacement;
		const originalIcon = icon.cloneNode(true);
		const originalText = text.textContent ?? "";
		const wasDisabled = button.hasAttribute("disabled");

		button.toggleAttribute("disabled", disabled);
		button.classList.add(stateClass);
		icon.replaceWith(replacement);
		text.textContent = label;
		return () => {
			button.toggleAttribute("disabled", wasDisabled);
			button.classList.remove(stateClass);
			replacement.replaceWith(originalIcon);
			text.textContent = originalText;
		};
	}

	// Clipboard writes reject on insecure origins and when the permission is denied,
	// so the caller is told rather than leaving a button that appears to do nothing.
	async copyToClipboard(text: string, buttonSelector: string): Promise<boolean> {
		if (!text) return true;
		try {
			await navigator.clipboard.writeText(text);
		} catch (error) {
			console.error("Clipboard write failed", error);
			return false;
		}
		const resetButton = this.setButtonState(buttonSelector, strings.common.actions.copied, "check_circle", false, "copied");
		window.setTimeout(resetButton, 2000);
		return true;
	}
}

const slottedIcon = (name: string): HTMLElement => {
	const icon = document.createElement("md-icon");
	icon.textContent = name;
	icon.setAttribute("slot", "icon");
	icon.setAttribute("data-icon", "");
	return icon;
};
