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

type CacheEntry<T> = { expiresAt: number; value: T };

const GITHUB_READ_CACHE_TTL_MS = 2 * 60 * 1000;

export default class GitHubRepositoryClient {
	private readonly responseCache = new Map<string, CacheEntry<unknown> | Promise<unknown>>();

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
		// Never retain credentials (or private repository responses) in the shared response cache.
		if (headers.Authorization) return this.fetchJsonUncached<T>(url, headers, notFoundMessage);

		const cacheKey = url;
		const cached = this.responseCache.get(cacheKey);

		if (cached instanceof Promise) return cached as Promise<T>;
		if (cached && cached.expiresAt > Date.now()) return cached.value as T;
		if (cached) this.responseCache.delete(cacheKey);

		const request = this.fetchJsonUncached<T>(url, headers, notFoundMessage);
		this.responseCache.set(cacheKey, request);

		try {
			const value = await request;
			this.responseCache.set(cacheKey, { value, expiresAt: Date.now() + GITHUB_READ_CACHE_TTL_MS });
			return value;
		} catch (error) {
			this.responseCache.delete(cacheKey);
			throw error;
		}
	}

	private async fetchJsonUncached<T>(url: string, headers: Record<string, string>, notFoundMessage: string): Promise<T> {
		const response = await fetch(url, { headers });
		if (!response.ok) throw new Error(this.githubErrorMessage(response.status, notFoundMessage));
		return (await response.json()) as T;
	}

	private githubErrorMessage(status: number, notFoundMessage: string): string {
		if (status === 401) return "GitHub rejected the access token. Check that it is valid and has not expired.";
		if (status === 403) return "GitHub denied access. Check the token's repository access, permissions, organization approval, and SSO authorization.";
		if (status === 404) return `${notFoundMessage}. If this is private, provide a token with access to this repository.`;
		return `GitHub API error (${status})`;
	}

	private githubHeaders(token: string): Record<string, string> {
		const headers: Record<string, string> = {
			Accept: "application/vnd.github.v3+json",
			"X-GitHub-Api-Version": "2022-11-28",
		};
		// GitHub access tokens are opaque credentials. Do not infer their type,
		// validity, or length from a prefix because formats can change over time.
		const accessToken = token.trim();
		if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
		return headers;
	}
}
