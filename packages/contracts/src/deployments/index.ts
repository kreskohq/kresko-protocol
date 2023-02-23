import deploymentsJson from "./json/deployments.json";
import oracleJson from "./json/oracles.json"

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
    [chainId: string]: Export[];
  };
export type Oracles = {
    asset: string;
    assetType: string
    feed: string;
    marketstatus: string;
    pricefeed: string;
}[]

const deployments = deploymentsJson;

const oracles = oracleJson;
export type ContractNames = keyof typeof deploymentsJson["420"][0]["contracts"];

export type DeployedChains = keyof typeof deploymentsJson;

export { deployments, oracles };
