import {
    type Event,
    EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
    EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
    type EventProcessor,
    type IncomingTransferStartedPayload
} from './domain.ts';
import {TransferController} from './transfer-controller.ts';

export class AccountProcessor implements EventProcessor {
    #transferController: TransferController;

    constructor(transferController: TransferController) {
        this.#transferController = transferController;
    }

    process(event: Event) {
        console.log(`[AccountProcessor] processing event ${event.streamId}:${event.revision}:${event.eventType}`);

        switch (event.eventType) {
            case EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED:
                this.#processIncomingTransferStarted(event);
                break;
            case EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED:
                this.#processOutgoingTransferStarted(event);
                break;
        }
    }

    #processIncomingTransferStarted(event: Event) {
        const payload = event.payload as IncomingTransferStartedPayload;
        this.#transferController.confirmTransfer(payload.transferId, event.streamId);
    }

    #processOutgoingTransferStarted(event: Event) {
        const payload = event.payload as IncomingTransferStartedPayload;
        this.#transferController.confirmTransfer(payload.transferId, event.streamId);
    }
}



