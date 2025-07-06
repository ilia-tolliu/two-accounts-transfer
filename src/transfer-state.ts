import {
    type Event,
    EVENT_TRANSFER_CLOSED,
    EVENT_TRANSFER_CONFIRMED,
    EVENT_TRANSFER_INITIATED,
    STREAM_TRANSFER,
    type TransferConfirmedPayload,
    type TransferInitiatedPayload
} from './domain.ts';


interface TransferState {
    parties: TransferParty[]
    amount: number
    status: TransferStatus
}

interface TransferParty {
    accountId: number;
    partyType: PartyType;
    isConfirmed: boolean;
}

type TransferStatus = 'empty' | 'initiated' | 'confirmed' | 'closed' | 'cancelled';
type PartyType = 'source' | 'destination';

export function calculateTransferState(events: Event[]): TransferState {
    let state: TransferState = {
        status: 'empty',
        amount: 0,
        parties: [],
    }

    for (const event of events) {
        switch (event.eventType) {
            case EVENT_TRANSFER_INITIATED: {
                applyTransferInitiated(state, event);
                break;
            }
            case EVENT_TRANSFER_CONFIRMED:
                applyTransferConfirmed(state, event);
                break;
            case EVENT_TRANSFER_CLOSED:
                applyTransferClosed(state, event);
                break;
            default:
                throw new Error(`Unknown event ${STREAM_TRANSFER}:${event.eventType}`);
        }
    }

    return state;
}

function applyTransferInitiated(state: TransferState, event: Event) {
    const payload = event.payload as TransferInitiatedPayload;
    state.status = 'initiated';
    state.amount = payload.amount;
    state.parties = [
        {
            accountId: payload.sourceId,
            partyType: 'source',
            isConfirmed: false,
        },
        {
            accountId: payload.destinationId,
            partyType: 'destination',
            isConfirmed: false,
        }
    ];
}

function applyTransferConfirmed(state: TransferState, event: Event) {
    const payload = event.payload as TransferConfirmedPayload;
    const partyIndex = state.parties.findIndex(p => p.accountId === payload.accountId);
    state.parties[partyIndex].isConfirmed = true;
    if (state.parties.every(party => party.isConfirmed)) {
        state.status = 'confirmed';
    }
}

function applyTransferClosed(state: TransferState, _event: Event) {
    state.status = 'closed';
}