export type ViewId = "home" | "favorites" | "mapper" | "releases" | "gitpatch";

const defaultViewId: ViewId = "home";

const routeToViewId = {
	"home": "home",
	"repo-mapper": "mapper",
	"release-stats": "releases",
	"git-patch": "gitpatch",
	"favorites": "favorites",
} as const;

const viewIdToRoute = {
	home: "home",
	mapper: "repo-mapper",
	releases: "release-stats",
	gitpatch: "git-patch",
	favorites: "favorites",
} as const;

export const normalizeHashRoute = (hash: string): string => hash.replace(/^#/, "").trim().toLowerCase();

export const isKnownHashRoute = (hash: string): boolean => normalizeHashRoute(hash) in routeToViewId;

export const isEmptyHashRoute = (hash: string): boolean => normalizeHashRoute(hash) === "";

export const viewIdFromHash = (hash: string): ViewId => {
	const route = normalizeHashRoute(hash);
	return route in routeToViewId ? routeToViewId[route as keyof typeof routeToViewId] : defaultViewId;
};

export const hashFromViewId = (viewId: ViewId): string => `#${viewIdToRoute[viewId]}`;
