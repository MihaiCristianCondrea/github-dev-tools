export type RepositoryRef = {
	owner: string;
	repo: string;
};

export type CommitRef = RepositoryRef & {
	sha: string;
};

export const repositoryUrl = (repository: RepositoryRef): string =>
	`https://github.com/${repository.owner}/${repository.repo}`;
