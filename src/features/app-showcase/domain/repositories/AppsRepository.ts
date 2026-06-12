import type { AppItem } from "../models/AppItem";

export interface AppsRepository {
	getPromotedApps(): Promise<AppItem[]>;
}
