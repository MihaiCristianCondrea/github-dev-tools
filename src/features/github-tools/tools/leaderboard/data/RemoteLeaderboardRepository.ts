import { formatMessage, strings } from "../../../../../core/localization/Localization.ts";
import type { Leaderboard } from "../domain/Leaderboard";
import type { LeaderboardRepository } from "../domain/LeaderboardRepository";

type CommittersRankingDto = {
	data_asof?: unknown;
	user?: unknown;
};

const BASE_URL = "https://committers.top/rank_only";
const CORS_PROXY_URLS = [
	"https://api.allorigins.win/raw?url=",
	"https://corsproxy.io/?url=",
];

const isRanking = (value: unknown): value is CommittersRankingDto => {
	if (!value || typeof value !== "object") return false;
	return Array.isArray((value as CommittersRankingDto).user);
};

const fetchRanking = async (url: string): Promise<CommittersRankingDto> => {
	// committers.top does not consistently send CORS headers, so use a CORS-enabled
	// passthrough first and retain the source URL as a fallback for compatible clients.
	const urls = [...CORS_PROXY_URLS.map((proxy) => `${proxy}${encodeURIComponent(url)}`), url];
	let lastError: unknown;

	for (const requestUrl of urls) {
		try {
			const response = await fetch(requestUrl, {
				headers: { Accept: "application/json" },
				cache: "no-store",
			});
			if (!response.ok) {
				lastError = new Error(formatMessage(strings.leaderboard.errors.requestStatus, { status: response.status }));
				continue;
			}

			// Some proxies return an HTML error document with a successful status. Parse
			// defensively here so the next source can be tried instead of leaking a JSON
			// parser error into the UI.
			const contentType = response.headers.get("content-type") ?? "";
			const body = await response.text();
			if (!contentType.toLowerCase().includes("json") && body.trimStart().startsWith("<")) {
				lastError = new Error(strings.leaderboard.errors.htmlResponse);
				continue;
			}
			const parsed: unknown = JSON.parse(body);
			if (isRanking(parsed)) return parsed;
			lastError = new Error(strings.leaderboard.errors.invalidRanking);
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

		let dto: CommittersRankingDto;
		try {
			dto = await fetchRanking(`${BASE_URL}/${safeSlug}.json`);
		} catch {
			throw new Error(formatMessage(strings.leaderboard.errors.unavailable, { country: countryName ?? safeSlug }));
		}

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
