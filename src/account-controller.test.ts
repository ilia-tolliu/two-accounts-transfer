import {beforeEach, describe, it, expect, assert} from 'vitest';
import {AccountController} from './account-controller.ts';
import {
    EVENT_ACCOUNT_FUNDS_DEPOSITED,
    EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
    EVENT_ACCOUNT_OPENED,
    EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
    EVENT_ACCOUNT_TRANSFER_COMPLETED,
    EVENT_TRANSFER_INITIATED,
    STREAM_ACCOUNT,
    STREAM_TRANSFER
} from './domain.ts';
import { EventStore } from './event-store.ts';

const eventStore = new EventStore();
const accountController = new AccountController(eventStore);

describe('Account controller', () => {
    beforeEach(() => {
        eventStore.reset();
    })

    it('Open account', () => {
        const accountId = accountController.openAccount('Test Owner');

        const events = eventStore.getEvents(STREAM_ACCOUNT, accountId);
        expect(events).toHaveLength(1);

        const event = events[0];
        expect(event.eventType).toEqual(EVENT_ACCOUNT_OPENED);
        expect(event.revision).toEqual(1);
        expect(event.payload).toEqual({owner: 'Test Owner'});
    })

    it('Deposit funds', () => {
        const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
            {
                eventType: EVENT_ACCOUNT_OPENED,
                payload: {'owner': 'Test Owner'}
            }
        ]);

        accountController.depositFunds(accountId, 123);

        const events = eventStore.getEvents(STREAM_ACCOUNT, accountId);
        expect(events).toHaveLength(2);

        const event = events[1];
        expect(event.eventType).toEqual(EVENT_ACCOUNT_FUNDS_DEPOSITED);
        expect(event.revision).toEqual(2);
        expect(event.payload).toEqual({amount: 123});
    })

    describe('Start outgoing transfer', () => {
        it('Happy case', () => {
            const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
                {
                    eventType: EVENT_ACCOUNT_OPENED,
                    payload: {owner: 'Test Owner'}
                },
                {
                    eventType: EVENT_ACCOUNT_FUNDS_DEPOSITED,
                    payload: {amount: 123}
                }
            ]);
            const transferId = eventStore.stubStream(STREAM_TRANSFER, [
                {
                    eventType: EVENT_TRANSFER_INITIATED,
                    payload: {
                        sourceId: accountId,
                        amount: 12,
                    }
                }
            ])

            accountController.startOutgoingTransfer(accountId, transferId, 12);

            const events = eventStore.getEvents(STREAM_ACCOUNT, accountId);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.eventType).toEqual(EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED);
            expect(event.revision).toEqual(3);
            expect(event.payload).toEqual({
                amount: 12,
                transferId
            });
        });

        it('Insufficient funds', () => {
            const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
                {
                    eventType: EVENT_ACCOUNT_OPENED,
                    payload: {owner: 'Test Owner'}
                },
                {
                    eventType: EVENT_ACCOUNT_FUNDS_DEPOSITED,
                    payload: {amount: 50}
                }
            ]);
            const transferId = eventStore.stubStream(STREAM_TRANSFER, [
                {
                    eventType: EVENT_TRANSFER_INITIATED,
                    payload: {
                        sourceId: accountId,
                        amount: 70,
                    }
                }
            ])

            assert.throws(
                () => accountController.startOutgoingTransfer(accountId, transferId, 70),
                `Invalid state: insufficient funds, ${accountId}:${STREAM_ACCOUNT}`
            );
        });
    });

    it('Start incoming transfer', () => {
        const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
            {
                eventType: EVENT_ACCOUNT_OPENED,
                payload: {owner: 'Test Owner'}
            }
        ]);
        const transferId = eventStore.stubStream(STREAM_TRANSFER, [
            {
                eventType: EVENT_TRANSFER_INITIATED,
                payload: {
                    sourceId: accountId,
                    amount: 12,
                }
            }
        ])

        accountController.startIncomingTransfer(accountId, transferId, 12);

        const events = eventStore.getEvents(STREAM_ACCOUNT, accountId);
        expect(events).toHaveLength(2);

        const event = events[1];
        expect(event.eventType).toEqual(EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED);
        expect(event.revision).toEqual(2);
        expect(event.payload).toEqual({
            amount: 12,
            transferId
        });
    })

    it('Complete transfer', () => {
        const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
            {
                eventType: EVENT_ACCOUNT_OPENED,
                payload: {owner: 'Test Owner'}
            },
            {
                eventType: EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
                payload: {transferId: 567, amount: 123}
            }
        ]);

        accountController.completeTransfer(accountId, 567);

        const events = eventStore.getEvents(STREAM_ACCOUNT, accountId);
        expect(events).toHaveLength(3);

        const event = events[2];
        expect(event.eventType).toEqual(EVENT_ACCOUNT_TRANSFER_COMPLETED);
        expect(event.revision).toEqual(3);
        expect(event.payload).toEqual({
            transferId: 567
        });
    })
})