import type { AppItem } from "../domain/models/AppItem";
import type { GetPromotedAppsUseCase } from "../domain/usecases/GetPromotedAppsUseCase";
import type { AppCard } from "./AppCard";
import "./AppCard";

export class AppShowcaseSection extends HTMLElement {
	private getPromotedAppsUseCase?: GetPromotedAppsUseCase;
	private isLoading = false;

	configure(getPromotedAppsUseCase: GetPromotedAppsUseCase): void {
		this.getPromotedAppsUseCase = getPromotedAppsUseCase;
		if (this.isConnected) {
			this.renderLoading();
			void this.loadApps();
		}
	}

	connectedCallback(): void {
		this.renderLoading();
		void this.loadApps();
	}

	private async loadApps(): Promise<void> {
		if (!this.getPromotedAppsUseCase || this.isLoading) {
			return;
		}

		this.isLoading = true;
		try {
			const apps = await this.getPromotedAppsUseCase.execute();
			this.renderApps(apps);
		} catch (error) {
			console.error(error);
			this.renderError();
		} finally {
			this.isLoading = false;
		}
	}

	private renderLoading(): void {
		this.innerHTML = `
			<section class="showcase-section" aria-labelledby="showcase-title">
				${this.renderHeader()}
				<div class="showcase-loading"><md-circular-progress indeterminate aria-label="Loading apps"></md-circular-progress><span>Loading apps…</span></div>
			</section>
		`;
	}

	private renderApps(apps: AppItem[]): void {
		if (apps.length === 0) {
			this.renderError("No apps are available right now.");
			return;
		}

		this.innerHTML = `
			<section class="showcase-section" aria-labelledby="showcase-title">
				${this.renderHeader()}
				<div class="apps-grid"></div>
			</section>
		`;

		const grid = this.querySelector(".apps-grid");
		if (!grid) return;
		apps.slice(0, 4).forEach((app) => {
			const card = document.createElement("app-card") as AppCard;
			card.app = app;
			grid.append(card);
		});
	}

	private renderHeader(): string {
		return `
			<div class="section-heading">
				<h2 id="showcase-title">More apps from Mihai-Cristian</h2>
				<md-outlined-button class="view-all-link" href="https://play.google.com/store/apps/dev?id=5390214922640123642" target="_blank" aria-label="View all apps on Google Play">
					<md-icon slot="icon">open_in_new</md-icon>
					View all apps
				</md-outlined-button>
			</div>
		`;
	}

	private renderError(message = "Could not load app recommendations. Please try again later."): void {
		this.innerHTML = `
			<section class="showcase-section" aria-labelledby="showcase-title">
				${this.renderHeader()}
				<div class="showcase-error">${message}</div>
			</section>
		`;
	}
}

if (!customElements.get("app-showcase-section")) {
	customElements.define("app-showcase-section", AppShowcaseSection);
}
