import type { FavoriteRepository, RepositoryRef } from "../../../repo-mapper/domain/models/Repository";

const STORAGE_KEY = "repomapper_favorites";

export default class FavoriteRepositoryStore {
	load(): FavoriteRepository[] {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		try {
			const parsed = JSON.parse(stored) as FavoriteRepository[];
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error("Failed to load favorites", error);
			return [];
		}
	}

	save(favorites: FavoriteRepository[]): void {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
	}

	isFavorite(favorites: FavoriteRepository[], repository: RepositoryRef): boolean {
		return favorites.some(
			(favorite) => favorite.owner.toLowerCase() === repository.owner.toLowerCase() && favorite.repo.toLowerCase() === repository.repo.toLowerCase()
		);
	}

	toggle(favorites: FavoriteRepository[], repository: RepositoryRef): FavoriteRepository[] {
		if (this.isFavorite(favorites, repository)) {
			return favorites.filter(
				(favorite) => !(favorite.owner.toLowerCase() === repository.owner.toLowerCase() && favorite.repo.toLowerCase() === repository.repo.toLowerCase())
			);
		}
		return [{ ...repository, timestamp: Date.now() }, ...favorites];
	}
}
