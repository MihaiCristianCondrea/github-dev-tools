import type { Leaderboard, RankedUser } from "./Leaderboard";

export class SearchLeaderboardUsersUseCase {
	execute(leaderboard: Leaderboard, rawQuery: string, limit = 20): RankedUser[] {
		const query = rawQuery.trim().toLocaleLowerCase();
		if (!query) return leaderboard.users.slice(0, limit);

		const exact: RankedUser[] = [];
		const prefix: RankedUser[] = [];
		const partial: RankedUser[] = [];
		for (const user of leaderboard.users) {
			const username = user.username.toLocaleLowerCase();
			if (username === query) exact.push(user);
			else if (username.startsWith(query)) prefix.push(user);
			else if (username.includes(query)) partial.push(user);
		}
		return exact.concat(prefix, partial).slice(0, Math.max(0, limit));
	}
}
