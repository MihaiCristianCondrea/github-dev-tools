import { formatMessage, strings } from "../../../core/localization/Localization";
import type { FavoriteRepository } from "../domain/models/FavoriteRepository";

export type FavoriteActions = {
	remove(favorite: FavoriteRepository): void;
	openMapper(favorite: FavoriteRepository): void;
	openStats(favorite: FavoriteRepository): void;
};

const createIcon = (name: string): HTMLElement => {
	const icon = document.createElement("md-icon");
	icon.textContent = name;
	return icon;
};

export class FavoritesView {
	renderGrid(grid: Element, emptyState: Element, favorites: FavoriteRepository[], actions: FavoriteActions): void {
		grid.textContent = "";
		emptyState.classList.toggle("hidden", favorites.length !== 0);
		favorites.forEach((favorite) => grid.append(this.createCard(favorite, actions)));
	}

	renderHome(section: Element, list: Element, favorites: FavoriteRepository[], openStats: (favorite: FavoriteRepository) => void, openAll: () => void): void {
		list.textContent = "";
		section.classList.toggle("hidden", favorites.length === 0);
		if (favorites.length === 0) return;

		favorites.slice(0, 5).forEach((favorite) => {
			const chip = document.createElement("md-assist-chip");
			chip.className = "favorite-chip";
			const icon = createIcon("star");
			icon.setAttribute("slot", "icon");
			icon.classList.add("filled-icon");
			chip.append(icon, document.createTextNode(favorite.repo));
			chip.addEventListener("click", () => openStats(favorite));
			list.append(chip);
		});

		const seeAll = document.createElement("md-assist-chip");
		seeAll.className = "favorite-chip";
		const icon = createIcon("arrow_forward");
		icon.setAttribute("slot", "icon");
		seeAll.append(icon, document.createTextNode(strings.favorites.seeAll));
		seeAll.addEventListener("click", openAll);
		list.append(seeAll);
	}

	private createCard(favorite: FavoriteRepository, actions: FavoriteActions): HTMLElement {
		const card = document.createElement("md-outlined-card");
		card.className = "favorite-card";
		const header = document.createElement("div");
		header.className = "favorite-card-header";
		const titleWrap = document.createElement("div");
		titleWrap.className = "favorite-title-wrap";
		const owner = document.createElement("div");
		owner.className = "favorite-owner";
		owner.append(createIcon("folder_open"), document.createTextNode(favorite.owner));
		const title = document.createElement("h3");
		title.textContent = favorite.repo;
		titleWrap.append(owner, title);
		const remove = document.createElement("md-outlined-icon-button");
		remove.setAttribute("type", "button");
		remove.setAttribute("aria-label", formatMessage(strings.favorites.removeRepository, {
			repository: `${favorite.owner}/${favorite.repo}`,
		}));
		const removeIcon = createIcon("star");
		removeIcon.classList.add("filled-icon");
		remove.append(removeIcon);
		remove.addEventListener("click", () => actions.remove(favorite));
		header.append(titleWrap, remove);

		const actionBar = document.createElement("div");
		actionBar.className = "favorite-card-actions";
		actionBar.append(
			this.createAction("terminal", strings.favorites.map, () => actions.openMapper(favorite)),
			this.createAction("bar_chart", strings.favorites.stats, () => actions.openStats(favorite))
		);
		card.append(header, actionBar);
		return card;
	}

	private createAction(iconName: string, label: string, onClick: () => void): HTMLElement {
		const button = document.createElement("md-outlined-button");
		button.setAttribute("type", "button");
		const icon = createIcon(iconName);
		icon.setAttribute("slot", "icon");
		button.append(icon, document.createTextNode(label));
		button.addEventListener("click", onClick);
		return button;
	}
}
