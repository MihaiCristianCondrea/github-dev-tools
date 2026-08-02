import type { Leaderboard, RankedUser } from "../domain/Leaderboard";

export class LeaderboardView {
	constructor(private readonly root: ShadowRoot) {}

	setLoading(loading: boolean): void {
		this.element("#leaderboard-loading").classList.toggle("hidden", !loading);
		this.element("#leaderboard-content").classList.toggle("hidden", loading);
	}

	renderHeader(leaderboard: Leaderboard): void {
		this.element("#leaderboard-country").textContent = leaderboard.country;
		this.element("#leaderboard-count").textContent = `${leaderboard.users.length.toLocaleString()} ranked developers`;
		this.element("#leaderboard-updated").textContent = leaderboard.updatedAt
			? `Updated ${leaderboard.updatedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
			: "Latest available ranking";
	}

	renderUsers(users: RankedUser[], country: string, hasQuery: boolean): void {
		const list = this.element("#leaderboard-list");
		const empty = this.element("#leaderboard-empty");
		list.textContent = "";
		empty.classList.toggle("hidden", users.length > 0);
		if (users.length === 0) {
			this.element("#leaderboard-empty-copy").textContent = `This username is not included in the current ${country} leaderboard.`;
			return;
		}

		users.forEach((user) => list.append(this.createUserRow(user, country, hasQuery)));
	}

	showError(message: string): void {
		this.element("#leaderboard-error-text").textContent = message;
		this.element("#leaderboard-error").classList.remove("hidden");
	}

	hideError(): void {
		this.element("#leaderboard-error").classList.add("hidden");
	}

	setLocationStatus(message: string): void {
		this.element("#leaderboard-location-status").textContent = message;
	}

	private createUserRow(user: RankedUser, country: string, emphasized: boolean): HTMLAnchorElement {
		const link = document.createElement("a");
		link.className = `leaderboard-row${emphasized ? " search-result" : ""}${user.rank <= 3 ? ` podium rank-${user.rank}` : ""}`;
		link.href = `https://github.com/${encodeURIComponent(user.username)}`;
		link.target = "_blank";
		link.rel = "noopener";
		link.setAttribute("aria-label", `Open ${user.username} on GitHub, ranked ${user.rank} in ${country}`);

		const rank = document.createElement("span");
		rank.className = "leaderboard-rank";
		rank.textContent = `#${user.rank}`;
		const avatar = document.createElement("img");
		avatar.className = "leaderboard-avatar";
		avatar.src = `https://github.com/${encodeURIComponent(user.username)}.png?size=80`;
		avatar.alt = "";
		avatar.loading = "lazy";
		const details = document.createElement("span");
		details.className = "leaderboard-user-details";
		const name = document.createElement("strong");
		name.textContent = user.username;
		const position = document.createElement("span");
		position.textContent = `${this.ordinal(user.rank)} in ${country}`;
		details.append(name, position);
		const icon = document.createElement("md-icon");
		icon.textContent = "open_in_new";
		link.append(rank, avatar, details, icon);
		return link;
	}

	private ordinal(value: number): string {
		const suffixes = ["th", "st", "nd", "rd"];
		const mod100 = value % 100;
		return `${value}${suffixes[(mod100 - 20) % 10] ?? suffixes[mod100] ?? suffixes[0]}`;
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
