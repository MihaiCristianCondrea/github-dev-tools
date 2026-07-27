import type { FavoriteRepository } from "../models/FavoriteRepository";

export interface FavoritesRepository {
	load(): FavoriteRepository[];
	save(favorites: FavoriteRepository[]): void;
}
