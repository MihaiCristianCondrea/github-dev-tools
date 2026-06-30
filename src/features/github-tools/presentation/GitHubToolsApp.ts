import DataServices from "../../../app/DataServices";
import type { AppShowcaseSection } from "../../app-showcase/presentation/AppShowcaseSection";
import "../../app-showcase/presentation/AppShowcaseSection";
import "../core/components/ParticleNetworkBackground";
import type { FavoriteRepository, RepositoryRef } from "../core/models/Repository";
import { repositoryUrl } from "../core/models/Repository";
import type { PatchFile } from "../tools/git-patch/domain/PatchFile";
import type { ProcessedRelease, ReleaseAsset, ReleaseStats } from "../tools/release-stats/domain/ReleaseStats";
import type { RepositoryMapFormat, RepositoryMapResult, RepositoryTreeItem } from "../tools/repo-mapper/domain/RepositoryTree";
import GitHubUrlParser from "../core/services/GitHubUrlParser";
import RepositoryMapBuilder from "../tools/repo-mapper/domain/RepositoryMapBuilder";
import { hashFromViewId, isEmptyHashRoute, isKnownHashRoute, viewIdFromHash, type ViewId } from "./GitHubToolsRoutes";
import WebComponent from "../../../core/webcomponents/WebComponent";
import css from "./GitHubToolsApp.scss?raw";
import html from "./GitHubToolsApp.html?raw";

type NavigationDrawerElement = HTMLElement & { opened: boolean };
type SegmentedButtonSetElement = HTMLElement & { setButtonSelected(index: number, selected: boolean): void };
type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "github_tools_theme";

const VIEW_TITLES: Record<ViewId, string> = {
	home: "Home",
	favorites: "Favorites",
	mapper: "Repo Mapper",
	releases: "Release Stats",
	gitpatch: "Git Patch",
};


type AppState = {
	currentView: ViewId;
	favorites: FavoriteRepository[];
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
	private pendingActions = new Set<"mapper" | "releases" | "patch">();
	private readonly handleHashChange = (): void => this.activateViewFromHash();
	private readonly handleSystemThemeChange = (): void => this.applyTheme(this.getThemePreference(), false);

	private state: AppState = {
		currentView: "home",
		favorites: [],
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
		super(html, css);
	}

	get htmlTagName(): string {
		return "github-tools-app";
	}

	onConnected(): void {
		this.loadFavorites();
		this.applyTheme(this.getThemePreference(), false);
		this.bindNavigation();
		this.bindForms();
		this.bindFavorites();
		this.bindRepositoryMapFormatControls();
		this.bindPatchActions();
		this.bindThemeOptions();
		this.configureAppShowcase();
		this.bindSubmitButtonFallbacks();
		this.renderFavorites();
		this.renderHomeFavorites();
		window.addEventListener("hashchange", this.handleHashChange);
		window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.handleSystemThemeChange);
		this.restoreInitialView();
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
			const activate = () => {
				const view = button.dataset.view as ViewId;
				this.navigateTo(view);
			};
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
				const theme = button.dataset.themeOption;
				if (theme === "light" || theme === "dark" || theme === "system") this.applyTheme(theme);
			});
		});
	}

	private getThemePreference(): ThemePreference {
		const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
		return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
	}

	private applyTheme(theme: ThemePreference, persist = true): void {
		if (persist) window.localStorage.setItem(THEME_STORAGE_KEY, theme);

		const effectiveTheme = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
		this.dataset.theme = effectiveTheme;
		this.style.colorScheme = effectiveTheme;
		this.selectAll<HTMLElement>("[data-theme-option]").forEach((button) => {
			const isActive = button.dataset.themeOption === theme;
			button.toggleAttribute("data-active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});
	}

	private bindForms(): void {
		this.select<HTMLFormElement>("#mapper-form")?.addEventListener("submit", (event) => this.handleMapperSubmit(event));
		this.select<HTMLFormElement>("#releases-form")?.addEventListener("submit", (event) => this.handleReleasesSubmit(event));
		this.select<HTMLFormElement>("#patch-form")?.addEventListener("submit", (event) => this.handlePatchSubmit(event));
		this.select<HTMLInputElement>("#mapper-url")?.addEventListener("input", () => this.handleUrlInput("mapper"));
		this.select<HTMLInputElement>("#releases-url")?.addEventListener("input", () => this.handleUrlInput("releases"));
		this.selectAll<HTMLButtonElement>("[data-token-toggle]").forEach((button) => {
			button.addEventListener("click", () => this.toggleToken(button.dataset.tokenToggle as "mapper" | "releases"));
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
		this.select("#mapper-copy-btn")?.addEventListener("click", () => this.copyMapperOutput());
	}

	private bindPatchActions(): void {
		this.select("#patch-copy-btn")?.addEventListener("click", () => this.copyPatchOutput());
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
		this.select("#drawer-open")?.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
		const triggerIcon = this.select("#drawer-open-icon");
		if (triggerIcon) triggerIcon.textContent = isOpen ? "menu_open" : "menu";
	}

	disconnectedCallback(): void {
		window.removeEventListener("hashchange", this.handleHashChange);
		window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", this.handleSystemThemeChange);
	}

	private restoreInitialView(): void {
		if (isEmptyHashRoute(window.location.hash) || !isKnownHashRoute(window.location.hash)) {
			this.activateView("home", undefined, false);
			return;
		}

		this.activateViewFromHash(false);
	}

	private activateViewFromHash(closeDrawer = true): void {
		this.activateView(viewIdFromHash(window.location.hash), undefined, closeDrawer);
	}

	private navigateTo(viewId: ViewId, url?: string, closeDrawer = true): void {
		const nextHash = hashFromViewId(viewId);
		if (window.location.hash === nextHash) {
			this.activateView(viewId, url, closeDrawer);
			return;
		}

		window.location.hash = nextHash;
		if (url || closeDrawer) this.activateView(viewId, url, closeDrawer);
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

		if (url && viewId === "mapper") {
			this.select<HTMLInputElement>("#mapper-url")!.value = url;
			this.handleUrlInput("mapper");
		}
		if (url && viewId === "releases") {
			this.select<HTMLInputElement>("#releases-url")!.value = url;
			this.handleUrlInput("releases");
		}
		if (closeDrawer) this.toggleDrawer(false);
	}

	private loadFavorites(): void {
		this.state.favorites = DataServices.favorites.load();
	}

	private saveFavorites(): void {
		DataServices.favorites.save(this.state.favorites);
		this.renderFavorites();
		this.renderHomeFavorites();
		if (this.state.currentView === "mapper") this.handleUrlInput("mapper");
		if (this.state.currentView === "releases") this.handleUrlInput("releases");
	}

	private isFavorite(repository: RepositoryRef): boolean {
		return DataServices.favorites.isFavorite(this.state.favorites, repository);
	}

	private toggleFavoriteCurrent(view: "mapper" | "releases"): void {
		const parsed = view === "mapper" ? this.state.mapper.parsedRepo : this.state.releases.parsedRepo;
		if (!parsed) return;

		this.state.favorites = DataServices.favorites.toggle(this.state.favorites, parsed);
		this.saveFavorites();
	}

	private renderFavorites(): void {
		const grid = this.select("#favorites-grid");
		const empty = this.select("#favorites-empty");
		if (!grid || !empty) return;

		grid.textContent = "";
		if (this.state.favorites.length === 0) {
			empty.classList.remove("hidden");
			return;
		}

		empty.classList.add("hidden");
		this.state.favorites.forEach((favorite) => grid.append(this.createFavoriteCard(favorite)));
	}

	private createFavoriteCard(favorite: FavoriteRepository): HTMLElement {
		const card = document.createElement("md-outlined-card");
		card.className = "favorite-card";

		const header = document.createElement("div");
		header.className = "favorite-card-header";
		const titleWrap = document.createElement("div");
		titleWrap.className = "favorite-title-wrap";
		const owner = document.createElement("div");
		owner.className = "favorite-owner";
		owner.append(this.createIcon("folder_open"), document.createTextNode(favorite.owner));
		const title = document.createElement("h3");
		title.textContent = favorite.repo;
		titleWrap.append(owner, title);
		const remove = document.createElement("md-outlined-icon-button");
		remove.setAttribute("type", "button");
		remove.setAttribute("aria-label", `Remove ${favorite.owner}/${favorite.repo} from favorites`);
		const removeIcon = this.createIcon("star");
		removeIcon.classList.add("filled-icon");
		remove.append(removeIcon);
		remove.addEventListener("click", () => {
			this.state.favorites = this.state.favorites.filter(
				(item) => !(item.owner.toLowerCase() === favorite.owner.toLowerCase() && item.repo.toLowerCase() === favorite.repo.toLowerCase())
			);
			this.saveFavorites();
		});
		header.append(titleWrap, remove);

		const actions = document.createElement("div");
		actions.className = "favorite-card-actions";
		actions.append(
			this.createFavoriteAction("terminal", "Map", () => this.navigateTo("mapper", repositoryUrl(favorite))),
			this.createFavoriteAction("bar_chart", "Stats", () => this.navigateTo("releases", repositoryUrl(favorite)))
		);
		card.append(header, actions);
		return card;
	}

	private createFavoriteAction(iconName: string, label: string, onClick: () => void): HTMLElement {
		const button = document.createElement("md-outlined-button");
		button.setAttribute("type", "button");
		const icon = this.createIcon(iconName);
		icon.setAttribute("slot", "icon");
		button.append(icon, document.createTextNode(label));
		button.addEventListener("click", onClick);
		return button;
	}

	private renderHomeFavorites(): void {
		const section = this.select("#home-favorites-section");
		const list = this.select("#home-favorites-list");
		if (!section || !list) return;

		list.textContent = "";
		if (this.state.favorites.length === 0) {
			section.classList.add("hidden");
			return;
		}

		section.classList.remove("hidden");
		this.state.favorites.slice(0, 5).forEach((favorite) => {
			const button = document.createElement("md-assist-chip");
			button.className = "favorite-chip";
			const icon = this.createIcon("star");
			icon.setAttribute("slot", "icon");
			icon.classList.add("filled-icon");
			button.append(icon, document.createTextNode(favorite.repo));
			button.addEventListener("click", () => this.navigateTo("releases", repositoryUrl(favorite)));
			list.append(button);
		});
		const seeAll = document.createElement("md-assist-chip");
		seeAll.className = "favorite-chip";
		const seeAllIcon = this.createIcon("arrow_forward");
		seeAllIcon.setAttribute("slot", "icon");
		seeAll.append(seeAllIcon, document.createTextNode("See all"));
		seeAll.addEventListener("click", () => this.navigateTo("favorites"));
		list.append(seeAll);
	}

	private handleUrlInput(view: "mapper" | "releases"): void {
		const input = this.select<HTMLInputElement>(`#${view}-url`);
		if (!input) return;
		const parsed = GitHubUrlParser.parseRepositoryUrl(input.value);

		if (view === "mapper") this.state.mapper.parsedRepo = parsed;
		if (view === "releases") this.state.releases.parsedRepo = parsed;

		this.updateFavoriteButton(view, parsed);
	}

	private updateFavoriteButton(view: "mapper" | "releases", parsed: RepositoryRef | null): void {
		const button = this.select<HTMLElement>(`#${view}-fav-btn`);
		if (!button) return;

		const active = !!parsed && this.isFavorite(parsed);
		button.toggleAttribute("disabled", !parsed);
		button.toggleAttribute("selected", active);
		button.setAttribute("aria-label", active ? "Remove favorite" : "Add favorite");
	}

	private toggleToken(view: "mapper" | "releases"): void {
		const button = this.select<HTMLElement>(`[data-token-toggle="${view}"]`);
		const panel = this.select<HTMLElement>(`#${view}-token-panel`);
		const label = this.select<HTMLElement>(`#${view}-token-label`);

		if (!button || !panel || !label) return;

		const shouldShow = !panel.classList.contains("open");
		const nextText = shouldShow ? "Hide Settings" : "Token Settings";

		panel.classList.toggle("open", shouldShow);
		panel.setAttribute("aria-hidden", String(!shouldShow));

		button.setAttribute("aria-expanded", String(shouldShow));
		button.classList.toggle("is-expanded", shouldShow);
		label.textContent = nextText;
	}

	private setRepositoryMapFormat(format: RepositoryMapFormat, syncControl = true): void {
		this.state.mapper.format = format;
		if (syncControl) {
			this.select<SegmentedButtonSetElement>(".segmented")?.setButtonSelected(format === "ascii" ? 0 : 1, true);
		}
		if (this.state.mapper.rawPaths.length > 0) this.renderMapperOutput();
	}

	private async handleMapperSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("mapper")) return;
		const url = this.select<HTMLInputElement>("#mapper-url")?.value ?? "";
		const token = this.select<HTMLInputElement>("#mapper-token")?.value ?? "";
		const result = this.select("#mapper-result");
		const parsed = GitHubUrlParser.parseRepositoryUrl(url);

		this.hideError("mapper");
		result?.classList.add("hidden");
		const resetButton = this.setLoading("#mapper-submit", "Processing...", "progress_activity");

		if (!parsed) {
			this.showError("mapper", "Invalid GitHub URL");
			resetButton();
			this.finishPendingAction("mapper");
			return;
		}

		try {
			const tree = await DataServices.github.getRepositoryTree(parsed, token);
			this.state.mapper.rawPaths = tree.items;
			this.state.mapper.outputs = {};
			this.renderMapperOutput();
			result?.classList.remove("hidden");
			if (tree.truncated) this.showError("mapper", "Repo is massive, output was truncated by the GitHub API.");
		} catch (error) {
			this.showError("mapper", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("mapper");
		}
	}

	private renderMapperOutput(): void {
		const { format, outputs, rawPaths } = this.state.mapper;
		const result = outputs[format] ?? RepositoryMapBuilder.build(rawPaths, format);
		outputs[format] = result;

		this.select("#mapper-code")!.textContent = result.output;
		this.select("#mapper-stats-files")!.textContent = String(result.files);
		this.select("#mapper-stats-folders")!.textContent = String(result.folders);
	}

	private async handleReleasesSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("releases")) return;
		const url = this.select<HTMLInputElement>("#releases-url")?.value ?? "";
		const token = this.select<HTMLInputElement>("#releases-token")?.value ?? "";
		const result = this.select("#releases-result");
		const parsed = GitHubUrlParser.parseRepositoryUrl(url);

		this.hideError("releases");
		result?.classList.add("hidden");
		const resetButton = this.setLoading("#releases-submit", "Processing...", "progress_activity");

		if (!parsed) {
			this.showError("releases", "Invalid GitHub URL");
			resetButton();
			this.finishPendingAction("releases");
			return;
		}

		try {
			this.state.releases.data = await DataServices.github.getReleaseStats(parsed, token);
			this.state.releases.selectedIndex = 0;
			this.renderReleases();
			result?.classList.remove("hidden");
		} catch (error) {
			this.showError("releases", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("releases");
		}
	}

	private renderReleases(): void {
		this.renderSelectedReleaseDetails();
		this.renderReleaseList();
	}

	private renderSelectedReleaseDetails(): void {
		if (!this.state.releases.data) return;
		const { total, releases } = this.state.releases.data;
		const active = releases[this.state.releases.selectedIndex];
		const maxAssetDownloads = Math.max(...active.assets.map((asset) => asset.downloads), 0);

		this.select("#rel-detail-name")!.textContent = active.name;
		this.select("#rel-detail-tag")!.textContent = active.tagName;
		this.select("#rel-detail-date")!.textContent = active.date ? new Date(active.date).toLocaleDateString() : "Unpublished";
		this.select("#rel-detail-downloads")!.textContent = active.downloads.toLocaleString();
		this.select("#rel-total-downloads")!.textContent = total.toLocaleString();
		this.select("#rel-count")!.textContent = `${releases.length} Found`;

		const assetList = this.select("#rel-assets-list")!;
		assetList.textContent = "";
		if (active.assets.length === 0) {
			const empty = document.createElement("div");
			empty.className = "empty-list";
			empty.textContent = "No assets.";
			assetList.append(empty);
		} else {
			active.assets.forEach((asset) => assetList.append(this.createAssetRow(asset, maxAssetDownloads)));
		}
	}

	private renderReleaseList(): void {
		if (!this.state.releases.data) return;
		const { releases } = this.state.releases.data;
		const maxDownloads = Math.max(...releases.map((release) => release.downloads), 0);
		const releaseList = this.select("#rel-list")!;

		releaseList.textContent = "";
		releases.forEach((release, index) => releaseList.append(this.createReleaseButton(release, index, maxDownloads)));
	}

	private syncSelectedReleaseButton(): void {
		this.selectAll<HTMLButtonElement>("[data-release-index]").forEach((button) => {
			const selected = Number(button.dataset.releaseIndex) === this.state.releases.selectedIndex;
			button.classList.toggle("selected", selected);
			button.setAttribute("aria-pressed", String(selected));
		});
	}

	private createAssetRow(asset: ReleaseAsset, maxDownloads: number): HTMLElement {
		const row = document.createElement("div");
		row.className = "asset-row";
		row.innerHTML = `<div class="asset-line"><strong></strong><span></span></div><div class="bar-track"><div class="bar-fill"></div></div>`;
		row.querySelector("strong")!.textContent = asset.name;
		row.querySelector("span")!.textContent = asset.downloads.toLocaleString();
		const width = maxDownloads > 0 ? (asset.downloads / maxDownloads) * 100 : 0;
		(row.querySelector(".bar-fill") as HTMLElement).style.width = `${width}%`;
		return row;
	}

	private createReleaseButton(release: ProcessedRelease, index: number, maxDownloads: number): HTMLButtonElement {
		const button = document.createElement("button");
		const selected = index === this.state.releases.selectedIndex;
		button.type = "button";
		button.dataset.releaseIndex = String(index);
		button.setAttribute("aria-pressed", String(selected));
		button.className = `release-button${selected ? " selected" : ""}`;
		button.innerHTML = `<div class="release-button-header"><span class="release-button-title"></span><span class="release-button-count"></span></div><div class="bar-track"><div class="bar-fill"></div></div>`;
		button.querySelector(".release-button-title")!.textContent = release.name;
		button.querySelector(".release-button-count")!.textContent = release.downloads.toLocaleString();
		const width = maxDownloads > 0 ? (release.downloads / maxDownloads) * 100 : 0;
		(button.querySelector(".bar-fill") as HTMLElement).style.width = `${width}%`;
		button.addEventListener("click", () => {
			this.state.releases.selectedIndex = index;
			this.syncSelectedReleaseButton();
			this.renderSelectedReleaseDetails();
		});
		return button;
	}

	private async handlePatchSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!this.startPendingAction("patch")) return;
		const url = this.select<HTMLInputElement>("#patch-url")?.value ?? "";
		const result = this.select("#patch-result");
		const parsed = GitHubUrlParser.parseCommitUrl(url);

		this.hideError("patch");
		result?.classList.add("hidden");
		const resetButton = this.setLoading("#patch-submit", "Fetching...", "progress_activity");

		if (!parsed) {
			this.showError("patch", "Invalid Commit URL");
			resetButton();
			this.finishPendingAction("patch");
			return;
		}

		try {
			this.state.patch = await DataServices.github.getCommitPatch(parsed);
			this.select("#patch-code")!.textContent = this.state.patch.content;
			result?.classList.remove("hidden");
		} catch (error) {
			this.showError("patch", this.errorMessage(error));
		} finally {
			resetButton();
			this.finishPendingAction("patch");
		}
	}

	private async copyMapperOutput(): Promise<void> {
		await this.copyTextWithFeedback(this.select("#mapper-code")?.textContent ?? "", "#mapper-copy-btn");
	}

	private async copyPatchOutput(): Promise<void> {
		await this.copyTextWithFeedback(this.state.patch.content, "#patch-copy-btn");
	}

	private async copyTextWithFeedback(text: string, buttonSelector: string): Promise<void> {
		if (!text) return;
		await navigator.clipboard.writeText(text);
		const resetButton = this.setButtonState(buttonSelector, "Copied", "check_circle", false, "copied");
		window.setTimeout(resetButton, 2000);
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

	private showError(scope: "mapper" | "releases" | "patch", message: string): void {
		this.select(`#${scope}-error-text`)!.textContent = message;
		this.select(`#${scope}-error`)!.classList.remove("hidden");
	}

	private hideError(scope: "mapper" | "releases" | "patch"): void {
		this.select(`#${scope}-error`)?.classList.add("hidden");
	}

	private startPendingAction(action: "mapper" | "releases" | "patch"): boolean {
		if (this.pendingActions.has(action)) return false;
		this.pendingActions.add(action);
		return true;
	}

	private finishPendingAction(action: "mapper" | "releases" | "patch"): void {
		this.pendingActions.delete(action);
	}

	private setLoading(buttonSelector: string, label: string, _iconName: string): () => void {
		const progress = document.createElement("md-circular-progress");
		progress.setAttribute("slot", "icon");
		progress.setAttribute("data-icon", "");
		progress.setAttribute("indeterminate", "");
		progress.setAttribute("aria-label", "Loading");
		return this.setButtonState(buttonSelector, label, progress, true, "is-loading");
	}

	private setButtonState(buttonSelector: string, label: string, iconReplacement: HTMLElement | string, disabled: boolean, stateClass: string): () => void {
		const button = this.select<HTMLElement>(buttonSelector);
		const icon = button?.querySelector<HTMLElement>("[data-icon]");
		const text = button?.querySelector<HTMLElement>("[data-label]");
		if (!button || !icon || !text) return () => {};

		const replacement = typeof iconReplacement === "string" ? this.createSlottedStateIcon(iconReplacement) : iconReplacement;
		const originalIcon = icon.cloneNode(true);
		const originalText = text.textContent ?? "";
		const wasDisabled = button.hasAttribute("disabled");

		button.toggleAttribute("disabled", disabled);
		button.classList.add(stateClass);
		icon.replaceWith(replacement);
		text.textContent = label;
		return () => {
			button.toggleAttribute("disabled", wasDisabled);
			button.classList.remove(stateClass);
			replacement.replaceWith(originalIcon);
			text.textContent = originalText;
		};
	}

	private createIcon(name: string): HTMLElement {
		const icon = document.createElement("md-icon");
		icon.textContent = name;
		return icon;
	}

	private createSlottedStateIcon(name: string): HTMLElement {
		const icon = this.createIcon(name);
		icon.setAttribute("slot", "icon");
		icon.setAttribute("data-icon", "");
		return icon;
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : "Something went wrong";
	}
}
