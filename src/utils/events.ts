import { ParamType } from "@ethersproject/abi";
import { concat } from "@ethersproject/bytes";
import { ContractTransaction, ContractReceipt, Event, Contract, BigNumber } from "ethers";

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
): Promise<T[]> {
    const receipt: ContractReceipt = await tx.wait();

    const events = receipt.events.filter(e => e.address === contract.address);
    return events.map(e => {
        const eventFragment = contract.interface.getEvent(eventName);
        const indexed: Array<ParamType> = [];
        const nonIndexed: Array<ParamType> = [];
        const dynamic: Array<boolean> = [];

        eventFragment.inputs.forEach(param => {
            if (param.indexed) {
                if (
                    param.type === "string" ||
                    param.type === "bytes" ||
                    param.baseType === "tuple" ||
                    param.baseType === "array"
                ) {
                    indexed.push(ParamType.fromObject({ type: "bytes32", name: param.name }));
                    dynamic.push(true);
                } else {
                    indexed.push(param);
                    dynamic.push(false);
                }
            } else {
                nonIndexed.push(param);
                dynamic.push(false);
            }
        });

        const topics = e.topics;
        const resultIndexed = topics != null ? contract.interface._abiCoder.decode(indexed, concat(topics)) : null;
        return resultIndexed as unknown as T;
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
