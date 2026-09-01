import assert from "node:assert/strict";
import test from "node:test";
import GitHubUrlParser from "../../../../src/features/github-tools/core/services/GitHubUrlParser.ts";

test("parses owner and repository from the usual repository URL shapes", () => {
	assert.deepEqual(GitHubUrlParser.parseRepositoryUrl("https://github.com/octocat/hello-world"), { owner: "octocat", repo: "hello-world" });
	assert.deepEqual(GitHubUrlParser.parseRepositoryUrl("  github.com/octocat/hello-world/  "), { owner: "octocat", repo: "hello-world" });
	assert.deepEqual(GitHubUrlParser.parseRepositoryUrl("https://github.com/octocat/hello-world.git"), { owner: "octocat", repo: "hello-world" });
	assert.deepEqual(GitHubUrlParser.parseRepositoryUrl("https://github.com/octocat/hello-world/tree/main/src"), { owner: "octocat", repo: "hello-world" });
	assert.equal(GitHubUrlParser.parseRepositoryUrl("https://example.com/octocat/hello-world"), null);
});

test("stops the owner segment at a query string or fragment", () => {
	assert.equal(GitHubUrlParser.parseRepositoryUrl("https://github.com/a?b/c"), null);
	assert.equal(GitHubUrlParser.parseRepositoryUrl("https://github.com/a#b/c"), null);
	assert.deepEqual(GitHubUrlParser.parseRepositoryUrl("https://github.com/octocat/hello-world?tab=readme"), { owner: "octocat", repo: "hello-world" });
});

test("parses commit URLs and rejects non-commit paths", () => {
	assert.deepEqual(
		GitHubUrlParser.parseCommitUrl("https://github.com/octocat/hello-world/commit/abc1234"),
		{ owner: "octocat", repo: "hello-world", sha: "abc1234" }
	);
	assert.equal(GitHubUrlParser.parseCommitUrl("https://github.com/octocat/hello-world"), null);
	assert.equal(GitHubUrlParser.parseCommitUrl("https://github.com/octocat/hello-world/commit/not-a-sha"), null);
});
