export type ReleaseAsset = {
	name: string;
	downloads: number;
};

export type ProcessedRelease = {
	name: string;
	tagName: string;
	date: string | null;
	downloads: number;
	assets: ReleaseAsset[];
};

export type ReleaseStats = {
	total: number;
	releases: ProcessedRelease[];
};
