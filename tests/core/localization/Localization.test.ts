import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
	formatEnglishPlural,
	formatMessage,
	formatOrdinal,
	localizeTemplate,
	strings,
} from "../../../src/core/localization/Localization.ts";

test("formats localized variables, plurals, and ordinals", () => {
	assert.equal(
		formatMessage(strings.favorites.removeRepository, { repository: "owner/repo" }),
		"Remove owner/repo from favorites",
	);
	assert.equal(
		formatEnglishPlural(
			1,
			strings.leaderboard.ranking.rankedDevelopers_one,
			strings.leaderboard.ranking.rankedDevelopers_other,
		),
		"1 ranked developer",
	);
	assert.equal(
		formatEnglishPlural(
			2,
			strings.leaderboard.ranking.rankedDevelopers_one,
			strings.leaderboard.ranking.rankedDevelopers_other,
		),
		"2 ranked developers",
	);
	assert.equal(formatOrdinal(1), "1st");
	assert.equal(formatOrdinal(12), "12th");
	assert.equal(formatOrdinal(23), "23rd");
});

test("resolves every localization key in the main HTML template", () => {
	const template = readFileSync("src/features/github-tools/presentation/GitHubToolsApp.html", "utf8");
	const localized = localizeTemplate(template);

	assert.equal(localized.includes("{{"), false);
	assert.match(localized, /Map repositories, inspect releases, and extract patches\./);
	assert.match(localized, /aria-label="Primary navigation"/);
	assert.match(localized, /No favorites yet/);
	assert.match(localized, /label="Global"/);
});

test("escapes localized template values before inserting them into HTML", () => {
	const localized = localizeTemplate("<p>{{githubTools.home.leaderboardDescription}}</p>");
	assert.match(localized, /username&#39;s local rank/);
});
