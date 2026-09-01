import assert from "node:assert/strict";
import test from "node:test";
import type { FavoriteRepository } from "../../../../src/features/favorites/domain/models/FavoriteRepository.ts";
import type { FavoritesRepository } from "../../../../src/features/favorites/domain/repositories/FavoritesRepository.ts";
import { ManageFavoritesUseCase } from "../../../../src/features/favorites/domain/usecases/ManageFavoritesUseCase.ts";

class MemoryFavoritesRepository implements FavoritesRepository {
	favorites: FavoriteRepository[] = [];
	load(): FavoriteRepository[] { return this.favorites; }
	save(favorites: FavoriteRepository[]): boolean { this.favorites = favorites; return true; }
}

test("favorites are matched case-insensitively", () => {
	const useCase = new ManageFavoritesUseCase(new MemoryFavoritesRepository());
	const favorites = [{ owner: "OpenAI", repo: "Codex", timestamp: 1 }];
	assert.equal(useCase.isFavorite(favorites, { owner: "openai", repo: "CODEX" }), true);
});

test("toggle adds and removes a favorite without mutating the input", () => {
	const useCase = new ManageFavoritesUseCase(new MemoryFavoritesRepository(), () => 42);
	const initial: FavoriteRepository[] = [];
	const added = useCase.toggle(initial, { owner: "openai", repo: "codex" });
	assert.deepEqual(added, [{ owner: "openai", repo: "codex", timestamp: 42 }]);
	assert.deepEqual(initial, []);
	assert.deepEqual(useCase.toggle(added, { owner: "OPENAI", repo: "Codex" }), []);
});
