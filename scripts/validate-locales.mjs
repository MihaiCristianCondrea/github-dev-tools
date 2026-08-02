import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const localesRoot = path.join(projectRoot, "src", "locales");
const sourceRoot = path.join(projectRoot, "src");
const canonicalLocale = "en";
const localizationBoundary = "src/core/localization/Localization.ts";
const namespaces = new Map([
	["common.json", "common"],
	["github-tools.json", "githubTools"],
	["favorites.json", "favorites"],
	["leaderboard.json", "leaderboard"],
]);
const errors = [];

const relativePath = (filePath) => path.relative(projectRoot, filePath).split(path.sep).join("/");
const addError = (message) => errors.push(message);

const readJson = async (filePath) => {
	try {
		return JSON.parse(await readFile(filePath, "utf8"));
	} catch (error) {
		addError(`${relativePath(filePath)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
};

const flattenStrings = (value, sourcePath, prefix = "", output = new Map()) => {
	if (typeof value === "string") {
		if (!value.trim()) addError(`${sourcePath}:${prefix} must not be empty.`);
		if (value.includes("{{") || value.includes("}}")) {
			addError(`${sourcePath}:${prefix} must use {variable} for interpolation, not {{template.keys}}.`);
		}
		output.set(prefix, value);
		return output;
	}

	if (!value || typeof value !== "object" || Array.isArray(value)) {
		addError(`${sourcePath}:${prefix || "<root>"} must be an object or string.`);
		return output;
	}

	const entries = Object.entries(value);
	if (entries.length === 0) addError(`${sourcePath}:${prefix || "<root>"} must not be an empty object.`);
	for (const [key, child] of entries) {
		if (!key.trim()) addError(`${sourcePath} contains an empty key below ${prefix || "<root>"}.`);
		flattenStrings(child, sourcePath, prefix ? `${prefix}.${key}` : key, output);
	}
	return output;
};

const messagePlaceholders = (message) => new Set(
	Array.from(message.matchAll(/\{([a-zA-Z0-9_]+)\}/g), (match) => match[1]),
);

const sameSet = (left, right) => left.size === right.size && Array.from(left).every((value) => right.has(value));

const localeEntries = await readdir(localesRoot, { withFileTypes: true });
const locales = localeEntries
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

if (!locales.includes(canonicalLocale)) addError(`Missing canonical locale directory: src/locales/${canonicalLocale}`);
if (locales.length === 0) addError("At least one locale directory is required under src/locales.");

const resourcesByLocale = new Map();
for (const locale of locales) {
	const localeRoot = path.join(localesRoot, locale);
	const entries = await readdir(localeRoot, { withFileTypes: true });
	const fileNames = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));

	for (const fileName of namespaces.keys()) {
		if (!fileNames.has(fileName)) addError(`src/locales/${locale}/${fileName} is required.`);
	}
	for (const fileName of fileNames) {
		if (fileName.endsWith(".json") && !namespaces.has(fileName)) {
			addError(`Unexpected locale namespace src/locales/${locale}/${fileName}. Add it to every locale and the validator before use.`);
		}
	}

	const localeResources = new Map();
	for (const [fileName, namespace] of namespaces) {
		const filePath = path.join(localeRoot, fileName);
		if (!fileNames.has(fileName)) continue;
		const raw = await readJson(filePath);
		if (!raw) continue;
		localeResources.set(namespace, {
			raw,
			strings: flattenStrings(raw, relativePath(filePath)),
		});
	}
	resourcesByLocale.set(locale, localeResources);
}

const canonicalResources = resourcesByLocale.get(canonicalLocale) ?? new Map();
for (const locale of locales) {
	if (locale === canonicalLocale) continue;
	const translatedResources = resourcesByLocale.get(locale) ?? new Map();
	for (const namespace of namespaces.values()) {
		const canonicalStrings = canonicalResources.get(namespace)?.strings ?? new Map();
		const translatedStrings = translatedResources.get(namespace)?.strings ?? new Map();
		const canonicalKeys = new Set(canonicalStrings.keys());
		const translatedKeys = new Set(translatedStrings.keys());

		for (const key of canonicalKeys) {
			if (!translatedKeys.has(key)) addError(`src/locales/${locale} is missing ${namespace}.${key}.`);
		}
		for (const key of translatedKeys) {
			if (!canonicalKeys.has(key)) addError(`src/locales/${locale} contains unknown key ${namespace}.${key}.`);
		}

		for (const [key, canonicalMessage] of canonicalStrings) {
			const translatedMessage = translatedStrings.get(key);
			if (translatedMessage === undefined) continue;
			const canonicalPlaceholders = messagePlaceholders(canonicalMessage);
			const translatedPlaceholders = messagePlaceholders(translatedMessage);
			if (!sameSet(canonicalPlaceholders, translatedPlaceholders)) {
				addError(`Placeholder mismatch for ${locale}:${namespace}.${key}. Expected {${Array.from(canonicalPlaceholders).join(", ")}}, found {${Array.from(translatedPlaceholders).join(", ")}}.`);
			}
		}
	}
}

const canonicalTemplateKeys = new Set();
for (const [namespace, resource] of canonicalResources) {
	for (const key of resource.strings.keys()) canonicalTemplateKeys.add(`${namespace}.${key}`);
}

const walkFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await walkFiles(entryPath));
		if (entry.isFile()) files.push(entryPath);
	}
	return files;
};

const templateTokenPattern = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;
const technicalAttributeValue = (value) => /^(?:https?:\/\/|github_pat_)/.test(value);

const validateHtml = (fileLabel, html, extraTemplateKeys = new Set()) => {
	for (const match of html.matchAll(templateTokenPattern)) {
		if (!canonicalTemplateKeys.has(match[1]) && !extraTemplateKeys.has(match[1])) {
			addError(`${fileLabel} references unknown localization key {{${match[1]}}}.`);
		}
	}

	for (const match of html.matchAll(/\b(aria-label|aria-label-selected|label|placeholder|title|alt)="([^"]*)"/g)) {
		const [, attribute, value] = match;
		const literalValue = value.replace(templateTokenPattern, "").trim();
		if (/[A-Za-z]/.test(literalValue) && !technicalAttributeValue(literalValue)) {
			addError(`${fileLabel} contains hardcoded ${attribute} text: "${value}".`);
		}
	}

	const withoutNonCopy = html
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<md-icon\b[^>]*>[\s\S]*?<\/md-icon>/gi, "")
		.replace(/<span\b[^>]*class="[^"]*(?:material-symbols-outlined|material-symbols-rounded)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");

	for (const match of withoutNonCopy.matchAll(/>([^<]+)</g)) {
		const literalText = match[1]
			.replace(templateTokenPattern, "")
			.replace(/&[a-zA-Z0-9#]+;/g, "")
			.trim();
		if (/[A-Za-z]/.test(literalText)) {
			addError(`${fileLabel} contains hardcoded visible text: "${literalText}".`);
		}
	}
};

const sourceFiles = await walkFiles(sourceRoot);
for (const filePath of sourceFiles) {
	const fileName = relativePath(filePath);
	if (!/\.(?:ts|html)$/.test(fileName)) continue;
	const content = await readFile(filePath, "utf8");

	if (fileName.endsWith(".ts") && fileName !== localizationBoundary && /(?:^|["'])[^"'\n]*locales\//m.test(content)) {
		addError(`${fileName} imports locale files directly. Import them only through ${localizationBoundary}.`);
	}

	if (fileName.endsWith(".html")) validateHtml(fileName, content);

	if (fileName.endsWith(".ts")) {
		const literalSinkPatterns = [
			/\.(?:textContent|innerText)\s*=\s*(["'`])([^"'`\n]*)\1/g,
			/createTextNode\(\s*(["'`])([^"'`\n]*)\1/g,
			/setAttribute\(\s*["'](?:aria-label|aria-label-selected|title|placeholder|alt)["']\s*,\s*(["'`])([^"'`\n]*)\1/g,
		];
		for (const pattern of literalSinkPatterns) {
			for (const match of content.matchAll(pattern)) {
				const value = match[2].trim();
				const isDynamic = value.includes("${");
				const isTechnicalIdentifier = /^[a-z0-9_]+$/.test(value);
				if (/[A-Za-z]/.test(value) && !isDynamic && !isTechnicalIdentifier) {
					addError(`${fileName} writes hardcoded user-facing text: "${value}".`);
				}
			}
		}

		for (const match of content.matchAll(/\.innerHTML\s*=\s*`([\s\S]*?)`/g)) {
			const staticTemplate = match[1].replace(/\$\{[\s\S]*?\}/g, "{{dynamic.value}}");
			validateHtml(`${fileName} inline HTML`, staticTemplate, new Set(["dynamic.value"]));
		}
	}
}

const commonApp = canonicalResources.get("common")?.raw?.app;
if (commonApp && typeof commonApp === "object") {
	const indexHtml = await readFile(path.join(projectRoot, "index.html"), "utf8");
	const indexTitle = indexHtml.match(/<title>([^<]+)<\/title>/i)?.[1];
	const indexDescription = indexHtml.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/>/i)?.[1];
	if (indexTitle !== commonApp.title) addError("index.html title must match common.app.title.");
	if (indexDescription !== commonApp.description) addError("index.html description must match common.app.description.");

	const manifestPath = path.join(projectRoot, "public", "manifest.webmanifest");
	const manifest = await readJson(manifestPath);
	if (manifest) {
		if (manifest.name !== commonApp.title) addError("public/manifest.webmanifest name must match common.app.title.");
		if (manifest.short_name !== commonApp.shortTitle) addError("public/manifest.webmanifest short_name must match common.app.shortTitle.");
		if (manifest.description !== commonApp.description) addError("public/manifest.webmanifest description must match common.app.description.");
	}
}

if (errors.length > 0) {
	console.error(`Locale validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
	for (const error of errors) console.error(`- ${error}`);
	process.exitCode = 1;
} else {
	const keyCount = Array.from(canonicalResources.values())
		.reduce((total, resource) => total + resource.strings.size, 0);
	console.log(`Locale validation passed: ${locales.length} locale directory, ${namespaces.size} namespaces, ${keyCount} canonical English messages.`);
}
