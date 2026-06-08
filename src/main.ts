import { defineMaterialElements } from "./lib/components/MaterialElements";
import DataManager from "./data/DataManager";
import WebComponentLoader from "./lib/components/WebComponentLoader";
import GlobalState from "./lib/state/GlobalState";

const app = () => {
	"use strict";

	defineMaterialElements();

	WebComponentLoader.loadAll()
		.then(() => DataManager.init())
		.then(() => GlobalState.init())
		.then(() => onApplicationStart());

	function onApplicationStart() {
		document.querySelector<HTMLDivElement>("#app")!.append(document.createElement("repo-mapper-app"));
	}
};

app();
