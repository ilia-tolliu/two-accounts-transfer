import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EventStore} from './event-store.ts';
import {EVENT_TRANSFER_CLOSED, EVENT_TRANSFER_CONFIRMED, EVENT_TRANSFER_INITIATED, STREAM_TRANSFER} from './domain.ts';
import {AccountController} from './account-controller.ts';
import {TransferController} from './transfer-controller.ts';
import {TransferProcessor} from './transfer-processor.ts';
import {afterTick} from './test-util.ts';

const eventStore = new EventStore();
const accountController = new AccountController(eventStore);
const transferController = new TransferController(eventStore);
const transferProcessor = new TransferProcessor(accountController, transferController, eventStore);

const spy_startIncomingTransfer = vi.spyOn(accountController, 'startIncomingTransfer')
    .mockImplementation(() => {});

const spy_startOutgoingTransfer = vi.spyOn(accountController, 'startOutgoingTransfer')
    .mockImplementation(() => {});

const spy_completeTransfer = vi.spyOn(accountController, 'completeTransfer')
    .mockImplementation(() => {});

const spy_closeTransfer = vi.spyOn(transferController, 'closeTransfer')
    .mockImplementation(() => {});

describe('Transfer processor', () => {
    beforeEach(() => {
        eventStore.reset();
        eventStore.subscribe(STREAM_TRANSFER, transferProcessor);
        vi.clearAllMocks();
    })

    it('Transfer initiated', async () => {
        const transferId = eventStore.stubStream(STREAM_TRANSFER, [
            {
                eventType: EVENT_TRANSFER_INITIATED,
                payload: {
                    amount: 10,
                    sourceId: 123,
                    destinationId: 456,
                }
            }
        ], true);

        await afterTick();

        expect(spy_startIncomingTransfer).toBeCalledWith(456, transferId, 10);
        expect(spy_startOutgoingTransfer).toBeCalledWith(123, transferId, 10);
    })

    describe('Transfer confirmed', () => {
        it('when all confirmed',  async () => {
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
            ], true);

            await afterTick();

            expect(spy_closeTransfer).toBeCalledWith(transferId);
        })

        it('when all not all confirmed',  async () => {
            eventStore.stubStream(STREAM_TRANSFER, [
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
                }
            ], true);

            await afterTick();

            expect(spy_closeTransfer).not.toBeCalled();
        })
    })

    it('Transfer closed', async () => {
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
            },
            {
                eventType: EVENT_TRANSFER_CLOSED,
                payload: {}
            }
        ], true);

        await afterTick();

        expect(spy_completeTransfer).toBeCalledWith(123, transferId);
        expect(spy_completeTransfer).toBeCalledWith(456, transferId);
    })
})