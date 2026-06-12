import WebComponent from "./WebComponent";

// ====================================================== //
// ================= WebComponentLoader ================= //
// ====================================================== //

// This class is used to load all custom web components (otherwise they won't work).

// Usage:
// - Call WebComponentLoader.loadComponents().then(() => {...}) at the start of the application

export default class WebComponentLoader {
	private static componentDefinitions: ComponentDefinition<WebComponent>[] = [];

	public static async loadAll(): Promise<void> {
		const modules = (import.meta as ImportMetaWithGlob).glob("../../components/**/*.ts");
		const modulePaths = Object.keys(modules);
		for (const modulePath of modulePaths) {
			const module = await modules[modulePath]() as ComponentModule;
			const componentClass = module.default;
			if (componentClass && componentClass.prototype.htmlTagName) {
				const componentDefinition = new ComponentDefinition(
					componentClass.prototype.htmlTagName,
					componentClass
				);
				WebComponentLoader.addComponentDefinition(componentDefinition);
			}
		}
		WebComponentLoader.defineAll();
	}

	private static addComponentDefinition(
		componentDefinition: ComponentDefinition<WebComponent>
	): void {
		this.componentDefinitions.push(componentDefinition);
	}

	private static defineAll(): void {
		this.componentDefinitions.forEach((componentDefinition) =>
			componentDefinition.defineSelf()
		);
	}
}

class ComponentDefinition<T extends WebComponent> {
	constructor(public name: string, public componentConstructor: new () => T) {}

	public defineSelf(): void {
		if (!customElements.get(this.name)) customElements.define(this.name, this.componentConstructor);
	}
}

type WebComponentConstructor = { new (): WebComponent; prototype: WebComponent };

type ComponentModule = { default?: WebComponentConstructor };

type ImportMetaWithGlob = ImportMeta & {
	glob: (pattern: string) => Record<string, () => Promise<ComponentModule>>;
};
