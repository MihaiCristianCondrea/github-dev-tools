import type { AppItem } from "../models/AppItem";
import type { AppsRepository } from "../repositories/AppsRepository";

export class GetPromotedAppsUseCase {
	constructor(private readonly repository: AppsRepository) {}

	// The caller decides how many apps it can show, so no promoted app is fetched and
	// then silently discarded by a limit the presentation layer does not know about.
	async execute(limit?: number): Promise<AppItem[]> {
		const apps = await this.repository.getPromotedApps();
		return typeof limit === "number" ? apps.slice(0, limit) : apps;
	}
}
