import DataServices from "./DataServices";
import GitHubToolsApp from "../features/github-tools/presentation/GitHubToolsApp";
import { defineMaterialElements } from "../core/material/MaterialElements";
import { activeLocale, strings } from "../core/localization/Localization";
import GlobalState from "../core/state/GlobalState";

if (!customElements.get("github-tools-app")) {
	customElements.define("github-tools-app", GitHubToolsApp);
}

export const startApp = async (): Promise<void> => {
	"use strict";

	document.documentElement.lang = activeLocale;
	applyDocumentMetadata();
	renderLoadingState();

	try {
		await defineMaterialElements();
		await DataServices.init();
		await GlobalState.init();
		onApplicationStart();
	} catch (error) {
		console.error(strings.common.app.consoleStartupError, error);
		renderStartupError();
	}
};

const applyDocumentMetadata = (): void => {
	document.title = strings.common.app.title;
	document.querySelector<HTMLMetaElement>('meta[name="description"]')
		?.setAttribute("content", strings.common.app.description);
};

const onApplicationStart = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) throw new Error(strings.common.app.rootMissing);
	appRoot.textContent = "";
	appRoot.append(document.createElement("github-tools-app"));
};

const renderLoadingState = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) return;
	appRoot.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;color:#111;background:#fff;"><p>${strings.common.app.loading}</p></main>`;
};

const renderStartupError = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) return;
	appRoot.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;color:#111;background:#fff;"><section style="max-width:560px;border:1px solid #ddd;border-radius:16px;padding:24px;"><h1 style="margin-top:0;">${strings.common.app.startupErrorTitle}</h1><p>${strings.common.app.startupErrorDescription}</p></section></main>`;
};
