import { GetPromotedAppsUseCase } from "../domain/usecases/GetPromotedAppsUseCase";
import FavoriteRepositoryStore from "./FavoriteRepositoryStore";
import GitHubRepositoryClient from "./GitHubRepositoryClient";
import { RemoteAppsRepository } from "./RemoteAppsRepository";

export default class DataManager {
	static github = new GitHubRepositoryClient();
	static favorites = new FavoriteRepositoryStore();
	static promotedApps = new GetPromotedAppsUseCase(new RemoteAppsRepository());

	static async init(): Promise<void> {
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
	}
}
