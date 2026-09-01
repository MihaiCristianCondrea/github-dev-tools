import type { RepositoryMapFormat, RepositoryMapResult, RepositoryTreeItem } from "./RepositoryTree";

// Path segments come from repository data and can collide with inherited object keys
// such as "constructor" or "toString". Directory nodes are therefore maps rather than
// object literals, so membership tests only ever see real children.
type DirectoryNode = Map<string, DirectoryNode | null>;

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
		const structure: DirectoryNode = new Map();
		paths.forEach((item) => {
			const parts = item.path.split("/").filter(Boolean);
			let current = structure;
			parts.forEach((part, index) => {
				const isLeaf = index === parts.length - 1;
				const isFile = isLeaf && item.type === "blob";
				if (!current.has(part)) current.set(part, isFile ? null : new Map());
				const next = current.get(part);
				if (next != null) current = next;
			});
		});
		return this.buildDirectoryString(structure);
	}

	private static buildDirectoryString(structure: DirectoryNode, prefix = ""): string {
		const keys = Array.from(structure.keys()).sort((a, b) => {
			const aIsFolder = structure.get(a) !== null;
			const bIsFolder = structure.get(b) !== null;
			if (aIsFolder && !bIsFolder) return -1;
			if (!aIsFolder && bIsFolder) return 1;
			return a.localeCompare(b);
		});
		return keys
			.map((key, index) => {
				const isLast = index === keys.length - 1;
				const child = structure.get(key);
				const line = `${prefix}${isLast ? "└── " : "├── "}${key}`;
				if (child == null || child.size === 0) return line;
				return `${line}\n${this.buildDirectoryString(child, prefix + (isLast ? "    " : "│   "))}`;
			})
			.join("\n");
	}
}
