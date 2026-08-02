import type { Leaderboard } from "../domain/Leaderboard";
import type { LeaderboardRepository } from "../domain/LeaderboardRepository";

type CommittersRankingDto = {
	data_asof?: unknown;
	user?: unknown;
};

const BASE_URL = "https://committers.top/rank_only";

const parseDate = (value: unknown): Date | null => {
	if (typeof value !== "string") return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export class RemoteLeaderboardRepository implements LeaderboardRepository {
	async getCountryLeaderboard(countrySlug: string, countryName?: string): Promise<Leaderboard> {
		const safeSlug = countrySlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
		if (!safeSlug) throw new Error("A valid country is required.");

		const response = await fetch(`${BASE_URL}/${safeSlug}.json`, {
			headers: { Accept: "application/json" },
			cache: "no-store",
		});
		if (!response.ok) throw new Error(`The ${countryName ?? safeSlug} leaderboard is not available right now.`);

		const dto = await response.json() as CommittersRankingDto;
		const usernames = Array.isArray(dto.user)
			? dto.user.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
			: [];
		if (usernames.length === 0) throw new Error("The leaderboard returned no ranked users.");

		return {
			country: countryName ?? safeSlug.replaceAll("_", " "),
			countrySlug: safeSlug,
			updatedAt: parseDate(dto.data_asof),
			users: usernames.map((username, index) => ({ username, rank: index + 1 })),
		};
	}
}
