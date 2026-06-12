import type { AppItem } from "../../domain/models/AppItem";
import type { AppsRepository } from "../../domain/repositories/AppsRepository";
import type { AndroidAppsApiDto } from "../dto/AndroidAppsApiDto";
import { AndroidAppsMapper } from "../mappers/AndroidAppsMapper";

const appsEndpoint = "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/app_toolkit/v2/release/en/home/api_android_apps.json";

export class RemoteAppsRepository implements AppsRepository {
	constructor(private readonly mapper = new AndroidAppsMapper()) {}

	async getPromotedApps(): Promise<AppItem[]> {
		const response = await fetch(appsEndpoint, { headers: { Accept: "application/json" } });
		if (!response.ok) {
			throw new Error(`Apps API returned ${response.status}`);
		}

		const dto = await response.json() as AndroidAppsApiDto;
		return this.mapper.toDomain(dto);
	}
}
