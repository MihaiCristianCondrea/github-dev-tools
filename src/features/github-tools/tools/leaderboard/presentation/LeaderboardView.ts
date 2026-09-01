import {
	formatDate,
	formatEnglishPlural,
	formatMessage,
	formatNumber,
	formatOrdinal,
	strings,
} from "../../../../../core/localization/Localization";
import type { Leaderboard, RankedUser } from "../domain/Leaderboard";

type FilterChipElement = HTMLElement & { selected?: boolean };

const AVATAR_SIZE = 48;

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

	// Clears the ranking while a different country loads, so a failed request can never
	// leave the previous country's rows under the new country's error message.
	clearResults(): void {
		this.element("#leaderboard-list").textContent = "";
		this.element("#leaderboard-empty").classList.add("hidden");
		this.element("#leaderboard-pagination").classList.add("hidden");
		this.element("#leaderboard-status").textContent = "";
	}

	renderUsers(users: RankedUser[], country: string, hasQuery: boolean, totalResults: number): void {
		const list = this.element("#leaderboard-list");
		const empty = this.element("#leaderboard-empty");
		list.textContent = "";
		empty.classList.toggle("hidden", users.length > 0);

		// The status line is the live region: announcing a count keeps assistive tech
		// useful while typing, where re-announcing every row would not.
		this.element("#leaderboard-status").textContent = hasQuery
			? formatEnglishPlural(
				totalResults,
				strings.leaderboard.ranking.resultCount_one,
				strings.leaderboard.ranking.resultCount_other,
			)
			: "";

		if (users.length === 0) {
			this.element("#leaderboard-empty-copy").textContent = formatMessage(
				strings.leaderboard.ranking.usernameNotIncluded,
				{ country },
			);
			return;
		}

		const rows = document.createDocumentFragment();
		users.forEach((user) => rows.append(this.createUserRow(user, country, hasQuery)));
		list.append(rows);
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

	// Chips are rendered from the requested country rather than from their own toggle
	// state, so clicking the active chip cannot leave the filter row without a selection.
	//
	// `selected` is a reflecting Lit property: the chip flips the property on click and
	// only writes the attribute on its next update. Writing the attribute here would be
	// a no-op that the pending reflection then overwrites, so set the property instead.
	syncCountryChips(countrySlug: string): void {
		this.root.querySelectorAll<FilterChipElement>("#leaderboard-country-filters md-filter-chip")
			.forEach((chip) => {
				const selected = chip.dataset.countrySlug === countrySlug;
				if ("selected" in chip) chip.selected = selected;
				else chip.toggleAttribute("selected", selected);
			});
	}

	showError(message: string): void {
		this.element("#leaderboard-error-text").textContent = message;
		this.element("#leaderboard-error").classList.remove("hidden");
	}

	hideError(): void {
		this.element("#leaderboard-error").classList.add("hidden");
	}

	setLocating(locating: boolean): void {
		this.element("#leaderboard-locate").toggleAttribute("disabled", locating);
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
		link.append(rank, this.createAvatar(user.username), details, icon);
		return link;
	}

	// Avatars 404 for renamed or deleted accounts, so the image swaps itself for the
	// placeholder icon instead of leaving a broken-image glyph in the row.
	private createAvatar(username: string): HTMLElement {
		const avatar = document.createElement("img");
		avatar.className = "leaderboard-avatar";
		avatar.src = `https://github.com/${encodeURIComponent(username)}.png?size=80`;
		avatar.alt = "";
		avatar.loading = "lazy";
		avatar.decoding = "async";
		avatar.width = AVATAR_SIZE;
		avatar.height = AVATAR_SIZE;
		avatar.addEventListener("error", () => {
			const fallback = document.createElement("md-icon");
			fallback.className = "leaderboard-avatar leaderboard-avatar-fallback";
			fallback.textContent = "person";
			fallback.setAttribute("aria-hidden", "true");
			avatar.replaceWith(fallback);
		}, { once: true });
		return avatar;
	}

	private element(selector: string): HTMLElement {
		return this.root.querySelector<HTMLElement>(selector)!;
	}
}
