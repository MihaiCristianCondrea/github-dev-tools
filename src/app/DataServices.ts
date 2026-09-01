import { GetPromotedAppsUseCase } from "../features/app-showcase/domain/usecases/GetPromotedAppsUseCase";
import type { AppsRepository } from "../features/app-showcase/domain/repositories/AppsRepository";
import { LocalFavoritesRepository } from "../features/favorites/data/repositories/LocalFavoritesRepository";
import { ManageFavoritesUseCase } from "../features/favorites/domain/usecases/ManageFavoritesUseCase";
import type { FavoritesRepository } from "../features/favorites/domain/repositories/FavoritesRepository";
import GitHubRepositoryClient from "../features/github-tools/core/services/GitHubRepositoryClient";
import { RemoteAppsRepository } from "../features/app-showcase/data/repositories/RemoteAppsRepository";
import { RemoteLeaderboardRepository } from "../features/github-tools/tools/leaderboard/data/RemoteLeaderboardRepository";
import { GetLeaderboardUseCase } from "../features/github-tools/tools/leaderboard/domain/GetLeaderboardUseCase";
import type { LeaderboardRepository } from "../features/github-tools/tools/leaderboard/domain/LeaderboardRepository";
import { SearchLeaderboardUsersUseCase } from "../features/github-tools/tools/leaderboard/domain/SearchLeaderboardUsersUseCase";

// Adapters can be substituted when composing the container, so use cases and
// presentation code never depend on a concrete repository implementation.
export type DataServiceAdapters = {
	appsRepository: AppsRepository;
	favoritesRepository: FavoritesRepository;
	leaderboardRepository: LeaderboardRepository;
	githubClient: GitHubRepositoryClient;
};

export type DataServiceContainer = {
	github: GitHubRepositoryClient;
	favorites: ManageFavoritesUseCase;
	promotedApps: GetPromotedAppsUseCase;
	leaderboard: GetLeaderboardUseCase;
	searchLeaderboard: SearchLeaderboardUsersUseCase;
	init(): Promise<void>;
};

export const createDataServices = (adapters: Partial<DataServiceAdapters> = {}): DataServiceContainer => {
	const githubClient = adapters.githubClient ?? new GitHubRepositoryClient();

	return {
		github: githubClient,
		favorites: new ManageFavoritesUseCase(adapters.favoritesRepository ?? new LocalFavoritesRepository()),
		promotedApps: new GetPromotedAppsUseCase(adapters.appsRepository ?? new RemoteAppsRepository()),
		leaderboard: new GetLeaderboardUseCase(adapters.leaderboardRepository ?? new RemoteLeaderboardRepository()),
		searchLeaderboard: new SearchLeaderboardUsersUseCase(),
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
		async init(): Promise<void> {},
	};
};

const DataServices = createDataServices();

export default DataServices;
