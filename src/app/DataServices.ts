import { GetPromotedAppsUseCase } from "../features/app-showcase/domain/usecases/GetPromotedAppsUseCase";
import { LocalFavoritesRepository } from "../features/favorites/data/repositories/LocalFavoritesRepository";
import { ManageFavoritesUseCase } from "../features/favorites/domain/usecases/ManageFavoritesUseCase";
import GitHubRepositoryClient from "../features/github-tools/core/services/GitHubRepositoryClient";
import { RemoteAppsRepository } from "../features/app-showcase/data/repositories/RemoteAppsRepository";
import { RemoteLeaderboardRepository } from "../features/github-tools/tools/leaderboard/data/RemoteLeaderboardRepository";
import { GetLeaderboardUseCase } from "../features/github-tools/tools/leaderboard/domain/GetLeaderboardUseCase";
import { SearchLeaderboardUsersUseCase } from "../features/github-tools/tools/leaderboard/domain/SearchLeaderboardUsersUseCase";

export default class DataServices {
	static readonly github = new GitHubRepositoryClient();
	static readonly favorites = new ManageFavoritesUseCase(new LocalFavoritesRepository());
	static readonly promotedApps = new GetPromotedAppsUseCase(new RemoteAppsRepository());
	static readonly leaderboard = new GetLeaderboardUseCase(new RemoteLeaderboardRepository());
	static readonly searchLeaderboard = new SearchLeaderboardUsersUseCase();
}
