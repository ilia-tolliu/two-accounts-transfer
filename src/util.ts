import type {Event} from './domain.js';

export function nextRevision(events: Event[]): number {
    return events[events.length - 1].revision + 1;
}