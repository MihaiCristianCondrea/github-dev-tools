import { strings } from "../../../core/localization/Localization";
import type { AppItem } from "../domain/models/AppItem";
import type { GetPromotedAppsUseCase } from "../domain/usecases/GetPromotedAppsUseCase";
import type { AppCard } from "./AppCard";
import "./AppCard";

const STORE_DEVELOPER_URL = "https://play.google.com/store/apps/dev?id=5390214922640123642";
const SHOWCASE_CARD_COUNT = 4;

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
			const apps = await this.getPromotedAppsUseCase.execute(SHOWCASE_CARD_COUNT);
			this.renderApps(apps);
		} catch (error) {
			console.error(error);
			this.renderError();
		} finally {
			this.isLoading = false;
		}
	}

	private renderLoading(): void {
		const body = this.renderShell();
		body.className = "showcase-loading";
		const progress = document.createElement("md-circular-progress");
		progress.setAttribute("indeterminate", "");
		progress.setAttribute("aria-label", strings.common.appShowcase.loadingLabel);
		const label = document.createElement("span");
		label.textContent = strings.common.appShowcase.loading;
		body.append(progress, label);
	}

	private renderApps(apps: AppItem[]): void {
		if (apps.length === 0) {
			this.renderError(strings.common.appShowcase.empty);
			return;
		}

		const grid = this.renderShell();
		grid.className = "apps-grid";
		apps.forEach((app) => {
			const card = document.createElement("app-card") as AppCard;
			card.app = app;
			grid.append(card);
		});
	}

	private renderError(message = strings.common.appShowcase.error): void {
		const body = this.renderShell();
		body.className = "showcase-error";
		body.textContent = message;
	}

	// Writes the section structure once and returns the empty body element the caller
	// fills, so no locale copy or remote value is ever interpolated into markup.
	private renderShell(): HTMLElement {
		this.innerHTML = `
			<section class="showcase-section" aria-labelledby="showcase-title">
				<div class="section-heading">
					<h2 id="showcase-title"></h2>
					<md-outlined-button class="view-all-link" href="${STORE_DEVELOPER_URL}" target="_blank" rel="noopener">
						<md-icon slot="icon">open_in_new</md-icon>
					</md-outlined-button>
				</div>
				<div></div>
			</section>
		`;
		this.querySelector("#showcase-title")!.textContent = strings.common.appShowcase.title;
		const viewAll = this.querySelector<HTMLElement>(".view-all-link")!;
		viewAll.setAttribute("aria-label", strings.common.appShowcase.viewAllLabel);
		viewAll.append(document.createTextNode(strings.common.appShowcase.viewAll));
		return this.querySelector<HTMLElement>(".section-heading + div")!;
	}
}

if (!customElements.get("app-showcase-section")) {
	customElements.define("app-showcase-section", AppShowcaseSection);
}
