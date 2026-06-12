import type { RepositoryMapFormat, RepositoryMapResult, RepositoryTreeItem } from "./RepositoryTree";

interface DirectoryNode {
	[key: string]: DirectoryNode | null;
}

export default class RepositoryMapBuilder {
	static build(paths: RepositoryTreeItem[], format: RepositoryMapFormat): RepositoryMapResult {
		const stats = this.count(paths);
		const output = format === "ascii" ? this.buildAscii(paths) : paths.map((path) => path.path).join("\n");
		return { ...stats, output };
	}

	private static count(paths: RepositoryTreeItem[]): Pick<RepositoryMapResult, "files" | "folders"> {
		return paths.reduce(
			(stats, item) => {
				if (item.type === "blob") stats.files += 1;
				if (item.type === "tree") stats.folders += 1;
				return stats;
			},
			{ files: 0, folders: 0 }
		);
	}

	private static buildAscii(paths: RepositoryTreeItem[]): string {
		const structure: DirectoryNode = {};
		paths.forEach((item) => {
			const parts = item.path.split("/").filter(Boolean);
			let current = structure;
			parts.forEach((part, index) => {
				const isLeaf = index === parts.length - 1;
				if (!(part in current)) current[part] = isLeaf && item.type === "blob" ? null : {};
				const next = current[part];
				if (next !== null) current = next;
			});
		});
		return this.buildDirectoryString(structure);
	}

	private static buildDirectoryString(structure: DirectoryNode, prefix = ""): string {
		const keys = Object.keys(structure).sort((a, b) => {
			const aIsFolder = structure[a] !== null;
			const bIsFolder = structure[b] !== null;
			if (aIsFolder && !bIsFolder) return -1;
			if (!aIsFolder && bIsFolder) return 1;
			return a.localeCompare(b);
		});
		return keys
			.map((key, index) => {
				const isLast = index === keys.length - 1;
				const child = structure[key];
				const line = `${prefix}${isLast ? "└── " : "├── "}${key}`;
				return child === null ? line : `${line}\n${this.buildDirectoryString(child, prefix + (isLast ? "    " : "│   "))}`;
			})
			.join("\n");
	}
}
