import type { Leaderboard } from "./Leaderboard";

export interface LeaderboardRepository {
	getCountryLeaderboard(countrySlug: string, countryName?: string): Promise<Leaderboard>;
}
