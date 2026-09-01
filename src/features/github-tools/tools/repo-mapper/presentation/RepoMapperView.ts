import { formatNumber } from "../../../../../core/localization/Localization";
import type { RepositoryMapResult } from "../domain/RepositoryTree";

export class RepoMapperView {
	constructor(private readonly root: ShadowRoot) {}

	renderOutput(result: RepositoryMapResult): void {
		this.element("#mapper-code").textContent = result.output;
		this.element("#mapper-stats-files").textContent = formatNumber(result.files);
		this.element("#mapper-stats-folders").textContent = formatNumber(result.folders);
	}

	setResultVisible(visible: boolean): void {
		this.element("#mapper-result").classList.toggle("hidden", !visible);
	}

	outputText(): string {
		return this.element("#mapper-code").textContent ?? "";
	}

	setFormatControl(format: "ascii" | "paths"): void {
		const segmented = this.root.querySelector<HTMLElement & { setButtonSelected(index: number, selected: boolean): void }>(".segmented");
		segmented?.setButtonSelected(format === "ascii" ? 0 : 1, true);
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
