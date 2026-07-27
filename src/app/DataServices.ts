import { GetPromotedAppsUseCase } from "../features/app-showcase/domain/usecases/GetPromotedAppsUseCase";
import { LocalFavoritesRepository } from "../features/favorites/data/repositories/LocalFavoritesRepository";
import { ManageFavoritesUseCase } from "../features/favorites/domain/usecases/ManageFavoritesUseCase";
import GitHubRepositoryClient from "../features/github-tools/core/services/GitHubRepositoryClient";
import { RemoteAppsRepository } from "../features/app-showcase/data/repositories/RemoteAppsRepository";

export default class DataServices {
	static github = new GitHubRepositoryClient();
	static favorites = new ManageFavoritesUseCase(new LocalFavoritesRepository());
	static promotedApps = new GetPromotedAppsUseCase(new RemoteAppsRepository());

	static async init(): Promise<void> {
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
	}
}
