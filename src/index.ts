import {EventStore} from './event-store.ts';
import {STREAM_ACCOUNT, STREAM_TRANSFER} from './domain.ts';
import {TransferController} from './transfer-controller.ts';
import {AccountProcessor} from './account-processor.ts';
import {TransferProcessor} from './transfer-processor.ts';
import {AccountController} from './account-controller.ts';
import {calculateAccountState} from './account-state.ts';

const eventStore = new EventStore();
const accountController = new AccountController(eventStore);
const transferController = new TransferController(eventStore);
const accountProcessor = new AccountProcessor(transferController);
const transferProcessor = new TransferProcessor(accountController, transferController, eventStore);

eventStore.subscribe(STREAM_ACCOUNT, accountProcessor);
eventStore.subscribe(STREAM_TRANSFER, transferProcessor);

const account1 = accountController.openAccount('User 1');
accountController.depositFunds(account1, 100);

const account2 = accountController.openAccount('User 2');

transferController.initiateTransfer(account1, account2, 60);

setTimeout(() => logFinalState(), 100);

function logFinalState() {
    eventStore.dump();

    const account1Events = eventStore.getEvents(STREAM_ACCOUNT, account1);
    const account1State = calculateAccountState(account1Events);
    console.log('Account 1 state:', JSON.stringify(account1State, undefined, 2));
    console.log('');

    const account2Events = eventStore.getEvents(STREAM_ACCOUNT, account2);
    const account2State = calculateAccountState(account2Events);
    console.log('Account 2 state:', JSON.stringify(account2State, undefined, 2));
    console.log('');
}