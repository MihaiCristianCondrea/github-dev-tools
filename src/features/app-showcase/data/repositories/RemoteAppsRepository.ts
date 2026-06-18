import type { AppItem } from "../../domain/models/AppItem";
import type { AppsRepository } from "../../domain/repositories/AppsRepository";
import type { AndroidAppsApiDto } from "../dto/AndroidAppsApiDto";
import { AndroidAppsMapper } from "../mappers/AndroidAppsMapper";

const appsEndpoint = "https://mihaicristiancondrea.github.io/com.d4rk.apis/api/app_toolkit/v2/release/en/home/api_android_apps.json";

export class RemoteAppsRepository implements AppsRepository {
	private cachedApps: AppItem[] | null = null;
	private inFlightRequest: Promise<AppItem[]> | null = null;

	constructor(private readonly mapper = new AndroidAppsMapper()) {}

	async getPromotedApps(): Promise<AppItem[]> {
		if (this.cachedApps) return this.cachedApps;
		if (this.inFlightRequest) return this.inFlightRequest;

		this.inFlightRequest = this.fetchPromotedApps();
		try {
			this.cachedApps = await this.inFlightRequest;
			return this.cachedApps;
		} finally {
			this.inFlightRequest = null;
		}
	}

	private async fetchPromotedApps(): Promise<AppItem[]> {
		const response = await fetch(appsEndpoint, { headers: { Accept: "application/json" } });
		if (!response.ok) {
			throw new Error(`Apps API returned ${response.status}`);
		}

		const dto = await response.json() as AndroidAppsApiDto;
		return this.mapper.toDomain(dto);
	}
}
