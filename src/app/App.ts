import DataServices from "./DataServices";
import RepoMapperApp from "../features/repo-mapper/presentation/RepoMapperApp";
import { defineMaterialElements } from "../core/material/MaterialElements";
import GlobalState from "../core/state/GlobalState";

if (!customElements.get("repo-mapper-app")) {
	customElements.define("repo-mapper-app", RepoMapperApp);
}

export const startApp = async (): Promise<void> => {
	"use strict";

	renderLoadingState();

	try {
		await defineMaterialElements();
		await DataServices.init();
		await GlobalState.init();
		onApplicationStart();
	} catch (error) {
		console.error("Failed to start RepoMapper", error);
		renderStartupError();
	}
};

const onApplicationStart = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) throw new Error("#app root not found");
	appRoot.textContent = "";
	appRoot.append(document.createElement("repo-mapper-app"));
};

const renderLoadingState = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) return;
	appRoot.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;color:#111;background:#fff;"><p>Loading RepoMapper…</p></main>`;
};

const renderStartupError = (): void => {
	const appRoot = document.querySelector<HTMLDivElement>("#app");
	if (!appRoot) return;
	appRoot.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;color:#111;background:#fff;"><section style="max-width:560px;border:1px solid #ddd;border-radius:16px;padding:24px;"><h1 style="margin-top:0;">RepoMapper could not start</h1><p>Please refresh the page. If the problem continues, check the browser console for details.</p></section></main>`;
};
