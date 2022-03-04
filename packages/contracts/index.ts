import * as deploymentsJson from "./deployments/deployments.json";

export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
}

export interface Export {
    chainId: string;
    name: string;
    contracts: { [name: string]: ContractExport };
}

export type MultiExport = {
    [chainId: string]: { [name: string]: Export };
};

const deployments: MultiExport = deploymentsJson;

export * from "./types";
export { deployments };
export default deployments;
