import type { AppItem } from "../domain/models/AppItem";

export class AppCard extends HTMLElement {
	set app(value: AppItem) {
		this.render(value);
	}

	private render(app: AppItem): void {
		const icon = app.iconUrl
			? `<img src="${this.escapeAttribute(app.iconUrl)}" alt="" loading="lazy" />`
			: "<md-icon class=\"app-icon-placeholder\">apps</md-icon>";

		// Material buttons support link-button attributes; keep actions as a single interactive element.
		this.innerHTML = `
			<md-outlined-card class="app-card">
				<div class="app-icon">${icon}</div>
				<div class="app-content">
					<h3>${this.escape(app.name)}</h3>
					<p class="app-category">${this.escape(app.category)}</p>
					<p>${this.escape(app.description)}</p>
				</div>
				<md-outlined-button
					class="play-link"
					href="${this.escapeAttribute(app.storeUrl)}"
					target="_blank"
					aria-label="Open ${this.escapeAttribute(app.name)} on Google Play"
				>
					<md-icon slot="icon">play_arrow</md-icon>
					Google Play
				</md-outlined-button>
			</md-outlined-card>
		`;
	}

	private escape(value: string): string {
		const element = document.createElement("span");
		element.textContent = value;
		return element.innerHTML;
	}

	private escapeAttribute(value: string): string {
		return this.escape(value).replace(/"/g, "&quot;");
	}
}

if (!customElements.get("app-card")) {
	customElements.define("app-card", AppCard);
}
