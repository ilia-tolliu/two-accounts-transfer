import {
    type Event,
    EVENT_ACCOUNT_FUNDS_DEPOSITED,
    EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
    EVENT_ACCOUNT_OPENED,
    EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
    EVENT_ACCOUNT_TRANSFER_COMPLETED,
    type FundsDepositedPayload,
    type IncomingTransferStartedPayload,
    type OutgoingTransferStartedPayload,
    STREAM_ACCOUNT,
    type TransferCompletedPayload
} from './domain.ts';


interface AccountState {
    availableFunds: number
    pendingTransfers: PendingTransfer[],
    status: AccountStatus
}

interface PendingTransfer {
    transferId: number,
    amount: number,
    transferType: TransferType
}

type AccountStatus = 'empty' | 'open' | 'closed';
type TransferType = 'incoming' | 'outgoing';

export function calculateAccountState(events: Event[]): AccountState {
    let state: AccountState = {
        status: 'empty',
        pendingTransfers: [],
        availableFunds: 0
    }

    for (const event of events) {
        switch (event.eventType) {
            case EVENT_ACCOUNT_OPENED: {
                applyAccountOpened(state, event);
                break;
            }
            case EVENT_ACCOUNT_FUNDS_DEPOSITED:
                applyFundsDeposited(state, event);
                break;
            case EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED:
                applyIncomingTransferStarted(state, event);
                break;
            case EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED:
                applyOutgoingTransferStarted(state, event);
                break;
            case EVENT_ACCOUNT_TRANSFER_COMPLETED:
                applyTransferCompleted(state, event);
                break;
            default:
                throw new Error(`Unknown event ${STREAM_ACCOUNT}:${event.eventType}`);
        }
    }

    return state;
}

function applyAccountOpened(state: AccountState, _event: Event) {
    state.status = 'open';
}

function applyFundsDeposited(state: AccountState, event: Event) {
    const payload = event.payload as FundsDepositedPayload;
    state.availableFunds += payload.amount;
}

function applyIncomingTransferStarted(state: AccountState, event: Event) {
    const payload = event.payload as IncomingTransferStartedPayload;
    state.pendingTransfers.push({
        transferId: payload.transferId,
        amount: payload.amount,
        transferType: 'incoming'
    });
}

function applyOutgoingTransferStarted(state: AccountState, event: Event) {
    const payload = event.payload as OutgoingTransferStartedPayload;
    state.pendingTransfers.push({
        transferId: payload.transferId,
        amount: payload.amount,
        transferType: 'outgoing'
    })
    state.availableFunds -= payload.amount;
}

function applyTransferCompleted(state: AccountState, event: Event) {
    const payload = event.payload as TransferCompletedPayload;
    const pendingTransfer = state.pendingTransfers.find(pt => pt.transferId === payload.transferId)!;
    state.pendingTransfers = state.pendingTransfers.filter(pt => pt.transferId !== payload.transferId);
    if (pendingTransfer.transferType === 'incoming') {
        state.availableFunds += pendingTransfer.amount;
    }
}