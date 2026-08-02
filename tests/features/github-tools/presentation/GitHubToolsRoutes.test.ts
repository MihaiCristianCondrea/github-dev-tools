import assert from "node:assert/strict";
import test from "node:test";
import {
	hashFromViewId,
	isEmptyHashRoute,
	isKnownHashRoute,
	normalizeHashRoute,
	viewIdFromHash,
	type ViewId,
} from "../../../../src/features/github-tools/presentation/GitHubToolsRoutes.ts";

const routes: ReadonlyArray<{ hash: string; viewId: ViewId }> = [
	{ hash: "#home", viewId: "home" },
	{ hash: "#repo-mapper", viewId: "mapper" },
	{ hash: "#release-stats", viewId: "releases" },
	{ hash: "#git-patch", viewId: "gitpatch" },
	{ hash: "#favorites", viewId: "favorites" },
	{ hash: "#leaderboard", viewId: "leaderboard" },
];

test("hash routes are normalized", () => {
	assert.equal(normalizeHashRoute("#release-stats"), "release-stats");
	assert.equal(normalizeHashRoute("# ReLeAsE-StAtS  "), "release-stats");
	assert.equal(normalizeHashRoute("favorites"), "favorites");
});

test("empty hash routes to home", () => {
	for (const hash of ["", "#", "#   "]) {
		assert.equal(isEmptyHashRoute(hash), true);
		assert.equal(viewIdFromHash(hash), "home");
	}
});

test("unknown hash routes to home", () => {
	for (const hash of ["#unknown", "#repo_mapper", "##home"]) {
		assert.equal(isKnownHashRoute(hash), false);
		assert.equal(viewIdFromHash(hash), "home");
	}
});

test("public hashes route to internal views", () => {
	for (const { hash, viewId } of routes) {
		assert.equal(isKnownHashRoute(hash), true);
		assert.equal(viewIdFromHash(hash), viewId);
	}
});

test("public hashes route without a leading hash", () => {
	for (const { hash, viewId } of routes) {
		assert.equal(viewIdFromHash(hash.slice(1)), viewId);
	}
});

test("public hashes are case-insensitive and ignore route whitespace", () => {
	assert.equal(isKnownHashRoute("# RePo-MaPpEr  "), true);
	assert.equal(viewIdFromHash("# RePo-MaPpEr  "), "mapper");
});

test("internal views map to canonical public hashes", () => {
	for (const { hash, viewId } of routes) {
		assert.equal(hashFromViewId(viewId), hash);
	}
});

test("every view round-trips through its canonical hash", () => {
	for (const { viewId } of routes) {
		assert.equal(viewIdFromHash(hashFromViewId(viewId)), viewId);
	}
});
