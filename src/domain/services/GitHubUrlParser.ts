import type { CommitRef, RepositoryRef } from "../models/Repository";

export default class GitHubUrlParser {
	static parseRepositoryUrl(inputUrl: string): RepositoryRef | null {
		const match = inputUrl.trim().replace(/\/$/, "").match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
		if (!match) return null;
		return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
	}

	static parseCommitUrl(inputUrl: string): CommitRef | null {
		const cleanUrl = inputUrl.trim().replace(/\/$/, "");
		const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/commit\/([a-fA-F0-9]+)/);
		if (!match) return null;
		return { owner: match[1], repo: match[2].replace(/\.git$/i, ""), sha: match[3] };
	}
}
