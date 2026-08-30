import { EventEmitter } from "node:events";

const domainEvents = new EventEmitter();

domainEvents.setMaxListeners(50);

export const emitDomainEvent = (eventType, payload) => {
    domainEvents.emit(eventType, payload);
};

export const onDomainEvent = (eventType, handler) => {
    domainEvents.on(eventType, handler);
};

export default domainEvents;
