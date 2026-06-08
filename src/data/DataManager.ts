import FavoriteRepositoryStore from "./FavoriteRepositoryStore";
import GitHubRepositoryClient from "./GitHubRepositoryClient";

export default class DataManager {
	static github = new GitHubRepositoryClient();
	static favorites = new FavoriteRepositoryStore();

	static async init(): Promise<void> {
		// Data services are stateless today, but this lifecycle hook keeps the app
		// ready for future persistence, cache, or API-client initialization.
	}
}
