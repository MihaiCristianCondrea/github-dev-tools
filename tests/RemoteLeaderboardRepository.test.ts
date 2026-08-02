import assert from "node:assert/strict";
import test from "node:test";
import { RemoteLeaderboardRepository } from "../src/features/github-tools/tools/leaderboard/data/RemoteLeaderboardRepository.ts";

test("falls back when a leaderboard proxy returns an HTML error page", async () => {
	const originalFetch = globalThis.fetch;
	const requestedUrls: string[] = [];
	globalThis.fetch = async (input) => {
		requestedUrls.push(String(input));
		if (requestedUrls.length === 1) {
			return new Response("<!DOCTYPE html><title>Proxy error</title>", {
				status: 200,
				headers: { "content-type": "text/html" },
			});
		}
		return Response.json({ data_asof: "2026-08-01", user: ["octocat", "hubot"] });
	};

	try {
		const leaderboard = await new RemoteLeaderboardRepository().getCountryLeaderboard("global", "Global");
		assert.equal(requestedUrls.length, 2);
		assert.deepEqual(leaderboard.users, [
			{ username: "octocat", rank: 1 },
			{ username: "hubot", rank: 2 },
		]);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("reports a friendly error when every leaderboard source is blocked", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };

	try {
		await assert.rejects(
			() => new RemoteLeaderboardRepository().getCountryLeaderboard("romania", "Romania"),
			{ message: "The Romania leaderboard is not available right now." },
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
