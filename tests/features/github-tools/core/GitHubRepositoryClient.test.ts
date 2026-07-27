import assert from "node:assert/strict";
import test from "node:test";
import GitHubRepositoryClient from "../../../../src/features/github-tools/core/services/GitHubRepositoryClient.ts";

const repository = { owner: "octocat", repo: "private-repo" };

test("sends a trimmed bearer token and API version for repository requests", async (context) => {
	const requests: Array<{ url: string; headers: Headers }> = [];
	context.mock.method(globalThis, "fetch", async (input, init) => {
		requests.push({ url: String(input), headers: new Headers(init?.headers) });
		const body = requests.length % 2 === 1 ? { default_branch: "main" } : { tree: [], truncated: false };
		return Response.json(body);
	});

	const client = new GitHubRepositoryClient();
	await client.getRepositoryTree(repository, "  github_pat_secret  ");
	await client.getRepositoryTree(repository, "  github_pat_secret  ");

	assert.equal(requests.length, 4, "authenticated private responses must not be retained in the cache");
	for (const request of requests) {
		assert.equal(request.headers.get("Authorization"), "Bearer github_pat_secret");
		assert.equal(request.headers.get("X-GitHub-Api-Version"), "2022-11-28");
	}
});

test("does not send an authorization header without a token", async (context) => {
	let headers = new Headers();
	context.mock.method(globalThis, "fetch", async (_input, init) => {
		headers = new Headers(init?.headers);
		return Response.json([]);
	});

	await assert.rejects(new GitHubRepositoryClient().getReleaseStats(repository), /No releases found/);
	assert.equal(headers.get("Authorization"), null);
});

test("explains private repository and token permission failures", async (context) => {
	context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
	await assert.rejects(
		new GitHubRepositoryClient().getRepositoryTree(repository),
		/private, provide a token with access to this repository/
	);

	context.mock.restoreAll();
	context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 403 }));
	await assert.rejects(
		new GitHubRepositoryClient().getReleaseStats(repository, "github_pat_secret"),
		/repository access, permissions, organization approval, and SSO authorization/
	);
});
