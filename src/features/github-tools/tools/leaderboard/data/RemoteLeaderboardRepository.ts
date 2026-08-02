import { formatMessage, strings } from "../../../../../core/localization/Localization";
import type { Leaderboard } from "../domain/Leaderboard";
import type { LeaderboardRepository } from "../domain/LeaderboardRepository";

type CommittersRankingDto = {
	data_asof?: unknown;
	user?: unknown;
};

const BASE_URL = "https://committers.top/rank_only";
const CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";

const fetchRanking = async (url: string): Promise<Response> => {
	// committers.top does not consistently send CORS headers, so use a CORS-enabled
	// passthrough first and retain the source URL as a fallback for compatible clients.
	const urls = [`${CORS_PROXY_URL}${encodeURIComponent(url)}`, url];
	let lastError: unknown;

	for (const requestUrl of urls) {
		try {
			const response = await fetch(requestUrl, {
				headers: { Accept: "application/json" },
				cache: "no-store",
			});
			if (response.ok) return response;
			lastError = new Error(formatMessage(strings.leaderboard.errors.requestStatus, { status: response.status }));
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError ?? new Error(strings.leaderboard.errors.requestFailed);
};

const parseDate = (value: unknown): Date | null => {
	if (typeof value !== "string") return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export class RemoteLeaderboardRepository implements LeaderboardRepository {
	async getCountryLeaderboard(countrySlug: string, countryName?: string): Promise<Leaderboard> {
		const safeSlug = countrySlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
		if (!safeSlug) throw new Error(strings.leaderboard.errors.countryRequired);

		let response: Response;
		try {
			response = await fetchRanking(`${BASE_URL}/${safeSlug}.json`);
		} catch {
			throw new Error(formatMessage(strings.leaderboard.errors.unavailable, { country: countryName ?? safeSlug }));
		}

		const dto = await response.json() as CommittersRankingDto;
		const usernames = Array.isArray(dto.user)
			? dto.user.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
			: [];
		if (usernames.length === 0) throw new Error(strings.leaderboard.errors.noUsers);

		return {
			country: countryName ?? safeSlug.replaceAll("_", " "),
			countrySlug: safeSlug,
			updatedAt: parseDate(dto.data_asof),
			users: usernames.map((username, index) => ({ username, rank: index + 1 })),
		};
	}
}
