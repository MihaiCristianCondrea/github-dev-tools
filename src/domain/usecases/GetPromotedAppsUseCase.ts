import type { AppItem } from "../models/AppItem";
import type { AppsRepository } from "../repositories/AppsRepository";

export class GetPromotedAppsUseCase {
	constructor(private readonly repository: AppsRepository) {}

	async execute(): Promise<AppItem[]> {
		const apps = await this.repository.getPromotedApps();
		return apps.slice(0, 6);
	}
}
