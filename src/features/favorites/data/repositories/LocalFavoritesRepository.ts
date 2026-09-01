import type { FavoriteRepository } from "../../domain/models/FavoriteRepository";
import type { FavoritesRepository } from "../../domain/repositories/FavoritesRepository";

const STORAGE_KEY = "repomapper_favorites";

// Stored favorites are user-editable and survive across releases, so every entry is
// re-validated on load instead of trusting the persisted shape.
const isFavorite = (value: unknown): value is FavoriteRepository => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<FavoriteRepository>;
	return typeof candidate.owner === "string" && candidate.owner.length > 0
		&& typeof candidate.repo === "string" && candidate.repo.length > 0;
};

export class LocalFavoritesRepository implements FavoritesRepository {
	load(): FavoriteRepository[] {
		let stored: string | null = null;
		try {
			stored = window.localStorage.getItem(STORAGE_KEY);
		} catch (error) {
			console.error("Failed to read favorites from local storage", error);
			return [];
		}
		if (!stored) return [];

		try {
			const parsed: unknown = JSON.parse(stored);
			return Array.isArray(parsed) ? parsed.filter(isFavorite) : [];
		} catch (error) {
			console.error("Failed to load favorites", error);
			return [];
		}
	}

	// Reports whether the write landed so the UI can tell the user when a favorite
	// could not be persisted (private browsing, exhausted quota, blocked storage).
	save(favorites: FavoriteRepository[]): boolean {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
			return true;
		} catch (error) {
			console.error("Failed to save favorites", error);
			return false;
		}
	}
}
