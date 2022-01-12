import { ContractTransaction, ContractReceipt } from "ethers";

// Extracts named events from a transaction receipt
export async function extractEventFromTxReceipt(tx: ContractTransaction, eventName: string) {
    let receipt: ContractReceipt = await tx.wait();
    return receipt.events?.filter((x: any) => {
        return x.event == eventName;
    });
}
