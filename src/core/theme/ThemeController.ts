export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "github_tools_theme";

const isThemePreference = (value: unknown): value is ThemePreference =>
	value === "light" || value === "dark" || value === "system";

// Owns the stored theme preference, the OS preference it falls back to, and the
// document-level metadata the browser chrome reads. Components subscribe for changes
// rather than tracking media queries of their own.
export class ThemeController {
	// matchMedia() returns a new MediaQueryList on every call, so the listener has to be
	// added to and removed from this one retained instance.
	private readonly darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	private readonly listeners = new Set<(theme: ResolvedTheme, preference: ThemePreference) => void>();
	private readonly handleSystemChange = (): void => this.apply(this.preference(), false);

	preference(): ThemePreference {
		try {
			const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
			return isThemePreference(stored) ? stored : "system";
		} catch {
			return "system";
		}
	}

	resolve(preference: ThemePreference): ResolvedTheme {
		if (preference !== "system") return preference;
		return this.darkSchemeQuery.matches ? "dark" : "light";
	}

	start(): void {
		this.darkSchemeQuery.addEventListener("change", this.handleSystemChange);
		this.apply(this.preference(), false);
	}

	stop(): void {
		this.darkSchemeQuery.removeEventListener("change", this.handleSystemChange);
		this.listeners.clear();
	}

	subscribe(listener: (theme: ResolvedTheme, preference: ThemePreference) => void): void {
		this.listeners.add(listener);
	}

	apply(preference: ThemePreference, persist = true): void {
		if (persist) {
			try {
				window.localStorage.setItem(THEME_STORAGE_KEY, preference);
			} catch (error) {
				console.error("Failed to persist the theme preference", error);
			}
		}

		const theme = this.resolve(preference);
		// The browser chrome and the pre-mount page background read the document, not a
		// shadow tree, so the resolved theme is mirrored onto <html> as well.
		document.documentElement.dataset.theme = theme;
		document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-theme]').forEach((meta) => {
			meta.media = meta.dataset.theme === theme ? "all" : "not all";
		});
		this.listeners.forEach((listener) => listener(theme, preference));
	}
}
