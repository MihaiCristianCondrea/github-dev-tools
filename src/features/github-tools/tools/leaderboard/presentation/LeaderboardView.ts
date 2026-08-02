import {
	formatDate,
	formatEnglishPlural,
	formatMessage,
	formatNumber,
	formatOrdinal,
	strings,
} from "../../../../../core/localization/Localization";
import type { Leaderboard, RankedUser } from "../domain/Leaderboard";

export class LeaderboardView {
	constructor(private readonly root: ShadowRoot) {}

	setLoading(loading: boolean): void {
		this.element("#leaderboard-loading").classList.toggle("hidden", !loading);
		this.element("#leaderboard-content").classList.toggle("hidden", loading);
	}

	renderHeader(leaderboard: Leaderboard): void {
		this.element("#leaderboard-country").textContent = leaderboard.country;
		this.element("#leaderboard-count").textContent = formatEnglishPlural(
			leaderboard.users.length,
			strings.leaderboard.ranking.rankedDevelopers_one,
			strings.leaderboard.ranking.rankedDevelopers_other,
		);
		this.element("#leaderboard-updated").textContent = leaderboard.updatedAt
			? formatMessage(strings.leaderboard.ranking.updated, {
				date: formatDate(leaderboard.updatedAt, { year: "numeric", month: "long", day: "numeric" }),
			})
			: strings.leaderboard.ranking.latestAvailable;
	}

	renderUsers(users: RankedUser[], country: string, hasQuery: boolean): void {
		const list = this.element("#leaderboard-list");
		const empty = this.element("#leaderboard-empty");
		list.textContent = "";
		empty.classList.toggle("hidden", users.length > 0);
		if (users.length === 0) {
			this.element("#leaderboard-empty-copy").textContent = formatMessage(
				strings.leaderboard.ranking.usernameNotIncluded,
				{ country },
			);
			return;
		}

		users.forEach((user) => list.append(this.createUserRow(user, country, hasQuery)));
	}

	renderPagination(page: number, pageCount: number, resultCount: number): void {
		const pagination = this.element("#leaderboard-pagination");
		pagination.classList.toggle("hidden", resultCount === 0 || pageCount <= 1);
		this.element("#leaderboard-page-status").textContent = formatMessage(
			strings.leaderboard.ranking.pageStatus,
			{ page: formatNumber(page), pageCount: formatNumber(pageCount) },
		);
		this.element("#leaderboard-previous").toggleAttribute("disabled", page <= 1);
		this.element("#leaderboard-next").toggleAttribute("disabled", page >= pageCount);
	}

	showError(message: string): void {
		this.element("#leaderboard-error-text").textContent = message;
		this.element("#leaderboard-error").classList.remove("hidden");
	}

	hideError(): void {
		this.element("#leaderboard-error").classList.add("hidden");
	}

	private createUserRow(user: RankedUser, country: string, emphasized: boolean): HTMLAnchorElement {
		const link = document.createElement("a");
		link.className = `leaderboard-row${emphasized ? " search-result" : ""}${user.rank <= 3 ? ` podium rank-${user.rank}` : ""}`;
		link.href = `https://github.com/${encodeURIComponent(user.username)}`;
		link.target = "_blank";
		link.rel = "noopener";
		link.setAttribute("aria-label", formatMessage(strings.leaderboard.ranking.openProfile, {
			username: user.username,
			rank: formatNumber(user.rank),
			country,
		}));

		const rank = document.createElement("span");
		rank.className = "leaderboard-rank";
		rank.textContent = `#${formatNumber(user.rank)}`;
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
		position.textContent = formatMessage(strings.leaderboard.ranking.position, {
			ordinal: formatOrdinal(user.rank),
			country,
		});
		details.append(name, position);
		const icon = document.createElement("md-icon");
		icon.textContent = "open_in_new";
		link.append(rank, avatar, details, icon);
		return link;
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
