import { GetPromotedAppsUseCase } from "../features/app-showcase/domain/usecases/GetPromotedAppsUseCase";
import FavoriteRepositoryStore from "../features/favorites/data/local/FavoriteRepositoryStore";
import GitHubRepositoryClient from "../features/github-tools/core/services/GitHubRepositoryClient";
import { RemoteAppsRepository } from "../features/app-showcase/data/repositories/RemoteAppsRepository";

export default class DataServices {
	static github = new GitHubRepositoryClient();
	static favorites = new FavoriteRepositoryStore();
	static promotedApps = new GetPromotedAppsUseCase(new RemoteAppsRepository());

	static async init(): Promise<void> {
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
	}
}
