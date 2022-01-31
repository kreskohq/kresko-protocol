import { ContractTransaction, ContractReceipt, Event } from "ethers";

// Extracts named event from a transaction receipt
export async function extractEventFromTxReceipt<T extends Event = Event>(
    tx: ContractTransaction,
    eventName: string,
): Promise<T> {
    let receipt: ContractReceipt = await tx.wait();
    const event = receipt.events?.find((x: T) => {
        return x.event === eventName;
    });
    return event as T;
}
// Extracts named events from a transaction receipt
export async function extractEventsFromTxReceipt<T extends Event = Event>(
    tx: ContractTransaction,
    eventName: string,
): Promise<T[]> {
    let receipt: ContractReceipt = await tx.wait();
    const events = receipt.events?.filter((x: T) => {
        return x.event == eventName;
    });
    return events as T[];
}
