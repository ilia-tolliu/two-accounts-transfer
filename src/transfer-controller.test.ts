import {beforeEach, describe, it, expect, assert} from 'vitest';
import {EventStore} from './event-store.ts';
import {EVENT_TRANSFER_CLOSED, EVENT_TRANSFER_CONFIRMED, EVENT_TRANSFER_INITIATED, STREAM_TRANSFER} from './domain.ts';
import {TransferController} from './transfer-controller.ts';

const eventStore = new EventStore();
const transferController = new TransferController(eventStore);

describe('Transfer controller', () => {
    beforeEach(() => {
        eventStore.reset();
    })

    it('Initiate transfer', () => {
        const transferId = transferController.initiateTransfer(123, 456, 10);

        const events = eventStore.getEvents(STREAM_TRANSFER, transferId);
        expect(events).toHaveLength(1);

        const event = events[0];
        expect(event.eventType).toEqual(EVENT_TRANSFER_INITIATED);
        expect(event.revision).toEqual(1);
        expect(event.payload).toEqual({
            amount: 10,
            sourceId: 123,
            destinationId: 456,
        });
    })

    it('Confirm transfer', () => {
        const transferId = eventStore.stubStream(STREAM_TRANSFER, [
            {
                eventType: EVENT_TRANSFER_INITIATED,
                payload: {
                    amount: 10,
                    sourceId: 123,
                    destinationId: 456,
                }
            }
        ]);

        transferController.confirmTransfer(transferId, 123);

        const events = eventStore.getEvents(STREAM_TRANSFER, transferId);
        expect(events).toHaveLength(2);

        const event = events[1];
        expect(event.eventType).toEqual(EVENT_TRANSFER_CONFIRMED);
        expect(event.revision).toEqual(2);
        expect(event.payload).toEqual({
            accountId: 123
        });
    });

    describe('Close transfer', () => {
        it('All parties confirmed', () => {
            const transferId = eventStore.stubStream(STREAM_TRANSFER, [
                {
                    eventType: EVENT_TRANSFER_INITIATED,
                    payload: {
                        amount: 10,
                        sourceId: 123,
                        destinationId: 456,
                    }
                },
                {
                    eventType: EVENT_TRANSFER_CONFIRMED,
                    payload: {
                        accountId: 123,
                    }
                },
                {
                    eventType: EVENT_TRANSFER_CONFIRMED,
                    payload: {
                        accountId: 456,
                    }
                }
            ]);

            transferController.closeTransfer(transferId);

            const events = eventStore.getEvents(STREAM_TRANSFER, transferId);
            expect(events).toHaveLength(4);

            const event = events[3];
            expect(event.eventType).toEqual(EVENT_TRANSFER_CLOSED);
            expect(event.revision).toEqual(4);
            expect(event.payload).toEqual({});
        });

        it('Confirmations incomplete', () => {
            const transferId = eventStore.stubStream(STREAM_TRANSFER, [
                {
                    eventType: EVENT_TRANSFER_INITIATED,
                    payload: {
                        amount: 10,
                        sourceId: 123,
                        destinationId: 456,
                    }
                },
                {
                    eventType: EVENT_TRANSFER_CONFIRMED,
                    payload: {
                        accountId: 456,
                    }
                }
            ]);

            assert.throws(
                () => transferController.closeTransfer(transferId),
                `Invalid state: transfer not in status 'confirmed', ${transferId}:${STREAM_TRANSFER}`
            );
        });
    });
})