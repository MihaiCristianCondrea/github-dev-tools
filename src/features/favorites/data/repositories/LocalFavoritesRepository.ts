import type { FavoriteRepository } from "../../domain/models/FavoriteRepository";
import type { FavoritesRepository } from "../../domain/repositories/FavoritesRepository";

const STORAGE_KEY = "repomapper_favorites";

export class LocalFavoritesRepository implements FavoritesRepository {
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
}
