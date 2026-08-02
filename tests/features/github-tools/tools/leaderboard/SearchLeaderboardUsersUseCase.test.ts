import assert from "node:assert/strict";
import test from "node:test";
import { SearchLeaderboardUsersUseCase } from "../../../../../src/features/github-tools/tools/leaderboard/domain/SearchLeaderboardUsersUseCase.ts";
import type { Leaderboard } from "../../../../../src/features/github-tools/tools/leaderboard/domain/Leaderboard.ts";

const leaderboard: Leaderboard = {
	country: "Romania",
	countrySlug: "romania",
	updatedAt: null,
	users: ["alpha", "developer-alpha", "alphabet", "beta"].map((username, index) => ({ username, rank: index + 1 })),
};

test("returns the top users when search is empty", () => {
	const results = new SearchLeaderboardUsersUseCase().execute(leaderboard, "", 2);
	assert.deepEqual(results.map(({ username }) => username), ["alpha", "developer-alpha"]);
});

test("ranks exact, prefix, then partial username matches", () => {
	const results = new SearchLeaderboardUsersUseCase().execute(leaderboard, " ALPHA ");
	assert.deepEqual(results.map(({ username }) => username), ["alpha", "alphabet", "developer-alpha"]);
});

test("preserves the rank from the complete country dataset", () => {
	const [result] = new SearchLeaderboardUsersUseCase().execute(leaderboard, "beta");
	assert.equal(result.rank, 4);
});
