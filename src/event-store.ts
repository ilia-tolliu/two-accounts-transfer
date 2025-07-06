import {
    type Event,
    type EventProcessor,
    type NewEvent,
    type Stream,
    STREAM_ACCOUNT,
    STREAM_TRANSFER
} from './domain.ts';

export class EventStore {
    #events: Event[] = [];
    #streams: Stream[] = [];
    #processors: Record<string, EventProcessor[]> = {
        [STREAM_TRANSFER]: [],
        [STREAM_ACCOUNT]: [],
    };

    constructor() {}

    createStream(streamType: string, initialEvent: NewEvent) {
        const streamId = this.#generateStreamId();
        const stream: Stream = {
            streamType,
            streamId
        };
        const event: Event = {
            streamId,
            revision: 1,
            ...initialEvent,
        };

        this.#streams.push(stream);
        console.log(`[EventStore] stream created ${streamId}:${streamType}`);

        this.#addEvent(streamType, event);

        return streamId;
    }

    appendEvent(streamType: string, streamId: number, revision: number, newEvent: NewEvent) {
        const stream = this.#streams.find(stream => stream.streamType === streamType && stream.streamId === streamId);
        if (!stream) {
            throw new Error(`Stream not found: ${streamId}:${streamType}`);
        }

        const latestEvent = this.#events.findLast(stream => stream.streamId === streamId)!;
        if (latestEvent.revision + 1 !== revision) {
            throw new Error(`Invalid revision ${streamId}:${streamType}:${revision}`);
        }

        const event: Event = {
            streamId,
            revision,
            ...newEvent,
        }

        this.#addEvent(streamType, event);
    }

    getEvents(streamType: string, streamId: number) {
        const stream = this.#streams.find(stream => stream.streamId === streamId && stream.streamType === streamType);
        if (!stream) {
            throw new Error(`Stream not found: ${streamId}:${streamType}`);
        }

        return this.#events.filter(event => event.streamId === streamId);
    }

    subscribe(streamType: string, processor: EventProcessor) {
        this.#processors[streamType].push(processor);
    }

    dump() {
        console.log('Event Store content:');

        for (const stream of this.#streams) {
            console.log(`Stream ${stream.streamType}:${stream.streamId}`);
            this.#events.filter(event => event.streamId === stream.streamId)
                .forEach(event => {
                    console.log(`${event.revision}:${event.eventType}`, JSON.stringify(event.payload, undefined, 2));
                })
            console.log('');
        }
    }

    #generateStreamId(): number {
        const latestStream = this.#streams[this.#streams.length - 1];
        const latestId = latestStream?.streamId ?? 0;

        return latestId + 1;
    }

    #addEvent(streamType: string, event: Event) {
        this.#events.push(event);
        console.log(`[EventStore] event published ${event.streamId}:${streamType}:${event.revision}:${event.eventType}`);
        this.#notify(event);
    }

    #notify(event: Event) {
        const stream = this.#streams.find(stream => stream.streamId === event.streamId);
        if (!stream) {
            throw new Error(`Stream not found: ${event.streamId}`);
        }

        this.#processors[stream.streamType]
            .forEach(s => setImmediate(() => s.process(event)));
    }

    reset() {
        this.#streams.length = 0;
        this.#events.length = 0;
        this.#processors[STREAM_ACCOUNT].length = 0;
        this.#processors[STREAM_TRANSFER].length = 0;
    }

    stubStream(streamType: string, stubEvents: NewEvent[], andNotify?: boolean) {
        const streamId = this.#generateStreamId();
        this.#streams.push({
            streamId,
            streamType,
        });

        for (let i = 0; i < stubEvents.length; i++) {
            const newEvent = stubEvents[i];
            const event: Event = {
                streamId,
                revision: i + 1,
                eventType: newEvent.eventType,
                payload: newEvent.payload,
            };
            this.#events.push(event);
        }

        if (andNotify) {
            this.#notify(this.#events[this.#events.length - 1]);
        }

        return streamId;
    }
}
