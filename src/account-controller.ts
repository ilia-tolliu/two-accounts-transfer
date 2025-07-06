import {EventStore} from './event-store.ts';
import {
    EVENT_ACCOUNT_FUNDS_DEPOSITED,
    EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
    EVENT_ACCOUNT_OPENED,
    EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
    EVENT_ACCOUNT_TRANSFER_COMPLETED,
    type IncomingTransferStartedPayload,
    type OutgoingTransferStartedPayload,
    STREAM_ACCOUNT,
    type TransferCompletedPayload
} from './domain.ts';
import {nextRevision} from './util.ts';
import {calculateAccountState} from './account-state.ts';

export class AccountController {
    #eventStore: EventStore;

    constructor(eventStore: EventStore) {
        this.#eventStore = eventStore;
    }

    openAccount(owner: string) {
        console.log(`[AccountController] handling command 'Open Account'`);

        const streamId = this.#eventStore.createStream(STREAM_ACCOUNT, {
            eventType: EVENT_ACCOUNT_OPENED,
            payload: {
                owner
            }
        });

        return streamId;
    }

    depositFunds(accountId: number, amount: number) {
        console.log(`[AccountController] handling command 'Deposit Funds'`);

        const events = this.#eventStore.getEvents(STREAM_ACCOUNT, accountId);
        const state = calculateAccountState(events);
        if (state.status !== 'open') {
            throw new Error(`Invalid state: account not in status 'open', ${accountId}:${STREAM_ACCOUNT}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(STREAM_ACCOUNT, accountId, revision, {
            eventType: EVENT_ACCOUNT_FUNDS_DEPOSITED,
            payload: {
                amount
            }
        })
    }

    startIncomingTransfer(accountId: number, transferId: number, amount: number) {
        console.log(`[AccountController] handling command 'Start Incoming Transfer'`);

        const events = this.#eventStore.getEvents(STREAM_ACCOUNT, accountId);
        const state = calculateAccountState(events);
        if (state.status !== 'open') {
            throw new Error(`Invalid state: account not in status 'open', ${accountId}:${STREAM_ACCOUNT}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(
            STREAM_ACCOUNT,
            accountId,
            revision,
            {
                eventType: EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
                payload: {
                    transferId,
                    amount,
                } as IncomingTransferStartedPayload,
            }
        );
    }

    startOutgoingTransfer(accountId: number, transferId: number, amount: number) {
        console.log(`[AccountController] handling command 'Start Outgoing Transfer'`);

        const events = this.#eventStore.getEvents(STREAM_ACCOUNT, accountId);
        const state = calculateAccountState(events);
        if (state.status !== 'open') {
            throw new Error(`Invalid state: account not in status 'open', ${accountId}:${STREAM_ACCOUNT}`);
        }
        if (state.availableFunds < amount) {
            throw new Error(`Invalid state: insufficient funds, ${accountId}:${STREAM_ACCOUNT}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(
            STREAM_ACCOUNT,
            accountId,
            revision,
            {
                eventType: EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
                payload: {
                    transferId,
                    amount,
                } as OutgoingTransferStartedPayload,
            }
        );
    }

    completeTransfer(accountId: number, transferId: number) {
        console.log(`[AccountController] handling command 'Complete Transfer'`);

        const events = this.#eventStore.getEvents(STREAM_ACCOUNT, accountId);
        const state = calculateAccountState(events);
        if (state.status !== 'open') {
            throw new Error(`Invalid state: account not in status 'open', ${accountId}:${STREAM_ACCOUNT}`);
        }
        if (state.pendingTransfers.findIndex(pt => pt.transferId === transferId) < 0) {
            throw new Error(`Invalid state: account doesn't expect transferId ${transferId}, ${accountId}:${STREAM_ACCOUNT}`);
        }

        const revision = nextRevision(events);

        this.#eventStore.appendEvent(
            STREAM_ACCOUNT,
            accountId,
            revision,
            {
                eventType: EVENT_ACCOUNT_TRANSFER_COMPLETED,
                payload: {
                    transferId,
                } as TransferCompletedPayload,
            }
        );
    }
}
