import type { CommitRef, RepositoryRef } from "../models/Repository";
import type { PatchFile } from "../../tools/git-patch/domain/PatchFile";
import type { ReleaseStats } from "../../tools/release-stats/domain/ReleaseStats";
import type { RepositoryTree } from "../../tools/repo-mapper/domain/RepositoryTree";

type GithubRepoResponse = {
	default_branch: string;
};

type GithubTreeResponse = {
	tree?: RepositoryTree["items"];
	truncated?: boolean;
};

type GithubAssetResponse = {
	name: string;
	download_count: number;
};

type GithubReleaseResponse = {
	name: string | null;
	tag_name: string;
	published_at: string | null;
	assets: GithubAssetResponse[];
};

export default class GitHubRepositoryClient {
	async getRepositoryTree(repository: RepositoryRef, token = ""): Promise<RepositoryTree> {
		const headers = this.githubHeaders(token);
		const repoData = await this.fetchJson<GithubRepoResponse>(
			`https://api.github.com/repos/${repository.owner}/${repository.repo}`,
			headers,
			"Repo not found"
		);
		const treeData = await this.fetchJson<GithubTreeResponse>(
			`https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${encodeURIComponent(repoData.default_branch)}?recursive=1`,
			headers,
			"Failed to fetch tree"
		);
		return { items: treeData.tree ?? [], truncated: treeData.truncated ?? false };
	}

	async getReleaseStats(repository: RepositoryRef, token = ""): Promise<ReleaseStats> {
		const releases = await this.fetchJson<GithubReleaseResponse[]>(
			`https://api.github.com/repos/${repository.owner}/${repository.repo}/releases?per_page=100`,
			this.githubHeaders(token),
			"Repo not found"
		);
		if (releases.length === 0) throw new Error("No releases found");

		let total = 0;
		const processed = releases.map((release) => {
			const downloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0);
			total += downloads;
			return {
				name: release.name || release.tag_name,
				tagName: release.tag_name,
				date: release.published_at,
				downloads,
				assets: release.assets
					.map((asset) => ({ name: asset.name, downloads: asset.download_count }))
					.sort((a, b) => b.downloads - a.downloads),
			};
		});

		return { total, releases: processed };
	}

	async getCommitPatch(commit: CommitRef): Promise<PatchFile> {
		const response = await fetch(`https://api.github.com/repos/${commit.owner}/${commit.repo}/commits/${commit.sha}`, {
			headers: { Accept: "application/vnd.github.v3.patch" },
		});
		if (!response.ok) throw new Error("Failed to fetch patch");
		return {
			content: await response.text(),
			filename: `${commit.repo}-${commit.sha.substring(0, 7)}.patch`,
		};
	}

	private async fetchJson<T>(url: string, headers: Record<string, string>, notFoundMessage: string): Promise<T> {
		const response = await fetch(url, { headers });
		if (!response.ok) throw new Error(response.status === 404 ? notFoundMessage : `GitHub API error (${response.status})`);
		return (await response.json()) as T;
	}

	private githubHeaders(token: string): Record<string, string> {
		const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
		if (token.trim()) headers.Authorization = `token ${token.trim()}`;
		return headers;
	}
}
