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
	// True when the repository has more releases than the client is willing to page
	// through, so downstream totals must be presented as partial.
	truncated: boolean;
};
