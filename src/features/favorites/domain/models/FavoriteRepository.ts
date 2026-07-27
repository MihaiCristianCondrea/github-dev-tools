import type { RepositoryRef } from "../../../github-tools/core/models/Repository";

export type FavoriteRepository = RepositoryRef & {
	timestamp: number;
};
