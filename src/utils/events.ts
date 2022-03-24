import { ContractTransaction, ContractReceipt, Event, Contract } from "ethers";

// Extracts named event from a transaction receipt
export async function extractEventFromTxReceipt<T extends Event = Event>(
    tx: ContractTransaction,
    eventName: string,
): Promise<T> {
    const receipt: ContractReceipt = await tx.wait();

    const event = receipt.events?.find((x: T) => {
        return x.event === eventName;
    });
    return event as T;
}

// Extracts internal event from a transaction receipt
export async function extractInternalIndexedEventFromTxReceipt<T extends typeof Event["arguments"] = Event>(
    tx: ContractTransaction,
    contract: Contract,
    eventName: string,
): Promise<T> {
    const receipt: ContractReceipt = await tx.wait();

    const events = receipt.events.filter(e => e.address === contract.address);
    return events
        .map(e => {
            const eventFragment = contract.interface.getEvent(eventName);
            const topicHash = contract.interface.getEventTopic(eventFragment);

            if (e.topics[0] === topicHash) {
                console.log(e.topics[0] === topicHash);
                return contract.interface.decodeEventLog(eventName, e.data, e.topics) as unknown as T;
            }
        })
        .filter(Boolean)[0];
}

// Extracts named events from a transaction receipt
export async function extractEventsFromTxReceipt<T extends Event = Event>(
    tx: ContractTransaction,
    eventName: string,
): Promise<T[]> {
    const receipt: ContractReceipt = await tx.wait();
    const events = receipt.events?.filter((x: T) => {
        return x.event == eventName;
    });
    return events as T[];
}
