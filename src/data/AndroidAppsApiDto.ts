export interface AndroidAppCategoryDto {
	label?: string;
	category_id?: string;
}

export interface AndroidAppApiDto {
	appName?: string;
	name?: string;
	title?: string;
	packageName?: string;
	package?: string;
	category?: string | AndroidAppCategoryDto;
	appCategory?: string | AndroidAppCategoryDto;
	shortDescription?: string;
	description?: string;
	summary?: string;
	icon?: string;
	iconUrl?: string;
	iconLogo?: string;
	image?: string;
	storeUrl?: string;
	googlePlayUrl?: string;
	url?: string;
}

export type AndroidAppsApiDto = AndroidAppApiDto[] | {
	apps?: AndroidAppApiDto[];
	data?: AndroidAppApiDto[] | { apps?: AndroidAppApiDto[] };
	promotedApps?: AndroidAppApiDto[];
	androidApps?: AndroidAppApiDto[];
};
