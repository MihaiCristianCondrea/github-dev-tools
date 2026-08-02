import common from "../../locales/en/common.json" with { type: "json" };
import favorites from "../../locales/en/favorites.json" with { type: "json" };
import githubTools from "../../locales/en/github-tools.json" with { type: "json" };
import leaderboard from "../../locales/en/leaderboard.json" with { type: "json" };

export const activeLocale = "en";

export const strings = {
	common,
	favorites,
	githubTools,
	leaderboard,
} as const;

export type MessageValues = Readonly<Record<string, string | number>>;

const numberFormatter = new Intl.NumberFormat(activeLocale);
const ordinalRules = new Intl.PluralRules(activeLocale, { type: "ordinal" });

export const formatMessage = (message: string, values: MessageValues = {}): string =>
	message.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, key: string) => {
		const value = values[key];
		return value === undefined ? placeholder : String(value);
	});

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const formatDate = (value: Date, options?: Intl.DateTimeFormatOptions): string =>
	new Intl.DateTimeFormat(activeLocale, options).format(value);

export const formatEnglishPlural = (
	count: number,
	one: string,
	other: string,
	values: MessageValues = {},
): string => formatMessage(count === 1 ? one : other, {
	...values,
	count: formatNumber(count),
});

export const formatOrdinal = (value: number): string => {
	const category = ordinalRules.select(value);
	const suffix = category === "one"
		? "st"
		: category === "two"
			? "nd"
			: category === "few"
				? "rd"
				: "th";
	return `${formatNumber(value)}${suffix}`;
};

export const localizeTemplate = (template: string): string =>
	template.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_placeholder, key: string) =>
		escapeHtml(resolveString(key))
	);

const resolveString = (key: string): string => {
	let value: unknown = strings;
	for (const segment of key.split(".")) {
		if (typeof value !== "object" || value === null || !(segment in value)) {
			throw new Error(`Missing English localization key: ${key}`);
		}
		value = (value as Record<string, unknown>)[segment];
	}
	if (typeof value !== "string") throw new Error(`Localization key is not a string: ${key}`);
	return value;
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
})[character] ?? character);
