import RepoMapperApp from "./components/RepoMapperApp/RepoMapperApp";
import WebComponentLoader from "./lib/components/WebComponentLoader";
import GlobalState from "./lib/state/GlobalState";
import DataManager from "./data/DataManager";

const app = () => {
	"use strict";

	WebComponentLoader.loadAll()
		.then(() => DataManager.init())
		.then(() => GlobalState.init())
		.then(() => onApplicationStart());

	function onApplicationStart() {
		document.querySelector<HTMLDivElement>("#app")!.append(new RepoMapperApp());
	}
};

app();
