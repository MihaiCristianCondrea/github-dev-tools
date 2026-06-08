import { Observable } from "./Observable";

// ====================================================== //
// ====================== EventBus ====================== //
// ====================================================== //

// Singleton for sending and receiving events globally

// Usage:
// - Send events with EventBus.notifyAll(eventType, eventData).
// - Listen for events with EventBus.addEventListener(eventType, callback).

class EventBus extends Observable {
	constructor() {
		super();
	}
}

export default new EventBus();
