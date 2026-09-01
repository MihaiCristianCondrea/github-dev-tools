import {
	formatDate,
	formatEnglishPlural,
	formatNumber,
	strings,
} from "../../../../../core/localization/Localization";
import type { ProcessedRelease, ReleaseAsset, ReleaseStats } from "../domain/ReleaseStats";

export class ReleaseStatsView {
	constructor(
		private readonly root: ShadowRoot,
		private readonly onSelectRelease: (index: number) => void,
	) {}

	setResultVisible(visible: boolean): void {
		this.element("#releases-result").classList.toggle("hidden", !visible);
	}

	render(stats: ReleaseStats, selectedIndex: number): void {
		this.renderDetails(stats, selectedIndex);
		this.renderReleaseList(stats.releases, selectedIndex);
	}

	renderDetails(stats: ReleaseStats, selectedIndex: number): void {
		const active = stats.releases[selectedIndex];
		if (!active) return;

		this.element("#rel-detail-name").textContent = active.name;
		this.element("#rel-detail-tag").textContent = active.tagName;
		this.element("#rel-detail-date").textContent = active.date
			? formatDate(new Date(active.date))
			: strings.githubTools.releases.unpublished;
		this.element("#rel-detail-downloads").textContent = formatNumber(active.downloads);
		this.element("#rel-total-downloads").textContent = formatNumber(stats.total);
		this.element("#rel-count").textContent = formatEnglishPlural(
			stats.releases.length,
			strings.githubTools.releases.found_one,
			strings.githubTools.releases.found_other,
		);

		const maxAssetDownloads = Math.max(...active.assets.map((asset) => asset.downloads), 0);
		const assetList = this.element("#rel-assets-list");
		assetList.textContent = "";
		if (active.assets.length === 0) {
			const empty = document.createElement("div");
			empty.className = "empty-list";
			empty.textContent = strings.githubTools.releases.noAssets;
			assetList.append(empty);
			return;
		}
		const rows = document.createDocumentFragment();
		active.assets.forEach((asset) => rows.append(this.createAssetRow(asset, maxAssetDownloads)));
		assetList.append(rows);
	}

	syncSelection(selectedIndex: number): void {
		this.root.querySelectorAll<HTMLButtonElement>("[data-release-index]").forEach((button) => {
			const selected = Number(button.dataset.releaseIndex) === selectedIndex;
			button.classList.toggle("selected", selected);
			button.setAttribute("aria-pressed", String(selected));
		});
	}

	private renderReleaseList(releases: ProcessedRelease[], selectedIndex: number): void {
		const maxDownloads = Math.max(...releases.map((release) => release.downloads), 0);
		const releaseList = this.element("#rel-list");
		releaseList.textContent = "";
		const buttons = document.createDocumentFragment();
		releases.forEach((release, index) =>
			buttons.append(this.createReleaseButton(release, index, maxDownloads, index === selectedIndex))
		);
		releaseList.append(buttons);
	}

	private createAssetRow(asset: ReleaseAsset, maxDownloads: number): HTMLElement {
		const row = document.createElement("div");
		row.className = "asset-row";
		row.innerHTML = `<div class="asset-line"><strong></strong><span></span></div><div class="bar-track"><div class="bar-fill"></div></div>`;
		row.querySelector("strong")!.textContent = asset.name;
		row.querySelector("span")!.textContent = formatNumber(asset.downloads);
		this.setBarWidth(row, asset.downloads, maxDownloads);
		return row;
	}

	private createReleaseButton(release: ProcessedRelease, index: number, maxDownloads: number, selected: boolean): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.dataset.releaseIndex = String(index);
		button.setAttribute("aria-pressed", String(selected));
		button.className = `release-button${selected ? " selected" : ""}`;
		button.innerHTML = `<div class="release-button-header"><span class="release-button-title"></span><span class="release-button-count"></span></div><div class="bar-track"><div class="bar-fill"></div></div>`;
		button.querySelector(".release-button-title")!.textContent = release.name;
		button.querySelector(".release-button-count")!.textContent = formatNumber(release.downloads);
		this.setBarWidth(button, release.downloads, maxDownloads);
		button.addEventListener("click", () => this.onSelectRelease(index));
		return button;
	}

	private setBarWidth(container: HTMLElement, downloads: number, maxDownloads: number): void {
		const width = maxDownloads > 0 ? (downloads / maxDownloads) * 100 : 0;
		container.querySelector<HTMLElement>(".bar-fill")!.style.width = `${width}%`;
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
