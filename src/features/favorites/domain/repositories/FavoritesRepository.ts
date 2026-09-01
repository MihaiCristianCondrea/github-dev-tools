import type { FavoriteRepository } from "../models/FavoriteRepository";

export interface FavoritesRepository {
	load(): FavoriteRepository[];
	// Returns false when the favorites could not be persisted.
	save(favorites: FavoriteRepository[]): boolean;
}
