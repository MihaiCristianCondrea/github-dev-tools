import { GetPromotedAppsUseCase } from "../domain/usecases/GetPromotedAppsUseCase";
import FavoriteRepositoryStore from "./local/FavoriteRepositoryStore";
import GitHubRepositoryClient from "./remote/GitHubRepositoryClient";
import { RemoteAppsRepository } from "./repositories/RemoteAppsRepository";

export default class DataServices {
	static github = new GitHubRepositoryClient();
	static favorites = new FavoriteRepositoryStore();
	static promotedApps = new GetPromotedAppsUseCase(new RemoteAppsRepository());

	static async init(): Promise<void> {
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
	}
}
