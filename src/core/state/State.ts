import { Observable } from "../events/Observable";

// ====================================================== //
// ====================== State ====================== //
// ====================================================== //

// Wrapper class to make any object/primitive observable

// Usage:
// 1. Create a new State object with the data to observe.
// 2. Listen for State.STATE_CHANGE_EVENT on the State object.
// 3. Read or replace the current data through the value property.

export default class State<T> extends Observable {
	static STATE_CHANGE_EVENT = "change";
	private _value!: T;

	private _id: string = ""; // unique id that identifies any state
	private static _stateCounts: Map<string, number> = new Map<string, number>();

	constructor(value: T) {
		super();
		this._generateId()
		this._setValue(value);
	}

	private _setValue(value: T): void {
		this._value = value !== null && typeof value == "object" ? this._createProxy(value) : value;
	}

	private _createProxy(value: Object): T {
		return new Proxy(value, this._proxyHandler) as T;
	}

	private _proxyHandler = {
		set: (object: any, key: string | symbol, value: any) => {
			if (object[key] !== value) {
				object[key] = value;
				this.notifyAll(State.STATE_CHANGE_EVENT, value);
			}
			return true;
		},

		// return new proxy for nested objects
		// to avoid creating new proxies for already proxied objects, the following code was adopted from:
		// https://stackoverflow.com/questions/41299642/how-to-use-javascript-proxy-for-nested-objects
		get: (object: any, key: string | symbol) => {
			if (key == "isProxy") return true;

			const prop = object[key];
			if (typeof prop == "undefined") return;
			else if (!prop.isProxy) {
				if (prop !== null && typeof prop == "object") {
					return this._createProxy(prop);
				}
			}

			return prop;
		},
	};

	get value(): T {
		return this._value;
	}

	set value(value: T) {
		this._setValue(value);
		this.notifyAll(State.STATE_CHANGE_EVENT, this);
	}

	private _generateId() {
		const name = this.constructor.name;
		let count = State._stateCounts.get(name);
		if (count === undefined) {
			count = 0;
		}
		State._stateCounts.set(name, count + 1);
		this._id = name + "-" + count;
		Object.freeze(this._id);
	}


	get id(): string {
		return this._id;
	}
}
