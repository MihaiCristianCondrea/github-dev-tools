import type { CommitRef, RepositoryRef } from "../models/Repository";

// Owner and repository segments stop at the characters that end a GitHub path so a
// query string or fragment can never leak into the segment and, from there, into an
// API request URL.
const REPOSITORY_PATTERN = /github\.com\/([^/\s#?]+)\/([^/\s#?]+)/i;
const COMMIT_PATTERN = /github\.com\/([^/\s#?]+)\/([^/\s#?]+)\/commit\/([a-fA-F0-9]+)/i;

export default class GitHubUrlParser {
	static parseRepositoryUrl(inputUrl: string): RepositoryRef | null {
		const match = inputUrl.trim().replace(/\/$/, "").match(REPOSITORY_PATTERN);
		if (!match) return null;
		return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
	}

	static parseCommitUrl(inputUrl: string): CommitRef | null {
		const match = inputUrl.trim().replace(/\/$/, "").match(COMMIT_PATTERN);
		if (!match) return null;
		return { owner: match[1], repo: match[2].replace(/\.git$/i, ""), sha: match[3] };
	}
}
