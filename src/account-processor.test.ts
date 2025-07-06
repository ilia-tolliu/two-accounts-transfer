import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EventStore} from './event-store.ts';
import {
    EVENT_ACCOUNT_FUNDS_DEPOSITED,
    EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
    EVENT_ACCOUNT_OPENED,
    EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
    STREAM_ACCOUNT
} from './domain.ts';
import {TransferController} from './transfer-controller.ts';
import {afterTick} from './test-util.ts';
import {AccountProcessor} from './account-processor.ts';

const eventStore = new EventStore();
const transferController = new TransferController(eventStore);
const accountProcessor = new AccountProcessor(transferController);

const spy_confirmTransfer = vi.spyOn(transferController, 'confirmTransfer')
    .mockImplementation(() => {});

describe('Account processor', () => {
    beforeEach(() => {
        eventStore.reset();
        eventStore.subscribe(STREAM_ACCOUNT, accountProcessor);
        vi.clearAllMocks();
    })

    it('Outgoing transfer started', async () => {
        const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
            {
                eventType: EVENT_ACCOUNT_OPENED,
                payload: {owner: 'Test Owner'}
            },
            {
                eventType: EVENT_ACCOUNT_FUNDS_DEPOSITED,
                payload: {amount: 123}
            },
            {
                eventType: EVENT_ACCOUNT_OUTGOING_TRANSFER_STARTED,
                payload: {
                    transferId: 123,
                    amount: 10
                }
            }
        ], true);

        await afterTick();

        expect(spy_confirmTransfer).toBeCalledWith(123, accountId);
    })

    it('Incoming transfer started', async () => {
        const accountId = eventStore.stubStream(STREAM_ACCOUNT, [
            {
                eventType: EVENT_ACCOUNT_OPENED,
                payload: {owner: 'Test Owner'}
            },
            {
                eventType: EVENT_ACCOUNT_INCOMING_TRANSFER_STARTED,
                payload: {
                    transferId: 123,
                    amount: 10
                }
            }
        ], true);

        await afterTick();

        expect(spy_confirmTransfer).toBeCalledWith(123, accountId);
    })
})