import { formatMessage, strings } from "../../../core/localization/Localization";
import type { AppItem } from "../domain/models/AppItem";

export class AppCard extends HTMLElement {
	set app(value: AppItem) {
		this.render(value);
	}

	// The structure is written once as markup and every value is assigned through
	// textContent or a property, so remote copy and URLs are never parsed as HTML.
	private render(app: AppItem): void {
		this.innerHTML = `
			<md-outlined-card class="app-card">
				<div class="app-icon"></div>
				<div class="app-content">
					<h3></h3>
					<p class="app-category"></p>
					<p class="app-description"></p>
				</div>
				<md-outlined-button class="play-link" target="_blank" rel="noopener">
					<md-icon slot="icon">store</md-icon>
				</md-outlined-button>
			</md-outlined-card>
		`;

		this.querySelector(".app-icon")!.append(this.createIcon(app.iconUrl));
		this.querySelector("h3")!.textContent = app.name;
		this.querySelector(".app-category")!.textContent = app.category || strings.common.appShowcase.defaultCategory;
		this.querySelector(".app-description")!.textContent = app.description || strings.common.appShowcase.defaultDescription;

		const link = this.querySelector<HTMLElement>(".play-link")!;
		link.setAttribute("href", app.storeUrl);
		link.setAttribute("aria-label", formatMessage(strings.common.appShowcase.openOnGooglePlay, { appName: app.name }));
		link.append(document.createTextNode(strings.common.appShowcase.googlePlay));
	}

	private createIcon(iconUrl: string): HTMLElement {
		if (!iconUrl) {
			const placeholder = document.createElement("md-icon");
			placeholder.className = "app-icon-placeholder";
			placeholder.textContent = "apps";
			return placeholder;
		}

		const image = document.createElement("img");
		image.src = iconUrl;
		image.alt = "";
		image.loading = "lazy";
		image.decoding = "async";
		return image;
	}
}

if (!customElements.get("app-card")) {
	customElements.define("app-card", AppCard);
}
