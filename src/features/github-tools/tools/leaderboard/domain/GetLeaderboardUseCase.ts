import type { Leaderboard } from "./Leaderboard";
import type { LeaderboardRepository } from "./LeaderboardRepository";

export class GetLeaderboardUseCase {
	constructor(private readonly repository: LeaderboardRepository) {}

	execute(countrySlug: string, countryName?: string): Promise<Leaderboard> {
		return this.repository.getCountryLeaderboard(countrySlug, countryName);
	}
}
