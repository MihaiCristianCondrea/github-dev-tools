import type { AppItem } from "../domain/models/AppItem";
import type { AndroidAppApiDto, AndroidAppCategoryDto, AndroidAppsApiDto } from "./AndroidAppsApiDto";

export class AndroidAppsMapper {
	toDomain(response: AndroidAppsApiDto): AppItem[] {
		const apps = this.extractApps(response);

		return apps
			.map((app, index) => this.mapApp(app, index))
			.filter((app): app is AppItem => Boolean(app));
	}

	private extractApps(response: AndroidAppsApiDto): AndroidAppApiDto[] {
		if (Array.isArray(response)) {
			return response;
		}

		if (Array.isArray(response.data)) {
			return response.data;
		}

		return response.apps ?? response.data?.apps ?? response.promotedApps ?? response.androidApps ?? [];
	}

	private mapApp(app: AndroidAppApiDto, index: number): AppItem | null {
		const packageName = app.packageName ?? app.package;
		const name = app.appName ?? app.name ?? app.title;
		if (!name || !packageName) {
			return null;
		}

		return {
			id: packageName || `app-${index}`,
			name,
			category: this.mapCategory(app.category ?? app.appCategory),
			description: this.shortDescription(app.shortDescription ?? app.description ?? app.summary),
			iconUrl: app.iconUrl ?? app.iconLogo ?? app.icon ?? app.image ?? "",
			storeUrl: app.storeUrl ?? app.googlePlayUrl ?? app.url ?? `https://play.google.com/store/apps/details?id=${packageName}`,
		};
	}

	private mapCategory(category: string | AndroidAppCategoryDto | undefined): string {
		if (!category) {
			return "Android app";
		}

		if (typeof category === "string") {
			return category;
		}

		return category.label ?? category.category_id ?? "Android app";
	}

	private shortDescription(description: string | undefined): string {
		const fallback = "Explore another lightweight app from Mihai-Cristian.";
		if (!description) {
			return fallback;
		}

		const firstLine = description.split("\n").find((line) => line.trim());
		return firstLine?.trim() ?? fallback;
	}
}
