export class GitPatchView {
	constructor(private readonly root: ShadowRoot) {}

	renderPatch(content: string): void {
		this.element("#patch-code").textContent = content;
	}

	setResultVisible(visible: boolean): void {
		this.element("#patch-result").classList.toggle("hidden", !visible);
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
