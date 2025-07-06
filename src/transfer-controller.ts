import {EventStore} from './event-store.ts';
import {
    EVENT_TRANSFER_CLOSED,
    EVENT_TRANSFER_CONFIRMED,
    EVENT_TRANSFER_INITIATED,
    STREAM_TRANSFER,
    type TransferClosedPayload,
    type TransferConfirmedPayload,
    type TransferInitiatedPayload
} from './domain.ts';
import {nextRevision} from './util.ts';
import {calculateTransferState} from './transfer-state.ts';

export class TransferController {
    #eventStore: EventStore;

    constructor(eventStore: EventStore) {
        this.#eventStore = eventStore;
    }

    initiateTransfer(sourceId: number, destinationId: number, amount: number) {
        console.log(`[TransferController] handling command 'Initiate Transfer'`);

        const transferId = this.#eventStore.createStream(STREAM_TRANSFER, {
            eventType: EVENT_TRANSFER_INITIATED,
            payload: {
                sourceId,
                destinationId,
                amount
            } as TransferInitiatedPayload
        });

        return transferId;
    }

    confirmTransfer(transferId: number, accountId: number) {
        console.log(`[TransferController] handling command 'Confirm Transfer'`);

        const events = this.#eventStore.getEvents(STREAM_TRANSFER, transferId);
        const state = calculateTransferState(events);
        if (state.status !== 'initiated') {
            throw new Error(`Invalid state: transfer not in status 'initiated', ${transferId}:${STREAM_TRANSFER}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(STREAM_TRANSFER, transferId, revision, {
            eventType: EVENT_TRANSFER_CONFIRMED,
            payload: {
                accountId,
            } as TransferConfirmedPayload
        })
    }

    closeTransfer(transferId: number) {
        console.log(`[TransferController] handling command 'Close Transfer'`);

        const events = this.#eventStore.getEvents(STREAM_TRANSFER, transferId);
        const state = calculateTransferState(events);
        if (state.status !== 'confirmed') {
            throw new Error(`Invalid state: transfer not in status 'confirmed', ${transferId}:${STREAM_TRANSFER}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(STREAM_TRANSFER, transferId, revision, {
            eventType: EVENT_TRANSFER_CLOSED,
            payload: {} as TransferClosedPayload
        })
    }
}
