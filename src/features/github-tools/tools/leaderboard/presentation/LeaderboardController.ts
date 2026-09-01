import { strings } from "../../../../../core/localization/Localization";
import type { BrowserCountryLocator } from "../data/BrowserCountryLocator";
import type { GetLeaderboardUseCase } from "../domain/GetLeaderboardUseCase";
import type { Leaderboard } from "../domain/Leaderboard";
import type { SearchLeaderboardUsersUseCase } from "../domain/SearchLeaderboardUsersUseCase";
import { LeaderboardView } from "./LeaderboardView";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 200;
const DEFAULT_SLUG = "global";

export type LeaderboardDependencies = {
	getLeaderboard: GetLeaderboardUseCase;
	searchUsers: SearchLeaderboardUsersUseCase;
	countryLocator: BrowserCountryLocator;
};

// Everything the ranking renders from. The chips, the heading, and the rows are all
// derived from this object, so they cannot describe different countries.
type LeaderboardState = {
	data: Leaderboard | null;
	countrySlug: string;
	countryName: string;
	// The country a failed request was for, so Retry re-attempts that country rather
	// than the one still on screen.
	failedCountry: { slug: string; name: string } | null;
	query: string;
	page: number;
};

export class LeaderboardController {
	private readonly view: LeaderboardView;
	private searchTimer = 0;
	private state: LeaderboardState = {
		data: null,
		countrySlug: DEFAULT_SLUG,
		countryName: strings.leaderboard.ranking.defaultCountry,
		failedCountry: null,
		query: "",
		page: 1,
	};

	constructor(
		private readonly root: ShadowRoot,
		private readonly dependencies: LeaderboardDependencies,
	) {
		this.view = new LeaderboardView(root);
	}

	bind(): void {
		this.root.querySelector<HTMLInputElement>("#leaderboard-search")?.addEventListener("input", (event) => {
			const query = (event.currentTarget as HTMLInputElement).value;
			// Rebuilding the ranking on every keystroke re-requests every avatar, so
			// settle on the typed query first.
			window.clearTimeout(this.searchTimer);
			this.searchTimer = window.setTimeout(() => {
				this.state.query = query;
				this.state.page = 1;
				this.renderUsers();
			}, SEARCH_DEBOUNCE_MS);
		});
		this.root.querySelector("#leaderboard-previous")?.addEventListener("click", () => this.changePage(-1));
		this.root.querySelector("#leaderboard-next")?.addEventListener("click", () => this.changePage(1));
		this.root.querySelector("#leaderboard-country-filters")?.addEventListener("click", (event) => {
			const chip = (event.target as HTMLElement).closest<HTMLElement>("md-filter-chip[data-country-slug]");
			if (!chip) return;
			const { countrySlug, countryName } = chip.dataset;
			if (!countrySlug || !countryName) return;
			// Filter chips toggle themselves on click. Re-assert the selection from state
			// so activating the current country cannot clear the filter row.
			if (countrySlug === this.state.countrySlug && this.state.data) {
				this.view.syncCountryChips(this.state.countrySlug);
				return;
			}
			void this.load(countrySlug, countryName);
		});
		this.root.querySelector("#leaderboard-locate")?.addEventListener("click", () => void this.useCurrentLocation());
		this.root.querySelector("#leaderboard-retry")?.addEventListener("click", () => {
			const target = this.state.failedCountry ?? { slug: this.state.countrySlug, name: this.state.countryName };
			void this.load(target.slug, target.name);
		});
	}

	// Called when the leaderboard view becomes visible; the first visit triggers the load.
	activate(): void {
		if (this.state.data) return;
		void this.load(this.state.countrySlug, this.state.countryName);
	}

	dispose(): void {
		window.clearTimeout(this.searchTimer);
	}

	async load(countrySlug: string, countryName: string): Promise<boolean> {
		this.view.hideError();
		this.view.setLoading(true);
		// Reflect the requested country immediately so a slow or failing request cannot
		// leave the previous country's rows under the new country's heading.
		this.view.syncCountryChips(countrySlug);
		this.view.clearResults();
		const previous = { slug: this.state.countrySlug, name: this.state.countryName };
		this.state.countrySlug = countrySlug;
		this.state.countryName = countryName;
		this.state.page = 1;

		try {
			this.state.data = await this.dependencies.getLeaderboard.execute(countrySlug, countryName);
			this.state.failedCountry = null;
			this.view.renderHeader(this.state.data);
			this.renderUsers();
			return true;
		} catch (error) {
			// A failed switch falls back to the ranking that is still on screen, so the
			// chips, the heading, and the rows keep describing the same country.
			this.state.failedCountry = { slug: countrySlug, name: countryName };
			this.state.countrySlug = this.state.data ? previous.slug : countrySlug;
			this.state.countryName = this.state.data ? previous.name : countryName;
			this.view.syncCountryChips(this.state.countrySlug);
			if (this.state.data) {
				this.view.renderHeader(this.state.data);
				this.renderUsers();
			}
			this.view.showError(errorMessage(error));
			return false;
		} finally {
			this.view.setLoading(false);
		}
	}

	private changePage(delta: number): void {
		this.state.page = Math.max(1, this.state.page + delta);
		this.renderUsers();
	}

	private renderUsers(): void {
		const leaderboard = this.state.data;
		if (!leaderboard) return;
		const matches = this.dependencies.searchUsers.execute(leaderboard, this.state.query, leaderboard.users.length);
		const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
		this.state.page = Math.min(this.state.page, pageCount);
		const start = (this.state.page - 1) * PAGE_SIZE;
		this.view.renderUsers(
			matches.slice(start, start + PAGE_SIZE),
			leaderboard.country,
			this.state.query.trim().length > 0,
			matches.length,
		);
		this.view.renderPagination(this.state.page, pageCount, matches.length);
	}

	private async useCurrentLocation(): Promise<void> {
		this.view.setLocating(true);
		this.view.hideError();
		try {
			const country = await this.dependencies.countryLocator.locate();
			await this.load(country.slug, country.name);
		} catch (error) {
			// Location is optional, but a declined permission or a failed lookup has to
			// say so rather than leaving the button looking unresponsive.
			this.view.showError(errorMessage(error));
		} finally {
			this.view.setLocating(false);
		}
	}
}

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : strings.githubTools.shared.somethingWentWrong;
