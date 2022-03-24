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
export async function extractInternalEventFromTxReceipt<T extends typeof Event["arguments"] = Event>(
    tx: ContractTransaction,
    contract: Contract,
    eventName: string,
): Promise<T[]> {
    const receipt: ContractReceipt = await tx.wait();

    const events = receipt.events.filter(e => e.address === contract.address);
    return events.map(e => {
        const data = e.data;
        const topics = e.topics;
        return contract.interface.decodeEventLog(eventName, data, topics) as unknown as T;
    });
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
