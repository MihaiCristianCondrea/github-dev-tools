export type RepositoryTreeItem = {
	path: string;
	type: "blob" | "tree" | string;
};

export type RepositoryTree = {
	items: RepositoryTreeItem[];
	truncated: boolean;
};

export type RepositoryMapFormat = "ascii" | "paths";

export type RepositoryMapResult = {
	output: string;
	files: number;
	folders: number;
};
