import {
    type Event,
    EVENT_TRANSFER_CLOSED,
    EVENT_TRANSFER_CONFIRMED,
    EVENT_TRANSFER_INITIATED,
    type EventProcessor,
    STREAM_TRANSFER,
    type TransferInitiatedPayload
} from './domain.ts';
import {AccountController} from './account-controller.ts';
import {EventStore} from './event-store.ts';
import {TransferController} from './transfer-controller.ts';
import {calculateTransferState} from './transfer-state.ts';

export class TransferProcessor implements EventProcessor {
    #accountController: AccountController;
    #transferController: TransferController;
    #eventStore: EventStore;

    constructor(accountController: AccountController, transferController: TransferController, eventStore: EventStore) {
        this.#transferController = transferController;
        this.#accountController = accountController;
        this.#eventStore = eventStore;
    }

    process(event: Event) {
        console.log(`[TransferProcessor] processing event ${event.streamId}:${event.revision}:${event.eventType}`);

        switch (event.eventType) {
            case EVENT_TRANSFER_INITIATED:
                this.#processTransferInitiated(event);
                break;
            case EVENT_TRANSFER_CONFIRMED:
                this.#processTransferConfirmed(event);
                break;
            case EVENT_TRANSFER_CLOSED:
                this.#processTransferCompleted(event);
                break;
        }
    }

    #processTransferInitiated(event: Event) {
        const payload = event.payload as TransferInitiatedPayload;
        this.#accountController.startIncomingTransfer(payload.destinationId, event.streamId, payload.amount);
        this.#accountController.startOutgoingTransfer(payload.sourceId, event.streamId, payload.amount);
    }

    #processTransferConfirmed(event: Event) {
        const events = this.#eventStore.getEvents(STREAM_TRANSFER, event.streamId)
        const transferState = calculateTransferState(events);
        if (transferState.status === 'confirmed') {
            this.#transferController.closeTransfer(event.streamId);
        }
    }

    #processTransferCompleted(event: Event) {
        const events = this.#eventStore.getEvents(STREAM_TRANSFER, event.streamId)
        const transferState = calculateTransferState(events);
        for (const party of transferState.parties) {
            this.#accountController.completeTransfer(party.accountId, event.streamId);
        }
    }
}
