import type { RepositoryRef } from "../../../github-tools/core/models/Repository";
import type { FavoriteRepository } from "../models/FavoriteRepository";
import type { FavoritesRepository } from "../repositories/FavoritesRepository";

const isSameRepository = (left: RepositoryRef, right: RepositoryRef): boolean =>
	left.owner.toLowerCase() === right.owner.toLowerCase() && left.repo.toLowerCase() === right.repo.toLowerCase();

export class ManageFavoritesUseCase {
	private readonly repository: FavoritesRepository;
	private readonly now: () => number;

	constructor(repository: FavoritesRepository, now: () => number = Date.now) {
		this.repository = repository;
		this.now = now;
	}

	load(): FavoriteRepository[] {
		return this.repository.load();
	}

	save(favorites: FavoriteRepository[]): void {
		this.repository.save(favorites);
	}

	isFavorite(favorites: FavoriteRepository[], repository: RepositoryRef): boolean {
		return favorites.some((favorite) => isSameRepository(favorite, repository));
	}

	toggle(favorites: FavoriteRepository[], repository: RepositoryRef): FavoriteRepository[] {
		if (this.isFavorite(favorites, repository)) {
			return favorites.filter((favorite) => !isSameRepository(favorite, repository));
		}
		return [{ ...repository, timestamp: this.now() }, ...favorites];
	}
}
