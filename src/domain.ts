export const STREAM_TRANSFER = 'transfer';
export const EVENT_TRANSFER_INITIATED = 'transfer-initiated';
export const EVENT_TRANSFER_CONFIRMED = 'transfer-confirmed';
export const EVENT_TRANSFER_CLOSED = 'transfer-closed';

export const STREAM_ACCOUNT = 'account';
export const EVENT_ACCOUNT_OPENED = 'account-opened';
export const EVENT_ACCOUNT_FUNDS_DEPOSITED = 'account-funds-deposited';
export const EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED = 'account-incoming-transfer-started';
export const EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED = 'account-outgoing-transfer-started';
export const EVENT_ACCOUNT_TRANSFER_COMPLETED = 'account-transfer-completed';

export interface NewEvent {
    eventType: string;
    payload: unknown;
}

export interface Event {
    streamId: number;
    revision: number;
    eventType: string;
    payload: unknown;
}

export interface EventProcessor {
    process: (event: Event) => void;
}

export interface Stream {
    streamType: string;
    streamId: number;
}

export interface FundsDepositedPayload {
    amount: number
}

export interface IncomingTransferStartedPayload {
    transferId: number;
    amount: number;
}

export interface OutgoingTransferStartedPayload {
    transferId: number;
    amount: number;
}

export interface TransferCompletedPayload {
    transferId: number;
}

export interface TransferInitiatedPayload {
    sourceId: number;
    destinationId: number;
    amount: number;
}

export interface TransferConfirmedPayload {
    accountId: number;
    amount: number;
}

export interface TransferClosedPayload {
}
