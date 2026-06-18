import assert from "node:assert/strict";
import test from "node:test";
import { hashFromViewId, isEmptyHashRoute, isKnownHashRoute, viewIdFromHash } from "../src/features/github-tools/presentation/GitHubToolsRoutes.ts";

test("empty hash routes to home", () => {
	assert.equal(isEmptyHashRoute(""), true);
	assert.equal(viewIdFromHash(""), "home");
});

test("unknown hash routes to home", () => {
	assert.equal(isKnownHashRoute("#unknown"), false);
	assert.equal(viewIdFromHash("#unknown"), "home");
});

test("public hashes route to internal views", () => {
	assert.equal(viewIdFromHash("#repo-mapper"), "mapper");
	assert.equal(viewIdFromHash("#release-stats"), "releases");
	assert.equal(viewIdFromHash("#git-patch"), "gitpatch");
	assert.equal(viewIdFromHash("#favorites"), "favorites");
});

test("internal views map to canonical public hashes", () => {
	assert.equal(hashFromViewId("home"), "#home");
	assert.equal(hashFromViewId("mapper"), "#repo-mapper");
	assert.equal(hashFromViewId("releases"), "#release-stats");
	assert.equal(hashFromViewId("gitpatch"), "#git-patch");
	assert.equal(hashFromViewId("favorites"), "#favorites");
});
