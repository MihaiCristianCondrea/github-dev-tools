import DataServices from "../../../app/DataServices";
import {
	formatMessage,
	formatNumber,
	localizeTemplate,
	strings,
} from "../../../core/localization/Localization";
import type { AppShowcaseSection } from "../../app-showcase/presentation/AppShowcaseSection";
import "../../app-showcase/presentation/AppShowcaseSection";
import "../../../core/components/ParticleNetworkBackground";
import type { RepositoryRef } from "../core/models/Repository";
import type { FavoriteRepository } from "../../favorites/domain/models/FavoriteRepository";
import { FavoritesView } from "../../favorites/presentation/FavoritesView";
import { repositoryUrl } from "../core/models/Repository";
import { ToolFeedbackView } from "../core/components/ToolFeedbackView";
import type { PatchFile } from "../tools/git-patch/domain/PatchFile";
import { GitPatchView } from "../tools/git-patch/presentation/GitPatchView";
import type { ReleaseStats } from "../tools/release-stats/domain/ReleaseStats";
import { ReleaseStatsView } from "../tools/release-stats/presentation/ReleaseStatsView";
import type { RepositoryMapFormat, RepositoryMapResult, RepositoryTreeItem } from "../tools/repo-mapper/domain/RepositoryTree";
import { RepoMapperView } from "../tools/repo-mapper/presentation/RepoMapperView";
import GitHubUrlParser from "../core/services/GitHubUrlParser";
import RepositoryMapBuilder from "../tools/repo-mapper/domain/RepositoryMapBuilder";
import { BrowserCountryLocator } from "../tools/leaderboard/data/BrowserCountryLocator";
import { LeaderboardController } from "../tools/leaderboard/presentation/LeaderboardController";
import { hashFromViewId, isEmptyHashRoute, isKnownHashRoute, viewIdFromHash, type ViewId } from "./GitHubToolsRoutes";
import { ThemeController, type ThemePreference } from "../../../core/theme/ThemeController";
import WebComponent from "../../../core/webcomponents/WebComponent";
import css from "./GitHubToolsApp.scss?raw";
import html from "./GitHubToolsApp.html?raw";

type NavigationDrawerElement = HTMLElement & { opened: boolean };
type RepositoryToolId = "mapper" | "releases";

const VIEW_TITLES: Record<ViewId, string> = {
	home: strings.common.navigation.home,
	favorites: strings.common.navigation.favorites,
	mapper: strings.common.navigation.repoMapper,
	releases: strings.common.navigation.releaseStats,
	gitpatch: strings.common.navigation.gitPatch,
	leaderboard: strings.common.navigation.leaderboard,
};

// Every piece of view state the app renders from lives here. The DOM reflects this
// object; it is never read back as the source of truth.
type AppState = {
	currentView: ViewId;
	favorites: FavoriteRepository[];
	tokenPanels: Record<RepositoryToolId, boolean>;
	mapper: {
		format: RepositoryMapFormat;
		rawPaths: RepositoryTreeItem[];
		parsedRepo: RepositoryRef | null;
		outputs: Partial<Record<RepositoryMapFormat, RepositoryMapResult>>;
	};
	releases: {
		data: ReleaseStats | null;
		selectedIndex: number;
		parsedRepo: RepositoryRef | null;
	};
	patch: PatchFile;
};

export default class GitHubToolsApp extends WebComponent {
	private readonly favoritesView = new FavoritesView();
	private feedback!: ToolFeedbackView;
	private leaderboard!: LeaderboardController;
	private mapperView!: RepoMapperView;
	private releasesView!: ReleaseStatsView;
	private patchView!: GitPatchView;
	private pendingActions = new Set<"mapper" | "releases" | "patch">();
	private readonly theme = new ThemeController();
	private readonly handleHashChange = (): void => this.activateViewFromHash();

	private state: AppState = {
		currentView: "home",
		favorites: [],
		tokenPanels: { mapper: false, releases: false },
		mapper: {
			format: "ascii",
			rawPaths: [],
			parsedRepo: null,
			outputs: {},
		},
		releases: {
			data: null,
			selectedIndex: 0,
			parsedRepo: null,
		},
		patch: {
			content: "",
			filename: "git.patch",
		},
	};

	constructor() {
		super(localizeTemplate(html), css);
	}

	get htmlTagName(): string {
		return "github-tools-app";
	}

	onConnected(): void {
		const root = this.shadowRoot!;
		this.feedback = new ToolFeedbackView(root);
		this.leaderboard = new LeaderboardController(root, {
			getLeaderboard: DataServices.leaderboard,
			searchUsers: DataServices.searchLeaderboard,
			countryLocator: new BrowserCountryLocator(),
		});
		this.mapperView = new RepoMapperView(root);
		this.releasesView = new ReleaseStatsView(root, (index) => this.selectRelease(index));
		this.patchView = new GitPatchView(root);

		this.loadFavorites();
		this.theme.subscribe((theme, preference) => this.renderTheme(theme, preference));
		this.theme.start();
		this.bindNavigation();
		this.bindForms();
		this.bindFavorites();
		this.bindRepositoryMapFormatControls();
		this.bindPatchActions();
		this.leaderboard.bind();
		this.bindThemeOptions();
		this.configureAppShowcase();
		this.bindSubmitButtonFallbacks();
		this.renderFavorites();
		this.renderHomeFavorites();
		window.addEventListener("hashchange", this.handleHashChange);
		this.restoreInitialView();
	}

	onDisconnected(): void {
		this.leaderboard.dispose();
		window.removeEventListener("hashchange", this.handleHashChange);
		this.theme.stop();
	}

	private configureAppShowcase(): void {
		this.select<AppShowcaseSection>("#app-showcase")?.configure(DataServices.promotedApps);
	}

	private bindSubmitButtonFallbacks(): void {
		const bindings: Array<[string, string]> = [
			["#mapper-submit", "#mapper-form"],
			["#releases-submit", "#releases-form"],
			["#patch-submit", "#patch-form"],
		];

		bindings.forEach(([buttonSelector, formSelector]) => {
			this.select(buttonSelector)?.addEventListener("click", (event) => {
				const button = event.currentTarget as HTMLElement;
				if (button.hasAttribute("disabled")) return;
				this.select<HTMLFormElement>(formSelector)?.requestSubmit();
			});
		});
	}

	private bindNavigation(): void {
		this.select("#drawer-open")?.addEventListener("click", () => this.toggleDrawer());
		this.select("#drawer-close")?.addEventListener("click", () => this.toggleDrawer(false));
		this.select<NavigationDrawerElement>("#drawer")?.addEventListener("navigation-drawer-changed", (event) =>
			this.syncDrawerState((event as CustomEvent<{ opened: boolean }>).detail.opened)
		);
		this.selectAll<HTMLElement>(".nav-item[data-view], .tool-card[data-view]").forEach((button) => {
			const activate = () => this.navigateTo(button.dataset.view as ViewId);
			button.addEventListener("click", activate);
			button.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				activate();
			});
		});
	}

	private bindThemeOptions(): void {
		this.selectAll<HTMLElement>("[data-theme-option]").forEach((button) => {
			button.addEventListener("click", () => {
				const preference = button.dataset.themeOption;
				if (preference === "light" || preference === "dark" || preference === "system") {
					this.theme.apply(preference);
				}
			});
		});
	}

	private renderTheme(theme: "light" | "dark", preference: ThemePreference): void {
		this.dataset.theme = theme;
		this.style.colorScheme = theme;
		this.selectAll<HTMLElement>("[data-theme-option]").forEach((button) => {
			const isActive = button.dataset.themeOption === preference;
			button.toggleAttribute("data-active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});
	}

	private bindForms(): void {
		this.select<HTMLFormElement>("#mapper-form")?.addEventListener("submit", (event) => void this.handleMapperSubmit(event));
		this.select<HTMLFormElement>("#releases-form")?.addEventListener("submit", (event) => void this.handleReleasesSubmit(event));
		this.select<HTMLFormElement>("#patch-form")?.addEventListener("submit", (event) => void this.handlePatchSubmit(event));
		this.select<HTMLInputElement>("#mapper-url")?.addEventListener("input", () => this.handleUrlInput("mapper"));
		this.select<HTMLInputElement>("#releases-url")?.addEventListener("input", () => this.handleUrlInput("releases"));
		this.selectAll<HTMLButtonElement>("[data-token-toggle]").forEach((button) => {
			button.addEventListener("click", () => this.toggleToken(button.dataset.tokenToggle as RepositoryToolId));
		});
	}

	private bindFavorites(): void {
		this.select("#mapper-fav-btn")?.addEventListener("click", () => this.toggleFavoriteCurrent("mapper"));
		this.select("#releases-fav-btn")?.addEventListener("click", () => this.toggleFavoriteCurrent("releases"));
	}

	private bindRepositoryMapFormatControls(): void {
		this.select(".segmented")?.addEventListener("segmented-button-set-selection", (event) => {
			const { button, selected } = (event as CustomEvent<{ button: HTMLElement; selected: boolean }>).detail;
			const format = button.dataset.format;
			if (!selected || (format !== "ascii" && format !== "paths")) return;
			this.setRepositoryMapFormat(format, false);
		});
		this.select("#mapper-copy-btn")?.addEventListener("click", () => void this.copyMapperOutput());
	}

	private bindPatchActions(): void {
		this.select("#patch-copy-btn")?.addEventListener("click", () => void this.copyPatchOutput());
		this.select("#patch-download-btn")?.addEventListener("click", () => this.downloadPatch());
	}

	private toggleDrawer(forceOpen?: boolean): void {
		const drawer = this.select<NavigationDrawerElement>("#drawer");
		if (!drawer) return;
		const isOpen = forceOpen ?? !drawer.opened;
		drawer.opened = isOpen;
		this.syncDrawerState(isOpen);
	}

	private syncDrawerState(isOpen: boolean): void {
		const drawerLayer = this.select("#drawer-layer");
		drawerLayer?.classList.toggle("open", isOpen);
		drawerLayer?.setAttribute("aria-hidden", String(!isOpen));

		this.select("#drawer-open")?.setAttribute("aria-expanded", String(isOpen));
		this.select("#drawer-open")?.setAttribute("aria-label", isOpen
			? strings.common.navigation.closeMenu
			: strings.common.navigation.openMenu);
		const triggerIcon = this.select("#drawer-open-icon");
		if (triggerIcon) triggerIcon.textContent = isOpen ? "menu_open" : "menu";
	}

	private restoreInitialView(): void {
		if (isEmptyHashRoute(window.location.hash) || !isKnownHashRoute(window.location.hash)) {
			// An unknown route is replaced so a reload or a shared link resolves the same
			// way it did here. A first visit keeps its clean URL until the user navigates.
			if (!isEmptyHashRoute(window.location.hash)) {
				window.history.replaceState(null, "", hashFromViewId("home"));
			}
			this.activateView("home", undefined, false);
			return;
		}

		this.activateViewFromHash(false);
	}

	private activateViewFromHash(closeDrawer = true): void {
		this.activateView(viewIdFromHash(window.location.hash), undefined, closeDrawer);
	}

	// The hash is the single source of truth for the active view: writing it lets the
	// hashchange handler perform the activation exactly once.
	private navigateTo(viewId: ViewId, url?: string): void {
		if (url) this.presetToolUrl(viewId, url);
		const nextHash = hashFromViewId(viewId);
		if (window.location.hash === nextHash) {
			this.activateView(viewId, url);
			return;
		}
		window.location.hash = nextHash;
	}

	private presetToolUrl(viewId: ViewId, url: string): void {
		if (viewId !== "mapper" && viewId !== "releases") return;
		const input = this.select<HTMLInputElement>(`#${viewId}-url`);
		if (!input) return;
		input.value = url;
		this.handleUrlInput(viewId);
	}

	private activateView(viewId: ViewId, url?: string, closeDrawer = true): void {
		this.state.currentView = viewId;
		this.selectAll(".view-section").forEach((section) => section.classList.remove("active"));
		this.select(`#view-${viewId}`)?.classList.add("active");

		this.selectAll(".nav-item").forEach((item) => {
			item.toggleAttribute("data-active", false);
			item.removeAttribute("aria-current");
			item.querySelector("md-icon, .material-symbols-outlined")?.classList.remove("filled-icon");
		});
		const activeNav = this.select(`#nav-${viewId}`);
		activeNav?.toggleAttribute("data-active", true);
		activeNav?.setAttribute("aria-current", "page");
		activeNav?.querySelector("md-icon, .material-symbols-outlined")?.classList.add("filled-icon");
		const topbarTitle = this.select("#topbar-title");
		if (topbarTitle) topbarTitle.textContent = VIEW_TITLES[viewId];
		if (url) this.presetToolUrl(viewId, url);
		if (viewId === "leaderboard") this.leaderboard.activate();
		if (closeDrawer) this.toggleDrawer(false);
	}

	private loadFavorites(): void {
		this.state.favorites = DataServices.favorites.load();
	}

	private saveFavorites(): void {
		const saved = DataServices.favorites.save(this.state.favorites);
		this.renderFavorites();
		this.renderHomeFavorites();
		if (this.state.currentView === "mapper") this.handleUrlInput("mapper");
		if (this.state.currentView === "releases") this.handleUrlInput("releases");
		if (saved) {
			this.feedback.hideError("favorites");
			return;
		}
		// Favorites are toggled from three different screens; report the failure on the
		// one the user is looking at.
		const scope = this.state.currentView === "mapper" || this.state.currentView === "releases"
			? this.state.currentView
			: "favorites";
		this.feedback.showError(scope, strings.favorites.saveFailed);
	}

	private isFavorite(repository: RepositoryRef): boolean {
		return DataServices.favorites.isFavorite(this.state.favorites, repository);
	}

	private toggleFavoriteCurrent(view: RepositoryToolId): void {
		const parsed = view === "mapper" ? this.state.mapper.parsedRepo : this.state.releases.parsedRepo;
		if (!parsed) return;

		this.state.favorites = DataServices.favorites.toggle(this.state.favorites, parsed);
		this.saveFavorites();
	}

	private renderFavorites(): void {
		const grid = this.select("#favorites-grid");
		const empty = this.select("#favorites-empty");
		if (!grid || !empty) return;

		this.favoritesView.renderGrid(grid, empty, this.state.favorites, {
			remove: (favorite) => {
				this.state.favorites = this.state.favorites.filter((item) => !DataServices.favorites.isFavorite([item], favorite));
				this.saveFavorites();
			},
			openMapper: (favorite) => this.navigateTo("mapper", repositoryUrl(favorite)),
			openStats: (favorite) => this.navigateTo("releases", repositoryUrl(favorite))
		});
	}

	private renderHomeFavorites(): void {
		const section = this.select("#home-favorites-section");
		const list = this.select("#home-favorites-list");
		if (!section || !list) return;

		this.favoritesView.renderHome(
			section,
			list,
			this.state.favorites,
			(favorite) => this.navigateTo("releases", repositoryUrl(favorite)),
			() => this.navigateTo("favorites")
		);
	}

	private handleUrlInput(view: RepositoryToolId): void {
		const input = this.select<HTMLInputElement>(`#${view}-url`);
		if (!input) return;
		const parsed = GitHubUrlParser.parseRepositoryUrl(input.value);

		if (view === "mapper") this.state.mapper.parsedRepo = parsed;
		if (view === "releases") this.state.releases.parsedRepo = parsed;

		this.updateFavoriteButton(view, parsed);
	}

	private updateFavoriteButton(view: RepositoryToolId, parsed: RepositoryRef | null): void {
		const button = this.select<HTMLElement>(`#${view}-fav-btn`);
		if (!button) return;

		const active = !!parsed && this.isFavorite(parsed);
		button.toggleAttribute("disabled", !parsed);
		button.toggleAttribute("selected", active);
		button.setAttribute("aria-label", active
			? strings.githubTools.shared.removeFavorite
			: strings.githubTools.shared.addFavorite);
	}

	private toggleToken(view: RepositoryToolId): void {
		const button = this.select<HTMLElement>(`[data-token-toggle="${view}"]`);
		const panel = this.select<HTMLElement>(`#${view}-token-panel`);
		const label = this.select<HTMLElement>(`#${view}-token-label`);

		if (!button || !panel || !label) return;

		const shouldShow = !this.state.tokenPanels[view];
		this.state.tokenPanels[view] = shouldShow;

		panel.classList.toggle("open", shouldShow);
		panel.setAttribute("aria-hidden", String(!shouldShow));

		button.setAttribute("aria-expanded", String(shouldShow));
		button.classList.toggle("is-expanded", shouldShow);
		label.textContent = shouldShow
			? strings.githubTools.shared.hideSettings
			: strings.githubTools.shared.tokenSettings;
	}

	private setRepositoryMapFormat(format: RepositoryMapFormat, syncControl = true): void {
		this.state.mapper.format = format;
		if (syncControl) this.mapperView.setFormatControl(format);
		if (this.state.mapper.rawPaths.length > 0) this.renderMapperOutput();
	}

	private async handleMapperSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("mapper")) return;
		const url = this.select<HTMLInputElement>("#mapper-url")?.value ?? "";
		const token = this.select<HTMLInputElement>("#mapper-token")?.value ?? "";
		const parsed = GitHubUrlParser.parseRepositoryUrl(url);

		this.feedback.hideError("mapper");
		this.mapperView.setResultVisible(false);
		const resetButton = this.feedback.setLoading("#mapper-submit", strings.githubTools.shared.processing);

		if (!parsed) {
			this.feedback.showError("mapper", strings.githubTools.shared.invalidGitHubUrl);
			resetButton();
			this.finishPendingAction("mapper");
			return;
		}

		try {
			const tree = await DataServices.github.getRepositoryTree(parsed, token);
			this.state.mapper.rawPaths = tree.items;
			this.state.mapper.outputs = {};
			this.renderMapperOutput();
			this.mapperView.setResultVisible(true);
			if (tree.truncated) this.feedback.showError("mapper", strings.githubTools.mapper.truncated);
		} catch (error) {
			this.feedback.showError("mapper", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("mapper");
		}
	}

	private renderMapperOutput(): void {
		const { format, outputs, rawPaths } = this.state.mapper;
		const result = outputs[format] ?? RepositoryMapBuilder.build(rawPaths, format);
		outputs[format] = result;
		this.mapperView.renderOutput(result);
	}

	private async handleReleasesSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("releases")) return;
		const url = this.select<HTMLInputElement>("#releases-url")?.value ?? "";
		const token = this.select<HTMLInputElement>("#releases-token")?.value ?? "";
		const parsed = GitHubUrlParser.parseRepositoryUrl(url);

		this.feedback.hideError("releases");
		this.releasesView.setResultVisible(false);
		const resetButton = this.feedback.setLoading("#releases-submit", strings.githubTools.shared.processing);

		if (!parsed) {
			this.feedback.showError("releases", strings.githubTools.shared.invalidGitHubUrl);
			resetButton();
			this.finishPendingAction("releases");
			return;
		}

		try {
			const stats = await DataServices.github.getReleaseStats(parsed, token);
			this.state.releases.data = stats;
			this.state.releases.selectedIndex = 0;
			this.releasesView.render(stats, 0);
			this.releasesView.setResultVisible(true);
			if (stats.truncated) {
				this.feedback.showError("releases", formatMessage(strings.githubTools.releases.truncated, {
					count: formatNumber(stats.releases.length),
				}));
			}
		} catch (error) {
			this.feedback.showError("releases", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("releases");
		}
	}

	private selectRelease(index: number): void {
		const stats = this.state.releases.data;
		if (!stats || !stats.releases[index]) return;
		this.state.releases.selectedIndex = index;
		this.releasesView.syncSelection(index);
		this.releasesView.renderDetails(stats, index);
	}

	private async handlePatchSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("patch")) return;
		const url = this.select<HTMLInputElement>("#patch-url")?.value ?? "";
		const parsed = GitHubUrlParser.parseCommitUrl(url);

		this.feedback.hideError("patch");
		this.patchView.setResultVisible(false);
		const resetButton = this.feedback.setLoading("#patch-submit", strings.githubTools.patch.fetching);

		if (!parsed) {
			this.feedback.showError("patch", strings.githubTools.patch.invalidCommitUrl);
			resetButton();
			this.finishPendingAction("patch");
			return;
		}

		try {
			this.state.patch = await DataServices.github.getCommitPatch(parsed);
			this.patchView.renderPatch(this.state.patch.content);
			this.patchView.setResultVisible(true);
		} catch (error) {
			this.feedback.showError("patch", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("patch");
		}
	}

	private async copyMapperOutput(): Promise<void> {
		const copied = await this.feedback.copyToClipboard(this.mapperView.outputText(), "#mapper-copy-btn");
		if (!copied) this.feedback.showError("mapper", strings.githubTools.shared.copyFailed);
	}

	private async copyPatchOutput(): Promise<void> {
		const copied = await this.feedback.copyToClipboard(this.state.patch.content, "#patch-copy-btn");
		if (!copied) this.feedback.showError("patch", strings.githubTools.shared.copyFailed);
	}

	private downloadPatch(): void {
		if (!this.state.patch.content) return;
		const blob = new Blob([this.state.patch.content], { type: "text/plain" });
		const href = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = href;
		link.download = this.state.patch.filename || "git.patch";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(href);
	}

	private startPendingAction(action: "mapper" | "releases" | "patch"): boolean {
		if (this.pendingActions.has(action)) return false;
		this.pendingActions.add(action);
		return true;
	}

	private finishPendingAction(action: "mapper" | "releases" | "patch"): void {
		this.pendingActions.delete(action);
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : strings.githubTools.shared.somethingWentWrong;
	}
}
