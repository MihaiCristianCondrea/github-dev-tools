export type RankedUser = {
	username: string;
	rank: number;
};

export type Leaderboard = {
	country: string;
	countrySlug: string;
	updatedAt: Date | null;
	users: RankedUser[];
};
